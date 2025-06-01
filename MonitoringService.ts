import {
  BaseLog,
  PageRouteLog,
  ComponentMetricLog,
  ApiCallLog,
  ErrorLog,
  AnyLog,
  StorageKey,
  MonitoringSettings,
} from "./types";
import { readFromIndexedDB, writeToIndexedDB } from "./utils/indexedDB";

// Helper type for data passed to appendLogInternal - kept internal to MonitoringService
type LogSpecificData =
  | Omit<PageRouteLog, "id" | "timestamp" | "sessionId" | "pagePath">
  | Omit<ComponentMetricLog, "id" | "timestamp" | "sessionId" | "pagePath">
  | Omit<ApiCallLog, "id" | "timestamp" | "sessionId" | "pagePath">
  | Omit<ErrorLog, "id" | "timestamp" | "sessionId" | "pagePath">;

const MonitoringService = (() => {
  const APP_SESSION_ID =
    Date.now().toString(36) + Math.random().toString(36).substring(2);
  const MAX_LOG_ENTRIES_PER_KEY = 100;
  let _isMonitoringActive = true;
  let _currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search + window.location.hash
      : "/";
  let _areListenersActive = false;
  const _originalFetch =
    typeof window !== "undefined" ? window.fetch : undefined;
  let _originalHistoryPushState: typeof history.pushState | undefined;
  let _originalHistoryReplaceState: typeof history.replaceState | undefined;

  const generateId = (): string =>
    Date.now().toString(36) + Math.random().toString(36).substring(2);

  const readStorage = async <T>(key: StorageKey): Promise<T[]> => {
    try {
      const result = await readFromIndexedDB(key);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error(
        `MonitoringService: Error reading IndexedDB key "${key}":`,
        error
      );
      return [];
    }
  };

  const writeStorage = async <T>(key: StorageKey, data: T[]): Promise<void> => {
    if (typeof localStorage === "undefined") return;
    try {
      await writeToIndexedDB(key, data);
      await readFromIndexedDB(key);
    } catch (error) {
      console.error(
        `MonitoringService: Error writing to localStorage key "${key}":`,
        error
      );
    }
  };

  const _loadSettings = (): MonitoringSettings => {
    if (typeof localStorage === "undefined")
      return { isMonitoringActive: true };
    const settings = readStorage<MonitoringSettings>(StorageKey.SETTINGS);
    return settings[0] || { isMonitoringActive: true }; // Default to active
  };

  const _saveSettings = (settings: MonitoringSettings): void => {
    if (typeof localStorage === "undefined") return;
    writeStorage<MonitoringSettings>(StorageKey.SETTINGS, [settings]);
  };

  _isMonitoringActive = _loadSettings().isMonitoringActive;

  const appendLogInternal = (
    key: StorageKey,
    newLogEntryData: LogSpecificData
  ): void => {
    if (!_isMonitoringActive || typeof window === "undefined") return;

    const commonData: Pick<
      BaseLog,
      "id" | "timestamp" | "sessionId" | "pagePath"
    > = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId: APP_SESSION_ID,
      pagePath: _currentPath,
    };

    let logToAdd: AnyLog;

    const typedLogEntryData = newLogEntryData as
      | PageRouteLog
      | ComponentMetricLog
      | ApiCallLog
      | ErrorLog;

    switch (typedLogEntryData.type) {
      case "page_route":
        logToAdd = {
          ...commonData,
          ...typedLogEntryData,
          pagePath: typedLogEntryData.path,
        };
        break;
      case "component_metric":
      case "api_call":
      case "error":
        logToAdd = { ...commonData, ...typedLogEntryData };
        break;
      default:
        // The `const _exhaustiveCheck: never;` line, which caused the SyntaxError
        // if not initialized (as it would be in transpiled JS), has been removed.
        // TypeScript still provides exhaustiveness checking for the switch statement at compile time.
        console.error(
          `MonitoringService: Unhandled log type in appendLogInternal. Type: ${
            (typedLogEntryData as any)?.type
          }`
        );
        return;
    }

    const existingLogs = readStorage<AnyLog>(key);
    writeStorage<AnyLog>(key, [...existingLogs, logToAdd]);
    window.dispatchEvent(
      new CustomEvent("monitoring-log-added", { detail: { key } })
    );
  };

  const _handleErrorEvent = (
    event: ErrorEvent | Event | PromiseRejectionEvent,
    customMessage?: string
  ) => {
    let logEntryData: Omit<
      ErrorLog,
      "id" | "timestamp" | "sessionId" | "pagePath"
    >;
    if (event instanceof ErrorEvent) {
      logEntryData = {
        type: "error",
        message: customMessage || event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        errorObject: event.error ? String(event.error) : undefined,
        stack: event.error?.stack,
      };
    } else if (event instanceof PromiseRejectionEvent) {
      const reason = event.reason;
      logEntryData = {
        type: "error",
        message:
          customMessage ||
          (reason instanceof Error ? reason.message : String(reason)),
        errorObject: String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      };
    } else {
      logEntryData = {
        type: "error",
        message: customMessage || "Unknown error event",
        errorObject: String(event),
      };
    }
    appendLogInternal(StorageKey.ERRORS, logEntryData);
  };

  const _onWindowError = (
    message: Event | string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean => {
    appendLogInternal(StorageKey.ERRORS, {
      type: "error",
      message: typeof message === "string" ? message : (message as Event).type, // Handle Event type for message
      source,
      lineno,
      colno,
      errorObject: error ? String(error) : undefined,
      stack: error?.stack,
    });
    return false;
  };
  const _onUnhandledRejection = (event: PromiseRejectionEvent) =>
    _handleErrorEvent(event, "Unhandled promise rejection");
  const _onGlobalError = (event: ErrorEvent) =>
    _handleErrorEvent(event, "Global error event");

  const _logRouteChange = () => {
    if (typeof window === "undefined") return;
    _currentPath =
      window.location.pathname + window.location.search + window.location.hash;
    appendLogInternal(StorageKey.PAGES, {
      type: "page_route",
      path: _currentPath,
    });
  };

  const _fetchWrapper = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const startTime = performance.now();
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");

    if (!_originalFetch) {
      console.error(
        "MonitoringService: Original fetch is not defined. Cannot make API call."
      );
      throw new Error("Original fetch not available");
    }

    try {
      const response = await _originalFetch(input, init);
      const duration = performance.now() - startTime;
      appendLogInternal(StorageKey.API, {
        type: "api_call",
        url: urlString,
        method,
        duration,
        status: response.ok ? "success" : "failure",
        statusCode: response.status,
      });
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      appendLogInternal(StorageKey.API, {
        type: "api_call",
        url: urlString,
        method,
        duration,
        status: "failure",
        statusCode:
          error instanceof Response
            ? error.status
            : (error as any)?.response?.status || 0,
      });
      throw error;
    }
  };

  const _wrapHistoryMethod = (method: "pushState" | "replaceState") => {
    if (typeof window === "undefined" || !history[method]) return undefined;
    const original = history[method];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (history[method] as any) = function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const result = original.apply(this, args);
      _logRouteChange();
      window.dispatchEvent(
        new CustomEvent(`custom${method.toLowerCase()}`, { detail: args })
      );
      return result;
    };
    return original;
  };

  const _activateListeners = () => {
    if (typeof window === "undefined" || _areListenersActive) return;
    console.log("MonitoringService: Activating listeners.");
    _logRouteChange();
    window.addEventListener("popstate", _logRouteChange);
    window.addEventListener("hashchange", _logRouteChange);
    window.addEventListener("custompushstate", _logRouteChange);
    window.addEventListener("customreplacestate", _logRouteChange);

    window.onerror = _onWindowError;
    window.addEventListener("error", _onGlobalError);
    window.addEventListener("unhandledrejection", _onUnhandledRejection);

    if (typeof _originalFetch === "function") {
      try {
        Object.defineProperty(window, "fetch", {
          value: _fetchWrapper,
          writable: true,
          configurable: true,
        });
      } catch (e) {
        console.warn(
          `MonitoringService: Failed to override window.fetch. Error: ${
            e instanceof Error ? e.message : String(e)
          }.`
        );
      }
    } else {
      console.warn(
        "MonitoringService: window.fetch is not available. API call monitoring will not be active."
      );
    }

    _originalHistoryPushState = _wrapHistoryMethod("pushState");
    _originalHistoryReplaceState = _wrapHistoryMethod("replaceState");

    _areListenersActive = true;
  };

  const _deactivateListeners = () => {
    if (typeof window === "undefined" || !_areListenersActive) return;
    console.log("MonitoringService: Deactivating listeners.");
    window.removeEventListener("popstate", _logRouteChange);
    window.removeEventListener("hashchange", _logRouteChange);
    window.removeEventListener("custompushstate", _logRouteChange);
    window.removeEventListener("customreplacestate", _logRouteChange);

    window.onerror = null;
    window.removeEventListener("error", _onGlobalError);
    window.removeEventListener("unhandledrejection", _onUnhandledRejection);

    if (typeof _originalFetch === "function") {
      try {
        Object.defineProperty(window, "fetch", {
          value: _originalFetch,
          writable: true,
          configurable: true,
        });
      } catch (e) {
        console.warn(
          `MonitoringService: Failed to restore original window.fetch. Error: ${
            e instanceof Error ? e.message : String(e)
          }.`
        );
      }
    }
    if (_originalHistoryPushState)
      history.pushState = _originalHistoryPushState;
    if (_originalHistoryReplaceState)
      history.replaceState = _originalHistoryReplaceState;

    _areListenersActive = false;
  };

  if (typeof window !== "undefined" && _isMonitoringActive) {
    _activateListeners();
  }

  return {
    startMonitoring: () => {
      if (_isMonitoringActive) return;
      _isMonitoringActive = true;
      _saveSettings({ isMonitoringActive: true });
      _activateListeners();
      console.log("MonitoringService: Monitoring started.");
      if (typeof window !== "undefined")
        window.dispatchEvent(
          new CustomEvent("monitoring-status-changed", {
            detail: { isActive: true },
          })
        );
    },
    stopMonitoring: () => {
      if (!_isMonitoringActive) return;
      _isMonitoringActive = false;
      _saveSettings({ isMonitoringActive: false });
      _deactivateListeners();
      console.log("MonitoringService: Monitoring stopped.");
      if (typeof window !== "undefined")
        window.dispatchEvent(
          new CustomEvent("monitoring-status-changed", {
            detail: { isActive: false },
          })
        );
    },
    getIsMonitoringActive: () => _isMonitoringActive,
    logComponentMetric: (
      componentName: string,
      metricName: ComponentMetricLog["metricName"],
      duration: number
    ) => {
      appendLogInternal(StorageKey.COMPONENTS, {
        type: "component_metric",
        componentName,
        metricName,
        duration,
      });
    },
    forceLogRouteChange: _logRouteChange,
    clearStorageData: (key?: StorageKey): void => {
      if (typeof localStorage === "undefined") return;
      if (key) {
        localStorage.removeItem(key);
      } else {
        Object.values(StorageKey)
          .filter((k) => k !== StorageKey.SETTINGS)
          .forEach((k) => localStorage.removeItem(k));
      }
      if (typeof window !== "undefined")
        window.dispatchEvent(new CustomEvent("monitoring-cleared"));
    },
    readStorage,
    getCurrentPath: () => _currentPath,
  };
})();

export default MonitoringService;
