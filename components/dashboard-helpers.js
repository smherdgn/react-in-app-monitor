// Dashboard Helper Functions - helpers.js

// Log Type Colors for Timeline
export const getLogColor = (type) => {
  switch (type) {
    case "PAGE_VIEW":
      return "#3B82F6";
    case "API_CALL":
      return "#10B981";
    case "COMPONENT_RENDER":
      return "#8B5CF6";
    case "ERROR":
      return "#EF4444";
    case "CUSTOM_EVENT":
      return "#F59E0B";
    default:
      return "#6B7280";
  }
};

// Log Type Icons for Timeline
export const getLogIcon = (type) => {
  switch (type) {
    case "PAGE_VIEW":
      return "👁";
    case "API_CALL":
      return "🔗";
    case "COMPONENT_RENDER":
      return "⚛";
    case "ERROR":
      return "❌";
    case "CUSTOM_EVENT":
      return "🏷";
    default:
      return "●";
  }
};

// HTTP Method Badge Classes
export const getMethodBadgeClass = (method) => {
  switch (method) {
    case "GET":
      return "badge-get";
    case "POST":
      return "badge-post";
    case "PUT":
      return "badge-put";
    case "DELETE":
      return "badge-delete";
    case "PATCH":
      return "badge-put";
    default:
      return "badge-get";
  }
};

// Format Duration Helper
export const formatDuration = (ms) => {
  if (ms === undefined) return "Ongoing";
  if (ms < 0) return "N/A";
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Strip Query Parameters from URL
export const stripQueryParams = (fullPath) => {
  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    return new URL(fullPath, base).pathname;
  } catch (e) {
    const qIndex = fullPath.indexOf("?");
    return qIndex !== -1 ? fullPath.substring(0, qIndex) : fullPath;
  }
};

// Generate Page Insights from Logs
export const generatePageInsights = (logs) => {
  if (!logs.length) return [];

  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const pageViewEvents = sortedLogs.filter((log) => log.type === "PAGE_VIEW");
  const insightsMap = new Map();

  for (let i = 0; i < pageViewEvents.length; i++) {
    const currentPv = pageViewEvents[i];
    const pathWithoutParams = stripQueryParams(currentPv.data.path);
    const lastLogTimestamp = sortedLogs[sortedLogs.length - 1].timestamp;

    const startTime = currentPv.timestamp;
    const endTime = pageViewEvents[i + 1]?.timestamp ?? lastLogTimestamp;

    const visitLogs = sortedLogs.filter(
      (log) => log.timestamp >= startTime && log.timestamp < endTime
    );

    const pageVisit = {
      startTime,
      endTime: i === pageViewEvents.length - 1 ? undefined : endTime,
      duration:
        i === pageViewEvents.length - 1 ? undefined : endTime - startTime,
      logIds: visitLogs.map((l) => l.id),
    };

    let pageInsight = insightsMap.get(pathWithoutParams);
    if (!pageInsight) {
      pageInsight = {
        path: pathWithoutParams,
        visits: [],
        totalVisits: 0,
        totalApiCallCount: 0,
        totalErrorCount: 0,
        totalComponentRenderCount: 0,
        firstViewedAt: startTime,
        lastViewedAt: startTime,
      };
    }

    pageInsight.visits.push(pageVisit);
    pageInsight.totalVisits = pageInsight.visits.length;
    pageInsight.lastViewedAt = Math.max(pageInsight.lastViewedAt, startTime);
    pageInsight.firstViewedAt = Math.min(pageInsight.firstViewedAt, startTime);

    const allLogsForThisPath = sortedLogs.filter((log) =>
      pageInsight.visits.some(
        (v) =>
          log.timestamp >= v.startTime &&
          (v.endTime
            ? log.timestamp < v.endTime
            : log.timestamp <= pageInsight.lastViewedAt)
      )
    );

    pageInsight.totalApiCallCount = allLogsForThisPath.filter(
      (l) => l.type === "API_CALL"
    ).length;
    pageInsight.totalErrorCount = allLogsForThisPath.filter(
      (l) => l.type === "ERROR"
    ).length;
    pageInsight.totalComponentRenderCount = allLogsForThisPath.filter(
      (l) => l.type === "COMPONENT_RENDER"
    ).length;

    insightsMap.set(pathWithoutParams, pageInsight);
  }

  return Array.from(insightsMap.values()).sort(
    (a, b) => b.lastViewedAt - a.lastViewedAt
  );
};

