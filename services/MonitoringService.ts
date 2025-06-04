import { addLogEntryToDB, openMonitoringDB } from "../utils/indexedDB";
import {
  LogEntry,
  ApiCallLogData,
  PageViewLogData,
  ComponentRenderLogData,
  ErrorLogData,
  LogEntryType,
  ComponentEventType,
  CustomEventLogData,
} from "../types";

class MonitoringServiceImpl {
  private dbPromise: Promise<IDBDatabase>;
  public isRunning: boolean = true;
  private originalFetch: typeof window.fetch;
  private originalXHROpen?: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend?: typeof XMLHttpRequest.prototype.send;
  private originalPushState: typeof window.history.pushState;
  private originalReplaceState: typeof window.history.replaceState;
  private currentPath: string =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search + window.location.hash
      : "";

  constructor() {
    this.dbPromise = openMonitoringDB();
    this.originalFetch =
      typeof window !== "undefined"
        ? window.fetch.bind(window)
        : async () =>
            new Response(null, {
              status: 500,
              statusText: "Fetch unavailable",
            });
    this.originalPushState =
      typeof window !== "undefined"
        ? window.history.pushState.bind(window.history)
        : () => {};
    this.originalReplaceState =
      typeof window !== "undefined"
        ? window.history.replaceState.bind(window.history)
        : () => {};

    if (typeof window !== "undefined") {
      this.initializeGlobalErrorHandlers();
      this.initializeFetchOverride();
      this.initializeXMLHttpRequestOverride();
      this.initializeRouteTracking();
      // Initial page view
      this.logPageView(this.currentPath);
      console.info("Monitoring Service initialized and running.");
    } else {
      console.warn(
        "Monitoring Service: Window object not found. Not initializing listeners."
      );
    }
  }
  private stripUrlParams(url: string): string {
    try {
      return new URL(url, window.location.origin).pathname;
    } catch {
      return url.split("?")[0].split("#")[0];
    }
  }
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async addLogInternal(type: LogEntryType, data: any): Promise<void> {
    if (!this.isRunning || typeof window === "undefined") return;

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      type: type,
      data: data,
    } as LogEntry;

