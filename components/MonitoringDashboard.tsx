import React from "react";
import "./dashboard-styles.css";
import "./MonitoringDashboard.css";

// Unified Dashboard Complete Component - MonitoringDashboard.jsx
const { useState, useEffect, useMemo, useCallback } = React;
import * as lucide from "lucide-react";

const {
  Play,
  Pause,
  Trash2,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  Code,
  Eye,
  ArrowLeft,
  List,
  Clock,
  Tag,
  Cpu,
  CheckCircle,
  Settings,
  X,
  Edit,
  Plus,
  Send,
  BarChart3,
  Activity,
  Globe,
  Zap,
  FileCode,
  Wifi,
  WifiOff,
} = lucide;

// Log Entry Types
const LogEntryType = {
  PAGE_VIEW: "PAGE_VIEW",
  API_CALL: "API_CALL",
  COMPONENT_RENDER: "COMPONENT_RENDER",
  ERROR: "ERROR",
  CUSTOM_EVENT: "CUSTOM_EVENT",
};

// Helper Functions (inline for standalone usage)
const getLogColor = (type) => {
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

const getLogIcon = (type) => {
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

const getMethodBadgeClass = (method) => {
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

const formatDuration = (ms) => {
  if (ms === undefined) return "Ongoing";
  if (ms < 0) return "N/A";
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const stripQueryParams = (fullPath) => {
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

// Mock Data Generator
const generateMockLogs = (count = 20) => {
  const types = [
    "PAGE_VIEW",
    "API_CALL",
    "COMPONENT_RENDER",
    "ERROR",
    "CUSTOM_EVENT",
  ];
  const paths = ["/dashboard", "/profile", "/settings", "/analytics", "/users"];
  const methods = ["GET", "POST", "PUT", "DELETE"];
  const urls = ["/api/users", "/api/posts", "/api/analytics", "/api/settings"];
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
    const timestamp = now - Math.random() * 24 * 60 * 60 * 1000;

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
          message: "Network timeout error",
          source: "MockService",
          stack:
            "Error: Network timeout\n    at MockService.fetchData (line 42)",
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
      id: `mock-${i}-${Date.now()}`,
      type,
      timestamp,
      data,
    });
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

// Generate Mock Test Requests
const generateMockTestRequests = () => [
  {
    id: "get-users",
    name: "Get All Users",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/users",
    expectedStatus: 200,
  },
  {
    id: "create-post",
    name: "Create New Post",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    body: JSON.stringify(
      {
        title: "Test Post",
        body: "This is a test post for API monitoring",
        userId: 1,
      },
      null,
      2
    ),
    expectedStatus: 201,
  },
  {
    id: "get-post",
    name: "Get Single Post",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    expectedStatus: 200,
  },
  {
    id: "update-post",
    name: "Update Post",
    method: "PUT",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    body: JSON.stringify(
      {
        id: 1,
        title: "Updated Post Title",
        body: "Updated post content",
        userId: 1,
      },
      null,
      2
    ),
    expectedStatus: 200,
  },
  {
    id: "delete-post",
    name: "Delete Post",
    method: "DELETE",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    expectedStatus: 200,
  },
  {
    id: "test-404",
    name: "Test 404 Error",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/invalid-endpoint",
    expectedStatus: 404,
  },
];

// Timeline Chart Component
const TimelineChart = ({ logs }) => {
  const chartData = useMemo(() => {
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
  }, [logs]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <BarChart3 style={{ width: "1.25rem", height: "1.25rem" }} />
          Activity Timeline (Last 10 minutes)
        </h3>
      </div>
      <div className="card-content">
        <div className="timeline">
          {chartData.length === 0 ? (
            <div className="empty-state">No recent activity</div>
          ) : (
            chartData.map((item) => (
              <div
                key={item.id}
                className="timeline-point"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  backgroundColor: item.color,
                }}
                title={`${item.type} - ${new Date(
                  item.timestamp
                ).toLocaleTimeString()}`}
              >
                <div className="timeline-tooltip">
                  {getLogIcon(item.type)} {item.type.replace(/_/g, " ")}
                  <br />
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#9ca3af",
              padding: "0 0.5rem",
            }}
          >
            <span>10m ago</span>
            <span>5m ago</span>
            <span>Now</span>
          </div>
        </div>

        <div className="legend">
          {[
            { type: "PAGE_VIEW", label: "Page Views", color: "#3B82F6" },
            { type: "API_CALL", label: "API Calls", color: "#10B981" },
            { type: "COMPONENT_RENDER", label: "Renders", color: "#8B5CF6" },
            { type: "ERROR", label: "Errors", color: "#EF4444" },
            { type: "CUSTOM_EVENT", label: "Events", color: "#F59E0B" },
          ].map((item) => (
            <div key={item.type} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Log Item Component
const LogItem = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const getIconForLogType = (type) => {
    const iconStyle = { width: "1rem", height: "1rem" };
    switch (type) {
      case LogEntryType.PAGE_VIEW:
        return React.createElement(Eye, { style: iconStyle });
      case LogEntryType.API_CALL:
        return React.createElement(Code, { style: iconStyle });
      case LogEntryType.COMPONENT_RENDER:
        return React.createElement(Info, { style: iconStyle });
      case LogEntryType.ERROR:
        return React.createElement(AlertTriangle, { style: iconStyle });
      case LogEntryType.CUSTOM_EVENT:
        return React.createElement(Tag, { style: iconStyle });
      default:
        return React.createElement(Info, { style: iconStyle });
    }
  };

  const renderLogData = () => {
    switch (log.type) {
      case LogEntryType.PAGE_VIEW:
        const pvData = log.data;
        return React.createElement(
          "p",
          { className: "text-sm" },
          `Path: ${pvData.path}`,
          pvData.referrer &&
            React.createElement(
              "span",
              {
                className: "text-xs text-gray mt-1",
                style: { display: "block" },
              },
              `Referrer: ${pvData.referrer}`
            )
        );

      case LogEntryType.API_CALL:
        const apiData = log.data;
        return React.createElement(
          "div",
          { className: "text-sm" },
          React.createElement(
            "p",
            null,
            React.createElement("strong", null, apiData.method),
            ` ${apiData.url}`
          ),
          React.createElement(
            "p",
            { className: "flex gap-2 text-xs" },
            React.createElement(
              "span",
              null,
              "Status: ",
              React.createElement(
                "span",
                {
                  className:
                    apiData.statusCode >= 400 ? "text-red" : "text-green",
                },
                apiData.statusCode
              )
            ),
            React.createElement(
              "span",
              null,
              `Duration: ${apiData.duration?.toFixed(2)}ms`
            )
          ),
          expanded &&
            apiData.requestBody &&
            React.createElement(
              "div",
              { className: "mt-2" },
              React.createElement(
                "p",
                { className: "text-xs font-medium mb-1" },
                "Request:"
              ),
              React.createElement(
                "pre",
                { className: "code-block" },
                JSON.stringify(apiData.requestBody, null, 2)
              )
            ),
          expanded &&
            apiData.responseBody &&
            React.createElement(
              "div",
              { className: "mt-2" },
              React.createElement(
                "p",
                { className: "text-xs font-medium mb-1" },
                "Response:"
              ),
              React.createElement(
                "pre",
                { className: "code-block" },
                JSON.stringify(apiData.responseBody, null, 2)
              )
            )
        );

      case LogEntryType.COMPONENT_RENDER:
        const crData = log.data;
        return React.createElement(
          "p",
          { className: "text-sm" },
          `Component: `,
          React.createElement("strong", null, crData.componentName),
          ` • Event: ${crData.eventType} • Duration: ${crData.duration.toFixed(
            2
          )}ms`
        );

      case LogEntryType.ERROR:
        const errData = log.data;
        return React.createElement(
          "div",
          { className: "text-sm" },
          React.createElement(
            "p",
            { className: "text-red font-medium" },
            `Error: ${errData.message}`
          ),
          React.createElement(
            "p",
            { className: "text-xs text-gray mt-1" },
            `Source: ${errData.source}`
          ),
          expanded &&
            errData.stack &&
            React.createElement(
              "pre",
              {
                className: "code-block mt-2",
                style: { backgroundColor: "var(--error-bg, #fef2f2)" },
              },
              errData.stack
            )
        );

      default:
        return React.createElement(
          "p",
          { className: "text-sm" },
          "Unknown log type"
        );
    }
  };

  const canExpand =
    log.type === LogEntryType.API_CALL ||
    (log.type === LogEntryType.ERROR && log.data.stack);

  return React.createElement(
    "li",
    { className: "list-item" },
    React.createElement(
      "div",
      { className: "flex-start gap-3" },
      React.createElement(
        "div",
        { className: "p-1", style: { flexShrink: 0 } },
        getIconForLogType(log.type)
      ),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        renderLogData(),
        React.createElement(
          "p",
          { className: "text-xs text-gray mt-2" },
          new Date(log.timestamp).toLocaleString()
        )
      ),
      canExpand &&
        React.createElement(
          "button",
          {
            onClick: () => setExpanded(!expanded),
            className: "icon-btn p-1",
            "aria-label": expanded ? "Collapse" : "Expand",
          },
          expanded
            ? React.createElement(ChevronUp, {
                style: { width: "1rem", height: "1rem" },
              })
            : React.createElement(ChevronDown, {
                style: { width: "1rem", height: "1rem" },
              })
        )
    )
  );
};

// Request Card Component
const RequestCard = ({
  request,
  onEdit,
  onDelete,
  onExecute,
  result,
  isLoading,
}) => {
  return React.createElement(
    "div",
    { className: "card", style: { marginBottom: "1rem" } },
    React.createElement(
      "div",
      { className: "flex-between mb-3" },
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "h4",
          { className: "font-medium truncate", style: { margin: 0 } },
          request.name
        ),
        React.createElement(
          "p",
          { className: "text-sm text-gray truncate mt-1" },
          request.url
        )
      ),
      React.createElement(
        "div",
        { className: "flex gap-2", style: { marginLeft: "0.75rem" } },
        React.createElement(
          "button",
          {
            onClick: () => onEdit(request),
            className: "icon-btn",
            "aria-label": "Edit request",
          },
          React.createElement(Edit, {
            style: { width: "1rem", height: "1rem" },
          })
        ),
        React.createElement(
          "button",
          {
            onClick: () => onDelete(request.id),
            className: "icon-btn text-red",
            "aria-label": "Delete request",
          },
          React.createElement(Trash2, {
            style: { width: "1rem", height: "1rem" },
          })
        )
      )
    ),
    React.createElement(
      "div",
      { className: "flex gap-2 text-sm mb-3" },
      React.createElement(
        "span",
        { className: `badge ${getMethodBadgeClass(request.method)}` },
        request.method
      ),
      request.expectedStatus &&
        React.createElement(
          "span",
          { className: "text-gray" },
          `Expected: ${request.expectedStatus}`
        )
    ),
    result &&
      React.createElement(
        "div",
        {
          className: `text-sm mb-3 ${
            result.status === "success" ? "text-green" : "text-red"
          }`,
        },
        result.status === "success" &&
          React.createElement(
            "div",
            { className: "flex gap-2" },
            React.createElement(CheckCircle, {
              style: { width: "1rem", height: "1rem" },
            }),
            React.createElement(
              "span",
              null,
              `✓ ${result.actualStatus} (${result.duration}ms)`
            )
          ),
        result.status === "error" &&
          React.createElement(
            "div",
            { className: "flex gap-2" },
            React.createElement(AlertTriangle, {
              style: { width: "1rem", height: "1rem" },
            }),
            React.createElement(
              "span",
              null,
              `✗ ${result.actualStatus || "Failed"} (${result.duration}ms)`
            )
          )
      ),
    React.createElement(
      "button",
      {
        onClick: () => onExecute(request),
        disabled: isLoading,
        className: "btn btn-primary",
        style: {
          width: "100%",
          justifyContent: "center",
          opacity: isLoading ? 0.7 : 1,
        },
      },
      isLoading
        ? [
            React.createElement("div", {
              key: "spinner",
              className: "spinner",
            }),
            "Testing...",
          ]
        : [
            React.createElement(Send, {
              key: "icon",
              style: { width: "1rem", height: "1rem" },
            }),
            "Run Test",
          ]
    )
  );
};

// Main Dashboard Component
const MonitoringDashboard = () => {
  // Initialize mock data
  const [logs, setLogs] = useState(() => generateMockLogs(20));
  const [testRequests, setTestRequests] = useState(() =>
    generateMockTestRequests()
  );

  // State Management
  const [activeView, setActiveView] = useState("monitoring");
  const [isMonitoringActive, setIsMonitoringActive] = useState(true);
  const [currentTheme, setCurrentTheme] = useState("light");
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPagePath, setSelectedPagePath] = useState(null);

  // API Testing states
  const [loadingStates, setLoadingStates] = useState({});
  const [results, setResults] = useState({});
  const [stats, setStats] = useState({ success: 0, error: 0, total: 0 });
  const [requestLog, setRequestLog] = useState([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    method: "GET",
    url: "",
    body: "",
    expectedStatus: 200,
  });

  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleMonitoring = () => {
    setIsMonitoringActive((prev) => !prev);
  };

  // API Testing functions
  const setLoading = (key, loading) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  };

  const setResult = (key, result) => {
    setResults((prev) => ({ ...prev, [key]: result }));
    if (result.status === "success") {
      setStats((prev) => ({
        ...prev,
        success: prev.success + 1,
        total: prev.total + 1,
      }));
    } else if (result.status === "error") {
      setStats((prev) => ({
        ...prev,
        error: prev.error + 1,
        total: prev.total + 1,
      }));
    }
  };

  const addToLog = (logEntry) => {
    setRequestLog((prev) => [logEntry, ...prev.slice(0, 19)]);
  };

  const executeApiRequest = async (testRequest) => {
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

      addToLog(finalLogEntry);

      // Add to monitoring logs
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
      setLogs((prev) => [monitoringLog, ...prev]);

      const isSuccess = testRequest.expectedStatus
        ? response.status === testRequest.expectedStatus
        : response.status >= 200 && response.status < 300;

      return {
        status: isSuccess ? "success" : "error",
        actualStatus: response.status,
        duration: Math.round(duration),
      };
    } catch (err) {
      const duration = performance.now() - startTime;

      const errorLogEntry = {
        ...logEntry,
        error: err.message || "Request failed",
        duration: Math.round(duration),
      };

      addToLog(errorLogEntry);

      // Add error to monitoring logs
      const errorLog = {
        id: Date.now().toString(),
        type: "ERROR",
        timestamp: Date.now(),
        data: {
          message: err.message || "Request failed",
          source: `API Test: ${testRequest.name}`,
        },
      };
      setLogs((prev) => [errorLog, ...prev]);

      return {
        status: "error",
        duration: Math.round(duration),
        error: err.message,
      };
    }
  };

  const handleExecuteRequest = async (testRequest) => {
    const key = testRequest.id;
    setLoading(key, true);
    setResult(key, { status: null });

    try {
      const result = await executeApiRequest(testRequest);
      setResult(key, result);
    } catch (error) {
      console.error("Request execution failed:", error);
      setResult(key, {
        status: "error",
        error: error.message,
      });
    } finally {
      setLoading(key, false);
    }
  };

  const openEditModal = (request = null) => {
    if (request) {
      setEditingRequest(request);
      setEditForm({
        name: request.name,
        method: request.method,
        url: request.url,
        body: request.body || "",
        expectedStatus: request.expectedStatus || 200,
      });
    } else {
      setEditingRequest(null);
      setEditForm({
        name: "",
        method: "GET",
        url: "",
        body: "",
        expectedStatus: 200,
      });
    }
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingRequest(null);
  };

  const saveRequest = () => {
    const newRequest = {
      id: editingRequest?.id || Date.now().toString(),
      name: editForm.name,
      method: editForm.method,
      url: editForm.url,
      body: editForm.body.trim() || undefined,
      expectedStatus: editForm.expectedStatus,
    };

    if (editingRequest) {
      setTestRequests((prev) =>
        prev.map((req) => (req.id === editingRequest.id ? newRequest : req))
      );
    } else {
      setTestRequests((prev) => [...prev, newRequest]);
    }

    closeEditModal();
  };

  const deleteRequest = (id) => {
    setTestRequests((prev) => prev.filter((req) => req.id !== id));
  };

  // Generate page insights
  const generatePageInsights = useCallback((logs) => {
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
      pageInsight.firstViewedAt = Math.min(
        pageInsight.firstViewedAt,
        startTime
      );

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
  }, []);

  // Computed values
  const pageInsights = useMemo(
    () => generatePageInsights(logs),
    [logs, generatePageInsights]
  );

  const getSourceLogsForStats = useCallback(() => {
    if (selectedPagePath) {
      const insight = pageInsights.find((p) => p.path === selectedPagePath);
      if (insight) {
        const relevantLogIds = new Set();
        insight.visits.forEach((visit) =>
          visit.logIds.forEach((id) => relevantLogIds.add(id))
        );
        return logs.filter((log) => relevantLogIds.has(log.id));
      }
      return [];
    }
    return logs;
  }, [logs, selectedPagePath, pageInsights]);

  const filteredLogs = useMemo(() => {
    let displayLogs = getSourceLogsForStats();

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
  }, [getSourceLogsForStats, filterType, searchTerm]);

  const summaryStats = useMemo(() => {
    const sourceLogs = getSourceLogsForStats();
    return {
      pageViews: sourceLogs.filter((log) => log.type === "PAGE_VIEW").length,
      apiCalls: sourceLogs.filter((log) => log.type === "API_CALL").length,
      errors: sourceLogs.filter((log) => log.type === "ERROR").length,
      componentRenders: sourceLogs.filter(
        (log) => log.type === "COMPONENT_RENDER"
      ).length,
      customEvents: sourceLogs.filter((log) => log.type === "CUSTOM_EVENT")
        .length,
    };
  }, [getSourceLogsForStats]);

  return React.createElement(
    "div",
    {
      className: `unified-dashboard ${currentTheme === "dark" ? "dark" : ""}`,
    },
    // Header
    React.createElement(
      "div",
      { className: "header" },
      React.createElement(
        "div",
        { className: "header-content" },
        React.createElement(
          "div",
          { className: "header-title" },
          React.createElement("div", {
            className: `status-dot ${
              isMonitoringActive ? "active" : "inactive"
            }`,
          }),
          React.createElement("h1", { className: "title" }, "Performance Hub")
        ),
        React.createElement(
          "div",
          { className: "flex gap-2" },
          React.createElement(
            "button",
            {
              onClick: toggleMonitoring,
              className: "icon-btn",
              title: isMonitoringActive
                ? "Pause Monitoring"
                : "Start Monitoring",
            },
            isMonitoringActive
              ? React.createElement(Pause, {
                  style: {
                    width: "1.25rem",
                    height: "1.25rem",
                    color: "#ef4444",
                  },
                })
              : React.createElement(Play, {
                  style: {
                    width: "1.25rem",
                    height: "1.25rem",
                    color: "#10b981",
                  },
                })
          ),
          React.createElement(
            "button",
            {
              onClick: toggleTheme,
              className: "icon-btn",
            },
            currentTheme === "light"
              ? React.createElement(Moon, {
                  style: { width: "1.25rem", height: "1.25rem" },
                })
              : React.createElement(Sun, {
                  style: { width: "1.25rem", height: "1.25rem" },
                })
          )
        )
      ),

      // Tab Navigation
      React.createElement(
        "div",
        { className: "tab-nav" },
        React.createElement(
          "button",
          {
            onClick: () => setActiveView("monitoring"),
            className: `tab ${activeView === "monitoring" ? "active" : ""}`,
          },
          React.createElement(
            "div",
            { className: "tab-content" },
            React.createElement(Activity, {
              style: { width: "1rem", height: "1rem" },
            }),
            React.createElement("span", null, "Monitor"),
            React.createElement(
              "span",
              { className: "hide-mobile" },
              `(${logs.length})`
            )
          ),
          activeView === "monitoring" &&
            React.createElement("div", { className: "tab-indicator" })
        ),
        React.createElement(
          "button",
          {
            onClick: () => setActiveView("testing"),
            className: `tab ${activeView === "testing" ? "active" : ""}`,
          },
          React.createElement(
            "div",
            { className: "tab-content" },
            React.createElement(Zap, {
              style: { width: "1rem", height: "1rem" },
            }),
            React.createElement("span", null, "Test"),
            React.createElement(
              "span",
              { className: "hide-mobile" },
              `(${testRequests.length})`
            )
          ),
          activeView === "testing" &&
            React.createElement("div", { className: "tab-indicator" })
        )
      )
    ),

    React.createElement(
      "div",
      { className: "container" },
      activeView === "monitoring"
        ? [
            // Monitoring View
            // Summary Stats
            React.createElement(
              "div",
              { key: "stats", className: "grid grid-5 mb-6" },
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "0.5rem",
                        backgroundColor: "var(--primary-50)",
                        borderRadius: "50%",
                      },
                    },
                    React.createElement(Eye, {
                      style: {
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--primary-600)",
                      },
                    })
                  )
                ),
                React.createElement(
                  "div",
                  { className: "stat-value" },
                  summaryStats.pageViews
                ),
                React.createElement("div", { className: "stat-label" }, "Pages")
              ),
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "0.5rem",
                        backgroundColor: "#dcfce7",
                        borderRadius: "50%",
                      },
                    },
                    React.createElement(Code, {
                      style: {
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--success-600)",
                      },
                    })
                  )
                ),
                React.createElement(
                  "div",
                  { className: "stat-value" },
                  summaryStats.apiCalls
                ),
                React.createElement("div", { className: "stat-label" }, "APIs")
              ),
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "0.5rem",
                        backgroundColor: "#fee2e2",
                        borderRadius: "50%",
                      },
                    },
                    React.createElement(AlertTriangle, {
                      style: {
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--error-600)",
                      },
                    })
                  )
                ),
                React.createElement(
                  "div",
                  { className: "stat-value" },
                  summaryStats.errors
                ),
                React.createElement(
                  "div",
                  { className: "stat-label" },
                  "Errors"
                )
              ),
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "0.5rem",
                        backgroundColor: "#e0e7ff",
                        borderRadius: "50%",
                      },
                    },
                    React.createElement(Cpu, {
                      style: {
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--purple-600)",
                      },
                    })
                  )
                ),
                React.createElement(
                  "div",
                  { className: "stat-value" },
                  summaryStats.componentRenders
                ),
                React.createElement(
                  "div",
                  { className: "stat-label" },
                  "Renders"
                )
              ),
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "0.5rem",
                        backgroundColor: "#fef3c7",
                        borderRadius: "50%",
                      },
                    },
                    React.createElement(Tag, {
                      style: {
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "var(--warning-600)",
                      },
                    })
                  )
                ),
                React.createElement(
                  "div",
                  { className: "stat-value" },
                  summaryStats.customEvents
                ),
                React.createElement(
                  "div",
                  { className: "stat-label" },
                  "Events"
                )
              )
            ),

            // Timeline Chart
            React.createElement(TimelineChart, { key: "timeline", logs: logs }),

            // Page Insights
            pageInsights.length > 0 &&
              React.createElement(
                "div",
                { key: "insights", className: "card" },
                React.createElement(
                  "div",
                  { className: "card-header" },
                  React.createElement(
                    "h2",
                    { className: "card-title" },
                    React.createElement(List, {
                      style: { width: "1.25rem", height: "1.25rem" },
                    }),
                    "Page Performance Insights"
                  )
                ),
                React.createElement(
                  "div",
                  { style: { maxHeight: "16rem", overflowY: "auto" } },
                  pageInsights.map((insight) =>
                    React.createElement(
                      "div",
                      {
                        key: insight.path,
                        className: `list-item ${
                          selectedPagePath === insight.path ? "selected" : ""
                        }`,
                        style: { cursor: "pointer" },
                        onClick: () =>
                          setSelectedPagePath(
                            selectedPagePath === insight.path
                              ? null
                              : insight.path
                          ),
                      },
                      React.createElement(
                        "div",
                        { className: "flex-between", style: { gap: "1rem" } },
                        React.createElement(
                          "div",
                          { style: { flex: 1, minWidth: 0 } },
                          React.createElement(
                            "span",
                            {
                              className: `font-medium truncate ${
                                selectedPagePath === insight.path
                                  ? "text-blue"
                                  : ""
                              }`,
                              style: { display: "block" },
                            },
                            insight.path
                          ),
                          React.createElement(
                            "p",
                            {
                              className: "text-sm text-gray mt-1",
                              style: { margin: 0 },
                            },
                            `${insight.totalVisits} visits • Last: ${new Date(
                              insight.lastViewedAt
                            ).toLocaleTimeString()}`
                          )
                        ),
                        React.createElement(
                          "div",
                          {
                            className: "text-right text-sm",
                            style: { flexShrink: 0 },
                          },
                          React.createElement(
                            "p",
                            { className: "text-gray", style: { margin: 0 } },
                            `APIs: ${insight.totalApiCallCount}`
                          ),
                          React.createElement(
                            "p",
                            {
                              className: `mt-1 ${
                                insight.totalErrorCount > 0
                                  ? "text-red font-medium"
                                  : "text-gray"
                              }`,
                              style: { margin: 0 },
                            },
                            `Errors: ${insight.totalErrorCount}`
                          )
                        )
                      )
                    )
                  )
                )
              ),

            // Logs
            React.createElement(
              "div",
              { key: "logs", className: "card" },
              React.createElement(
                "div",
                { className: "card-header" },
                React.createElement(
                  "div",
                  { className: "flex-between mb-4" },
                  React.createElement(
                    "h2",
                    { className: "card-title", style: { margin: 0 } },
                    React.createElement(Globe, {
                      style: { width: "1.25rem", height: "1.25rem" },
                    }),
                    `Activity Logs (${filteredLogs.length})`
                  ),
                  selectedPagePath &&
                    React.createElement(
                      "button",
                      {
                        onClick: () => setSelectedPagePath(null),
                        className: "btn btn-ghost",
                      },
                      React.createElement(ArrowLeft, {
                        style: { width: "1rem", height: "1rem" },
                      }),
                      React.createElement(
                        "span",
                        { className: "hide-mobile" },
                        "Back to all"
                      )
                    )
                ),
                React.createElement(
                  "div",
                  { className: "flex gap-3 flex-mobile-col" },
                  React.createElement("input", {
                    type: "text",
                    placeholder: "Search logs...",
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    className: "input",
                    style: { flex: 1 },
                  }),
                  React.createElement(
                    "select",
                    {
                      value: filterType,
                      onChange: (e) => setFilterType(e.target.value),
                      className: "select",
                    },
                    React.createElement(
                      "option",
                      { value: "ALL" },
                      "All Types"
                    ),
                    React.createElement(
                      "option",
                      { value: "PAGE_VIEW" },
                      "Page Views"
                    ),
                    React.createElement(
                      "option",
                      { value: "API_CALL" },
                      "API Calls"
                    ),
                    React.createElement(
                      "option",
                      { value: "COMPONENT_RENDER" },
                      "Component Renders"
                    ),
                    React.createElement("option", { value: "ERROR" }, "Errors"),
                    React.createElement(
                      "option",
                      { value: "CUSTOM_EVENT" },
                      "Custom Events"
                    )
                  )
                )
              ),
              React.createElement(
                "div",
                { style: { maxHeight: "24rem", overflowY: "auto" } },
                filteredLogs.length === 0
                  ? React.createElement(
                      "div",
                      { className: "empty-state" },
                      React.createElement(Globe, {
                        style: { width: "3rem", height: "3rem", opacity: 0.5 },
                      }),
                      React.createElement(
                        "p",
                        { style: { margin: 0 } },
                        "No logs to display"
                      ),
                      filterType !== "ALL" &&
                        React.createElement(
                          "p",
                          { className: "text-sm", style: { margin: 0 } },
                          "Try changing the filter"
                        )
                    )
                  : React.createElement(
                      "ul",
                      { className: "list" },
                      filteredLogs.map((log) =>
                        React.createElement(LogItem, { key: log.id, log: log })
                      )
                    )
              )
            ),
          ]
        : [
            // API Testing View
            // Stats
            React.createElement(
              "div",
              { key: "test-stats", className: "grid grid-3 mb-6" },
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  Object.values(loadingStates).filter(Boolean).length > 0
                    ? React.createElement(Wifi, {
                        style: {
                          width: "1.25rem",
                          height: "1.25rem",
                          color: "var(--primary-600)",
                        },
                      })
                    : React.createElement(WifiOff, {
                        style: {
                          width: "1.25rem",
                          height: "1.25rem",
                          color: "var(--gray-400)",
                        },
                      })
                ),
                React.createElement(
                  "div",
                  { className: "stat-value text-blue" },
                  Object.values(loadingStates).filter(Boolean).length
                ),
                React.createElement(
                  "div",
                  { className: "stat-label" },
                  "Active"
                )
              ),
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(CheckCircle, {
                    style: {
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "var(--success-500)",
                    },
                  })
                ),
                React.createElement(
                  "div",
                  { className: "stat-value text-green" },
                  stats.success
                ),
                React.createElement(
                  "div",
                  { className: "stat-label" },
                  "Success"
                )
              ),
              React.createElement(
                "div",
                { className: "stat-card" },
                React.createElement(
                  "div",
                  { className: "stat-icon" },
                  React.createElement(AlertTriangle, {
                    style: {
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "var(--error-500)",
                    },
                  })
                ),
                React.createElement(
                  "div",
                  { className: "stat-value text-red" },
                  stats.error
                ),
                React.createElement(
                  "div",
                  { className: "stat-label" },
                  "Failed"
                )
              )
            ),

            // Test Requests
            React.createElement(
              "div",
              { key: "test-requests", className: "card" },
              React.createElement(
                "div",
                { className: "card-header flex-between" },
                React.createElement(
                  "h3",
                  { className: "card-title", style: { margin: 0 } },
                  React.createElement(FileCode, {
                    style: { width: "1.25rem", height: "1.25rem" },
                  }),
                  "API Test Requests"
                ),
                React.createElement(
                  "button",
                  {
                    onClick: () => openEditModal(),
                    className: "btn btn-primary",
                  },
                  React.createElement(Plus, {
                    style: { width: "1rem", height: "1rem" },
                  }),
                  React.createElement(
                    "span",
                    { className: "hide-mobile" },
                    "Add Test"
                  )
                )
              ),
              React.createElement(
                "div",
                { className: "card-content" },
                React.createElement(
                  "div",
                  { className: "grid grid-lg" },
                  testRequests.map((request) =>
                    React.createElement(RequestCard, {
                      key: request.id,
                      request: request,
                      onEdit: openEditModal,
                      onDelete: deleteRequest,
                      onExecute: handleExecuteRequest,
                      result: results[request.id],
                      isLoading: loadingStates[request.id],
                    })
                  )
                )
              )
            ),

            // Request Log
            requestLog.length > 0 &&
              React.createElement(
                "div",
                { key: "request-log", className: "card" },
                React.createElement(
                  "div",
                  { className: "card-header flex-between" },
                  React.createElement(
                    "h3",
                    { className: "card-title", style: { margin: 0 } },
                    React.createElement(Clock, {
                      style: { width: "1.25rem", height: "1.25rem" },
                    }),
                    "Test Results Log"
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: () => {
                        setRequestLog([]);
                        setStats({ success: 0, error: 0, total: 0 });
                      },
                      className: "icon-btn",
                      "aria-label": "Clear log",
                    },
                    React.createElement(Trash2, {
                      style: { width: "1rem", height: "1rem" },
                    })
                  )
                ),
                React.createElement(
                  "div",
                  { style: { maxHeight: "24rem", overflowY: "auto" } },
                  requestLog.map((log, index) =>
                    React.createElement(
                      "div",
                      {
                        key: log.id,
                        className: "list-item",
                        style:
                          index === 0
                            ? { backgroundColor: "var(--primary-50)" }
                            : {},
                      },
                      React.createElement(
                        "div",
                        {
                          className: "flex gap-2 mb-3",
                          style: { flexWrap: "wrap" },
                        },
                        React.createElement(
                          "span",
                          {
                            className: `badge ${
                              log.error ? "badge-error" : "badge-success"
                            }`,
                          },
                          log.method
                        ),
                        React.createElement(
                          "span",
                          { className: "text-xs text-gray" },
                          log.timestamp
                        ),
                        log.responseStatus &&
                          React.createElement(
                            "span",
                            {
                              className: `badge ${
                                log.responseStatus >= 200 &&
                                log.responseStatus < 300
                                  ? "badge-success"
                                  : "badge-error"
                              }`,
                            },
                            log.responseStatus
                          ),
                        log.duration &&
                          React.createElement(
                            "span",
                            { className: "text-xs text-gray" },
                            `${log.duration}ms`
                          ),
                        log.expected &&
                          log.responseStatus &&
                          React.createElement(
                            "span",
                            {
                              className: "text-xs",
                              style: {
                                color:
                                  log.responseStatus === log.expected
                                    ? "var(--success-500)"
                                    : "var(--warning-500)",
                              },
                            },
                            `Expected: ${log.expected}`
                          )
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                          },
                        },
                        React.createElement(
                          "div",
                          null,
                          React.createElement(
                            "div",
                            { className: "text-xs font-medium text-gray mb-1" },
                            `${log.name} - URL:`
                          ),
                          React.createElement(
                            "div",
                            { className: "code-block" },
                            log.url
                          )
                        ),
                        log.requestBody &&
                          React.createElement(
                            "div",
                            null,
                            React.createElement(
                              "div",
                              {
                                className: "text-xs font-medium text-gray mb-1",
                              },
                              "Request Body:"
                            ),
                            React.createElement(
                              "div",
                              { className: "code-block" },
                              JSON.stringify(log.requestBody, null, 2)
                            )
                          ),
                        log.responseData &&
                          React.createElement(
                            "div",
                            null,
                            React.createElement(
                              "div",
                              {
                                className: "text-xs font-medium text-gray mb-1",
                              },
                              "Response:"
                            ),
                            React.createElement(
                              "div",
                              { className: "code-block" },
                              typeof log.responseData === "string"
                                ? log.responseData
                                : JSON.stringify(log.responseData, null, 2)
                            )
                          ),
                        log.error &&
                          React.createElement(
                            "div",
                            null,
                            React.createElement(
                              "div",
                              {
                                className: "text-xs font-medium mb-1 text-red",
                              },
                              "Error:"
                            ),
                            React.createElement(
                              "div",
                              {
                                className: "code-block",
                                style: {
                                  backgroundColor: "var(--error-bg)",
                                  color: "var(--error-600)",
                                },
                              },
                              log.error
                            )
                          )
                      )
                    )
                  )
                )
              ),
          ]
    ),

    // Edit Request Modal
    isEditModalOpen &&
      React.createElement(
        "div",
        {
          className: "modal-overlay",
          onClick: closeEditModal,
        },
        React.createElement(
          "div",
          {
            className: "modal-content",
            onClick: (e) => e.stopPropagation(),
          },
          React.createElement(
            "div",
            { className: "modal-header" },
            React.createElement(
              "h3",
              { className: "text-lg font-semibold", style: { margin: 0 } },
              editingRequest ? "Edit Request" : "Add New Request"
            ),
            React.createElement(
              "button",
              {
                onClick: closeEditModal,
                className: "icon-btn",
              },
              React.createElement(X, {
                style: { width: "1.25rem", height: "1.25rem" },
              })
            )
          ),
          React.createElement(
            "div",
            { className: "modal-body" },
            React.createElement(
              "div",
              { className: "form-group" },
              React.createElement(
                "label",
                { className: "label" },
                "Request Name:"
              ),
              React.createElement("input", {
                type: "text",
                value: editForm.name,
                onChange: (e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value })),
                className: "input",
                placeholder: "e.g., Get User Profile",
              })
            ),
            React.createElement(
              "div",
              { className: "grid grid-2 gap-3" },
              React.createElement(
                "div",
                { className: "form-group" },
                React.createElement("label", { className: "label" }, "Method:"),
                React.createElement(
                  "select",
                  {
                    value: editForm.method,
                    onChange: (e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        method: e.target.value,
                      })),
                    className: "select",
                  },
                  React.createElement("option", { value: "GET" }, "GET"),
                  React.createElement("option", { value: "POST" }, "POST"),
                  React.createElement("option", { value: "PUT" }, "PUT"),
                  React.createElement("option", { value: "DELETE" }, "DELETE"),
                  React.createElement("option", { value: "PATCH" }, "PATCH")
                )
              ),
              React.createElement(
                "div",
                { className: "form-group" },
                React.createElement(
                  "label",
                  { className: "label" },
                  "Expected Status:"
                ),
                React.createElement("input", {
                  type: "number",
                  value: editForm.expectedStatus,
                  onChange: (e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      expectedStatus: parseInt(e.target.value),
                    })),
                  className: "input",
                  placeholder: "200",
                })
              )
            ),
            React.createElement(
              "div",
              { className: "form-group" },
              React.createElement("label", { className: "label" }, "URL:"),
              React.createElement("input", {
                type: "text",
                value: editForm.url,
                onChange: (e) =>
                  setEditForm((prev) => ({ ...prev, url: e.target.value })),
                className: "input",
                placeholder: "https://api.example.com/endpoint",
              })
            ),
            editForm.method !== "GET" &&
              editForm.method !== "DELETE" &&
              React.createElement(
                "div",
                { className: "form-group" },
                React.createElement(
                  "label",
                  { className: "label" },
                  "Request Body (JSON):"
                ),
                React.createElement("textarea", {
                  value: editForm.body,
                  onChange: (e) =>
                    setEditForm((prev) => ({ ...prev, body: e.target.value })),
                  className: "textarea",
                  placeholder: '{\n  "key": "value"\n}',
                })
              )
          ),
          React.createElement(
            "div",
            { className: "modal-footer" },
            React.createElement(
              "button",
              {
                onClick: closeEditModal,
                className: "btn btn-ghost",
              },
              "Cancel"
            ),
            React.createElement(
              "button",
              {
                onClick: saveRequest,
                className: "btn btn-primary",
              },
              React.createElement(Settings, {
                style: { width: "1rem", height: "1rem" },
              }),
              editingRequest ? "Update Request" : "Create Request"
            )
          )
        )
      )
  );
};

export default MonitoringDashboard;