// Filter Logs by Type and Search Term
export const filterLogs = (logs, filterType, searchTerm) => {
  let displayLogs = logs;

  if (filterType !== "ALL") {
    displayLogs = displayLogs.filter((log) => log.type === filterType);
  }

  if (searchTerm.trim() !== "") {
    const lowerSearchTerm = searchTerm.toLowerCase();
    displayLogs = displayLogs.filter((log) => {
      const typeMatch = log.type
        .toLowerCase()
        .replace(/_/g, " ")
        .includes(lowerSearchTerm);
      if (typeMatch) return true;

      let dataString = "";
      try {
        dataString = JSON.stringify(log.data).toLowerCase();
      } catch (e) {
        /* ignore */
      }
      return dataString.includes(lowerSearchTerm);
    });
  }

  return displayLogs.sort((a, b) => b.timestamp - a.timestamp);
};

// Calculate Summary Statistics
export const calculateSummaryStats = (logs) => {
  return {
    pageViews: logs.filter((log) => log.type === "PAGE_VIEW").length,
    apiCalls: logs.filter((log) => log.type === "API_CALL").length,
    errors: logs.filter((log) => log.type === "ERROR").length,
    componentRenders: logs.filter((log) => log.type === "COMPONENT_RENDER")
      .length,
    customEvents: logs.filter((log) => log.type === "CUSTOM_EVENT").length,
  };
};

// Generate Timeline Chart Data
export const generateTimelineData = (logs) => {
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const now = Date.now();
  const timeWindow = 10 * 60 * 1000; // 10 minutes
  const startTime = now - timeWindow;

  return sortedLogs
    .filter((log) => log.timestamp >= startTime)
    .map((log, index) => ({
      ...log,
      x: ((log.timestamp - startTime) / timeWindow) * 100,
      y: (index % 3) * 25 + 10,
      color: getLogColor(log.type),
    }));
};

// Execute API Request
export const executeApiRequest = async (testRequest) => {
  const startTime = performance.now();

  const logEntry = {
    id: Date.now().toString(),
    name: testRequest.name,
    method: testRequest.method,
    url: testRequest.url,
    timestamp: new Date().toLocaleTimeString(),
    requestBody: testRequest.body ? JSON.parse(testRequest.body) : undefined,
    expected: testRequest.expectedStatus,
  };

  try {
    const options = {
      method: testRequest.method,
      headers: {
        "Content-Type": "application/json",
        ...testRequest.headers,
      },
    };

    if (
      testRequest.body &&
      testRequest.method !== "GET" &&
      testRequest.method !== "DELETE"
    ) {
      options.body = testRequest.body;
    }

    const response = await fetch(testRequest.url, options);
    const duration = performance.now() - startTime;

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    const finalLogEntry = {
      ...logEntry,
      responseStatus: response.status,
      responseData: responseData,
      duration: Math.round(duration),
    };

    // Create monitoring log entry
    const monitoringLog = {
      id: Date.now().toString(),
      type: "API_CALL",
      timestamp: Date.now(),
      data: {
        method: testRequest.method,
        url: testRequest.url,
        statusCode: response.status,
        duration: duration,
        requestBody: testRequest.body
          ? JSON.parse(testRequest.body)
          : undefined,
        responseBody: responseData,
      },
    };

    const isSuccess = testRequest.expectedStatus
      ? response.status === testRequest.expectedStatus
      : response.status >= 200 && response.status < 300;

    return {
      success: true,
      logEntry: finalLogEntry,
      monitoringLog,
      result: {
        status: isSuccess ? "success" : "error",
        actualStatus: response.status,
        duration: Math.round(duration),
      },
    };
  } catch (err) {
    const duration = performance.now() - startTime;

    const errorLogEntry = {
      ...logEntry,
      error: err.message || "Request failed",
      duration: Math.round(duration),
    };

    // Create error monitoring log
    const errorMonitoringLog = {
      id: Date.now().toString(),
      type: "ERROR",
      timestamp: Date.now(),
      data: {
        message: err.message || "Request failed",
        source: `API Test: ${testRequest.name}`,
      },
    };

    return {
      success: false,
      logEntry: errorLogEntry,
      monitoringLog: errorMonitoringLog,
      result: {
        status: "error",
        duration: Math.round(duration),
        error: err.message,
      },
    };
  }
};