    try {
      const db = await this.dbPromise;
      await addLogEntryToDB(db, logEntry);
      window.dispatchEvent(new CustomEvent("monitoring_new_log"));
    } catch (error) {
      console.error("MonitoringService: Failed to add log", error, logEntry);
    }
  }
  public logPageView(path: string, referrer?: string): void {
    const cleanPath = this.stripUrlParams(path);
    const data: PageViewLogData = { path: cleanPath, referrer };
    this.addLogInternal(LogEntryType.PAGE_VIEW, data);
  }

  public logApiCall(data: ApiCallLogData): void {
    this.addLogInternal(LogEntryType.API_CALL, data);
  }

  public logComponentRender(data: ComponentRenderLogData): void {
    this.addLogInternal(LogEntryType.COMPONENT_RENDER, data);
  }

  public logError(data: ErrorLogData): void {
    this.addLogInternal(LogEntryType.ERROR, data);
  }

  public logCustomEvent(
    eventName: string,
    details?: Record<string, any>
  ): void {
    const data: CustomEventLogData = { eventName, details };
    this.addLogInternal(LogEntryType.CUSTOM_EVENT, data);
  }

  private initializeGlobalErrorHandlers(): void {
    window.addEventListener("error", (event: ErrorEvent) => {
      if (!this.isRunning) return;
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        source: `global_error:${event.filename}:${event.lineno}:${event.colno}`,
      });
    });

    window.addEventListener(
      "unhandledrejection",
      (event: PromiseRejectionEvent) => {
        if (!this.isRunning) return;
        let message = "Unhandled promise rejection";
        let stack;
        if (event.reason instanceof Error) {
          message = event.reason.message;
          stack = event.reason.stack;
        } else if (typeof event.reason === "string") {
          message = event.reason;
        } else {
          try {
            message = JSON.stringify(event.reason);
          } catch {
            message =
              "Unhandled promise rejection with non-serializable reason";
          }
        }
        this.logError({
          message,
          stack,
          source: "unhandled_rejection",
        });
      }
    );
  }

  private initializeFetchOverride(): void {
    const newFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      if (!this.isRunning) return this.originalFetch(input, init);

      const startTime = performance.now();

      let apiUrl: string;
      let apiMethod: string;

      if (typeof input === "string") {
        apiUrl = input;
        apiMethod = init?.method?.toUpperCase() || "GET";
      } else if (input instanceof URL) {
        apiUrl = input.href;
        apiMethod = init?.method?.toUpperCase() || "GET";
      } else {
        // input is Request
        apiUrl = this.stripUrlParams(input.url);

        apiMethod =
          init?.method?.toUpperCase() || input.method?.toUpperCase() || "GET";
      }

      let requestBody: string | undefined;
      if (init?.body) {
        if (typeof init.body === "string") {
          requestBody = init.body;
        } else if (init.body instanceof URLSearchParams) {
          requestBody = init.body.toString();
        } else if (init.body instanceof FormData) {
          requestBody = "[FormData body]";
        } else if (
          init.body instanceof Blob ||
          init.body instanceof ArrayBuffer
        ) {
          requestBody = `[Binary body: ${init.body.constructor.name}]`;
        } else {
          requestBody = `[Non-string body: ${Object.prototype.toString.call(
            init.body
          )}]`;
        }
      } else if (
        input instanceof Request &&
        input.body !== null &&
        !input.bodyUsed
      ) {
        try {
          const clonedRequest = input.clone();
          const contentType = clonedRequest.headers.get("Content-Type");
          if (
            contentType &&
            (contentType.includes("application/json") ||
              contentType.includes("text/"))
          ) {
            requestBody = await clonedRequest.text();
          } else if (clonedRequest.body) {
            requestBody = `[Request body of type: ${contentType || "unknown"}]`;
          } else {
            requestBody = "[Empty or unreadable request body]";
          }
        } catch (e) {
          requestBody = `[Error reading request body: ${(e as Error).message}]`;
        }
      }

      try {
        const response = await this.originalFetch(input, init);
        const duration = performance.now() - startTime;
        let responseBody: string | undefined;
        try {
          const clonedResponse = response.clone();
          const contentType = clonedResponse.headers.get("content-type");
          if (
            contentType &&
            (contentType.includes("application/json") ||
              contentType.includes("text/"))
          ) {
            responseBody = await clonedResponse.text();
          } else if (clonedResponse.body) {
            responseBody = `[Response body of type: ${
              contentType || "unknown"
            }]`;
          } else {
            responseBody = "[Empty or non-text response body]";
          }
        } catch (e) {
          responseBody = `[Error reading response body: ${
            (e as Error).message
          }]`;
        }

        this.logApiCall({
          url: this.stripUrlParams(apiUrl),
          method: apiMethod,
          duration,
          statusCode: response.status,
          requestBody,
          responseBody,
        });
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        let errorMessage = "Fetch failed";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unknown fetch error";
          }
        }
        this.logApiCall({
          url: this.stripUrlParams(apiUrl),
          method: apiMethod,
          duration,
          statusCode: 0,
          requestBody,
          error: errorMessage,
        });
        throw error;
      }
    };

    try {
      (window as any).fetch = newFetch;
    } catch (e: any) {
      console.warn(
        `MonitoringService: Direct assignment to window.fetch failed: "${e.message}". Attempting Object.defineProperty.`
      );
      const descriptor = Object.getOwnPropertyDescriptor(window, "fetch");

      if (descriptor && descriptor.configurable) {
        try {
          Object.defineProperty(window, "fetch", {
            value: newFetch,
            writable: true,
            enumerable:
              descriptor.enumerable !== undefined
                ? descriptor.enumerable
                : true,
            configurable: true,
          });
        } catch (defineError: any) {
          console.error(
            `MonitoringService: Object.defineProperty for window.fetch also failed: "${defineError.message}". Fetch calls will not be monitored.`
          );
        }
      } else {
        console.error(
          "MonitoringService: window.fetch is not configurable or descriptor is unavailable. Fetch calls will not be monitored.",
          descriptor
        );
      }
    }
  }

  private initializeXMLHttpRequestOverride(): void {
    if (typeof XMLHttpRequest === "undefined") {
      console.warn(
        "MonitoringService: XMLHttpRequest not available. XHR calls will not be monitored."
      );
      return;
    }

    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    const service = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string,
      async?: boolean,
      user?: string | null,
      password?: string | null
    ) {
      (this as any)._monitoringMethod = method;
      (this as any)._monitoringUrl = url;
      return service.originalXHROpen!.apply(this, arguments as any);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | BodyInit | null) {
      if (!service.isRunning) {
        return service.originalXHRSend!.apply(this, arguments as any);
      }

      const startTime = performance.now();
      const method = (this as any)._monitoringMethod || "GET";
      const url = (this as any)._monitoringUrl || "";

      let requestBody: string | undefined;
      if (body) {
        if (typeof body === "string") {
          requestBody = body;
        } else if (body instanceof URLSearchParams) {
          requestBody = body.toString();
        } else if (body instanceof FormData) {
          requestBody = "[FormData body]";
        } else if (body instanceof Blob || body instanceof ArrayBuffer) {
          requestBody = `[Binary body: ${body.constructor.name}]`;
        } else {
          requestBody = `[Non-string body: ${Object.prototype.toString.call(body)}]`;
        }
      }

      const xhr = this as XMLHttpRequest;
      const onLoadEnd = () => {
        xhr.removeEventListener("loadend", onLoadEnd);
        const duration = performance.now() - startTime;
        let responseBody: string | undefined;
        try {
          const contentType = xhr.getResponseHeader("content-type");
          if (
            contentType &&
            (contentType.includes("application/json") ||
              contentType.includes("text/"))
          ) {
            responseBody = xhr.responseText;
          } else if ((xhr as any).response) {
            responseBody = `[Response body of type: ${contentType || "unknown"}]`;
          } else {
            responseBody = "[Empty or non-text response body]";
          }
        } catch (e) {
          responseBody = `[Error reading response body: ${(e as Error).message}]`;
        }

        service.logApiCall({
          url: service.stripUrlParams(url),
          method,
          duration,
          statusCode: xhr.status,
          requestBody,
          responseBody,
        });
      };

      xhr.addEventListener("loadend", onLoadEnd);

      try {
        return service.originalXHRSend!.apply(this, arguments as any);
      } catch (error) {
        xhr.removeEventListener("loadend", onLoadEnd);
        const duration = performance.now() - startTime;
        let errorMessage = "XHR failed";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unknown XHR error";
          }
        }

        service.logApiCall({
          url: service.stripUrlParams(url),
          method,
          duration,
          statusCode: 0,
          requestBody,
          error: errorMessage,
        });
        throw error;
      }
    };
  }

  private handleRouteChange = () => {
    const newPath =
      window.location.pathname + window.location.search + window.location.hash;
    if (newPath !== this.currentPath) {
      const referrer = this.currentPath;
      this.currentPath = newPath;
      this.logPageView(this.currentPath, referrer);
    }
  };

  private initializeRouteTracking(): void {
    window.history.pushState = (...args) => {
      this.originalPushState(...args);
      this.handleRouteChange();
    };
    window.history.replaceState = (...args) => {
      this.originalReplaceState(...args);
      this.handleRouteChange();
    };
    window.addEventListener("popstate", this.handleRouteChange);
    window.addEventListener("hashchange", this.handleRouteChange);

    this.currentPath =
      window.location.pathname + window.location.search + window.location.hash;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.info("Monitoring re-started.");
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    console.info("Monitoring stopped.");
  }

  public toggleMonitoring(): boolean {
    this.isRunning = !this.isRunning;
    console.info(`Monitoring ${this.isRunning ? "started" : "stopped"}.`);
    return this.isRunning;
  }
}

export const MonitoringService = new MonitoringServiceImpl();