// Theme Management
export const ThemeManager = {
  STORAGE_KEY: "dashboard-theme",

  getTheme: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ThemeManager.STORAGE_KEY) || "light";
    }
    return "light";
  },

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ThemeManager.STORAGE_KEY, theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  },

  toggleTheme: (currentTheme) => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    ThemeManager.setTheme(newTheme);
    return newTheme;
  },
};

// Local Storage Helpers
export const StorageManager = {
  MONITORING_KEY: "dashboard-monitoring-active",

  getMonitoringStatus: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(StorageManager.MONITORING_KEY);
      return stored ? JSON.parse(stored) : true;
    }
    return true;
  },

  setMonitoringStatus: (status) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        StorageManager.MONITORING_KEY,
        JSON.stringify(status)
      );
    }
  },
};

// Validation Helpers
export const ValidationHelpers = {
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidJson: (str) => {
    if (!str.trim()) return true; // Empty string is valid
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },

  isValidHttpMethod: (method) => {
    const validMethods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
    ];
    return validMethods.includes(method.toUpperCase());
  },

  isValidStatusCode: (code) => {
    const numCode = parseInt(code);
    return !isNaN(numCode) && numCode >= 100 && numCode <= 599;
  },
};

// Data Export Helpers
export const ExportHelpers = {
  downloadAsJson: (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date()
      .toISOString()
      .replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadAsCsv: (data, filename) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date()
      .toISOString()
      .replace(/:/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Mock Data Generators (for development/testing)
export const MockDataGenerators = {
  generateMockLogs: (count = 50) => {
    const types = [
      "PAGE_VIEW",
      "API_CALL",
      "COMPONENT_RENDER",
      "ERROR",
      "CUSTOM_EVENT",
    ];
    const paths = [
      "/dashboard",
      "/profile",
      "/settings",
      "/analytics",
      "/users",
    ];
    const methods = ["GET", "POST", "PUT", "DELETE"];
    const urls = [
      "/api/users",
      "/api/posts",
      "/api/analytics",
      "/api/settings",
    ];
    const components = [
      "UserList",
      "Dashboard",
      "ProfileForm",
      "AnalyticsChart",
      "Navigation",
    ];

    const logs = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const timestamp = now - Math.random() * 24 * 60 * 60 * 1000; // Last 24 hours

      let data;
      switch (type) {
        case "PAGE_VIEW":
          data = {
            path: paths[Math.floor(Math.random() * paths.length)],
            referrer: Math.random() > 0.5 ? "/" : undefined,
          };
          break;
        case "API_CALL":
          data = {
            method: methods[Math.floor(Math.random() * methods.length)],
            url: urls[Math.floor(Math.random() * urls.length)],
            statusCode: Math.random() > 0.1 ? 200 : 404,
            duration: 50 + Math.random() * 500,
            responseBody: { data: "mock response" },
          };
          break;
        case "COMPONENT_RENDER":
          data = {
            componentName:
              components[Math.floor(Math.random() * components.length)],
            eventType: Math.random() > 0.5 ? "mount" : "render",
            duration: 1 + Math.random() * 50,
          };
          break;
        case "ERROR":
          data = {
            message: "Mock error message",
            source: "MockService",
            stack: "Error: Mock error\n    at MockService.mockMethod (line 42)",
          };
          break;
        case "CUSTOM_EVENT":
          data = {
            eventName: "user_interaction",
            details: { action: "click", element: "button" },
          };
          break;
      }

      logs.push({
        id: `mock-${i}`,
        type,
        timestamp,
        data,
      });
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },

  generateMockTestRequests: () => [
    {
      id: "mock-get-users",
      name: "Get All Users",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users",
      expectedStatus: 200,
    },
    {
      id: "mock-create-post",
      name: "Create New Post",
      method: "POST",
      url: "https://jsonplaceholder.typicode.com/posts",
      body: JSON.stringify(
        {
          title: "Mock Post",
          body: "This is a mock post for testing",
          userId: 1,
        },
        null,
        2
      ),
      expectedStatus: 201,
    },
    {
      id: "mock-get-post",
      name: "Get Single Post",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      expectedStatus: 200,
    },
    {
      id: "mock-update-post",
      name: "Update Post",
      method: "PUT",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      body: JSON.stringify(
        {
          id: 1,
          title: "Updated Mock Post",
          body: "Updated content",
          userId: 1,
        },
        null,
        2
      ),
      expectedStatus: 200,
    },
    {
      id: "mock-delete-post",
      name: "Delete Post",
      method: "DELETE",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      expectedStatus: 200,
    },
    {
      id: "mock-test-error",
      name: "Test 404 Error",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/invalid-endpoint",
      expectedStatus: 404,
    },
  ],
};

// Performance Monitoring Helpers
export const PerformanceHelpers = {
  measureComponentRender: (componentName, callback) => {
    const startTime = performance.now();
    const result = callback();
    const duration = performance.now() - startTime;

    // Create performance log entry
    const perfLog = {
      id: Date.now().toString(),
      type: "COMPONENT_RENDER",
      timestamp: Date.now(),
      data: {
        componentName,
        eventType: "render",
        duration,
      },
    };

    return { result, perfLog };
  },

  measureApiCall: async (url, options, callback) => {
    const startTime = performance.now();
    let response, error;

    try {
      response = await callback();
      const duration = performance.now() - startTime;

      const apiLog = {
        id: Date.now().toString(),
        type: "API_CALL",
        timestamp: Date.now(),
        data: {
          method: options?.method || "GET",
          url,
          statusCode: response.status,
          duration,
          requestBody: options?.body ? JSON.parse(options.body) : undefined,
          responseBody: await response
            .clone()
            .json()
            .catch(() => response.clone().text()),
        },
      };

      return { response, apiLog };
    } catch (err) {
      const duration = performance.now() - startTime;
      error = err;

      const errorLog = {
        id: Date.now().toString(),
        type: "ERROR",
        timestamp: Date.now(),
        data: {
          message: err.message,
          source: "API Call",
          stack: err.stack,
        },
      };

      return { error, errorLog };
    }
  },
};

// Utility Functions
export const Utils = {
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle: (func, limit) => {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  },

  formatDate: (timestamp, options = {}) => {
    const date = new Date(timestamp);
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString(undefined, {
      ...defaultOptions,
      ...options,
    });
  },

  copyToClipboard: async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        return false;
      }
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        textArea.remove();
        return true;
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        textArea.remove();
        return false;
      }
    }
  },
};

// Default Export with All Helpers
export default {
  getLogColor,
  getLogIcon,
  getMethodBadgeClass,
  formatDuration,
  stripQueryParams,
  generatePageInsights,
  filterLogs,
  calculateSummaryStats,
  generateTimelineData,
  executeApiRequest,
  ThemeManager,
  StorageManager,
  ValidationHelpers,
  ExportHelpers,
  MockDataGenerators,
  PerformanceHelpers,
  Utils,
};
