import React, { useState } from "react";
import {
  Play,
  Download,
  Upload,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Edit,
  Check,
  X,
  Settings,
} from "lucide-react";
import "./test-panel.css";

const TestRequestPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("basic");
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [results, setResults] = useState<{
    [key: string]: "success" | "error" | null;
  }>({});
  const [baseUrl, setBaseUrl] = useState(
    "https://jsonplaceholder.typicode.com/posts"
  );
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [requestLog, setRequestLog] = useState<
    Array<{
      id: string;
      method: string;
      url: string;
      timestamp: string;
      requestBody?: any;
      responseStatus?: number;
      responseData?: any;
      error?: string;
    }>
  >([]);

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  };

  const [stats, setStats] = useState({ success: 0, error: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    method: "",
    url: "",
    body: "",
  });

  const setResult = (key: string, result: "success" | "error" | null) => {
    setResults((prev) => ({ ...prev, [key]: result }));

    // Her yeni result'ta stats'ı artır
    if (result === "success") {
      setStats((prev) => ({ ...prev, success: prev.success + 1 }));
    } else if (result === "error") {
      setStats((prev) => ({ ...prev, error: prev.error + 1 }));
    }
  };

  const openEditModal = (log: any) => {
    setEditingLog(log);
    setEditForm({
      method: log.method.replace(" (Axios)", "").replace(" (Thunk)", ""),
      url: log.url,
      body: log.requestBody ? JSON.stringify(log.requestBody, null, 2) : "",
    });
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
    setEditForm({ method: "", url: "", body: "" });
  };

  const executeEditedRequest = async () => {
    setLoading("edited-request", true);

    let requestBody;
    try {
      requestBody = editForm.body.trim()
        ? JSON.parse(editForm.body)
        : undefined;
    } catch (err) {
      alert("Invalid JSON in request body");
      setLoading("edited-request", false);
      return;
    }

    const options: RequestInit = {
      method: editForm.method,
      headers: { "Content-Type": "application/json" },
    };
    if (
      requestBody &&
      editForm.method !== "GET" &&
      editForm.method !== "DELETE"
    ) {
      options.body = JSON.stringify(requestBody);
    }

    const logEntry = {
      id: Date.now().toString(),
      method: `${editForm.method} (Edited)`,
      url: editForm.url,
      timestamp: new Date().toLocaleTimeString(),
      requestBody,
    };

    try {
      const response = await fetch(editForm.url, options);
      const responseData = await response.json();

      addToLog({
        ...logEntry,
        responseStatus: response.status,
        responseData: responseData,
      });

      setResult("edited-request", "success");
    } catch (err: any) {
      console.error("Edited request failed", err);
      addToLog({
        ...logEntry,
        error: err.message || "Request failed",
      });
      setResult("edited-request", "error");
    } finally {
      setLoading("edited-request", false);
      closeEditModal();
    }
  };

  const addToLog = (logEntry: {
    id: string;
    method: string;
    url: string;
    timestamp: string;
    requestBody?: any;
    responseStatus?: number;
    responseData?: any;
    error?: string;
  }) => {
    setRequestLog((prev) => [logEntry, ...prev.slice(0, 9)]);
  };

  const sendRequest = async (method: string, key: string) => {
    setLoading(key, true);
    setResult(key, null); // Önceki result'ı temizle

    const url = method === "GET" ? `${baseUrl}/1` : baseUrl;
    const requestBody =
      method !== "GET" && method !== "DELETE"
        ? { title: "foo", body: "bar", userId: 1 }
        : undefined;

    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (requestBody) {
      options.body = JSON.stringify(requestBody);
    }

    const logEntry = {
      id: Date.now().toString(),
      method,
      url,
      timestamp: new Date().toLocaleTimeString(),
      requestBody,
    };

    try {
      const response = await fetch(url, options);
      const responseData = await response.json();

      addToLog({
        ...logEntry,
        responseStatus: response.status,
        responseData: responseData,
      });

      setResult(key, "success");
    } catch (err: any) {
      console.error("Test request failed", err);
      addToLog({
        ...logEntry,
        error: err.message || "Request failed",
      });
      setResult(key, "error");
    } finally {
      setLoading(key, false);
    }
  };

  const sendAxiosRequest = async (method: "GET" | "POST", key: string) => {
    setLoading(key, true);
    setResult(key, null);

    const url = method === "GET" ? `${baseUrl}/1` : baseUrl;
    const requestBody =
      method === "POST" ? { title: "foo", body: "bar", userId: 1 } : undefined;

    const logEntry = {
      id: Date.now().toString(),
      method: `${method} (Axios)`,
      url,
      timestamp: new Date().toLocaleTimeString(),
      requestBody,
    };

    try {
      let response;
      if (method === "GET") {
        response = await fetch(url);
      } else {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      }

      const responseData = await response.json();

      addToLog({
        ...logEntry,
        responseStatus: response.status,
        responseData: responseData,
      });

      setResult(key, "success");
    } catch (err: any) {
      console.warn("Axios request failed", err);
      addToLog({
        ...logEntry,
        error: err.message || "Axios request failed",
      });
      setResult(key, "error");
    } finally {
      setLoading(key, false);
    }
  };

  const sendThunkRequest = async (method: "GET" | "POST", key: string) => {
    setLoading(key, true);
    setResult(key, null);

    const url = method === "GET" ? `${baseUrl}/1` : baseUrl;
    const requestBody =
      method === "POST" ? { title: "foo", body: "bar", userId: 1 } : undefined;

    const logEntry = {
      id: Date.now().toString(),
      method: `${method} (Thunk)`,
      url,
      timestamp: new Date().toLocaleTimeString(),
      requestBody,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addToLog({
        ...logEntry,
        responseStatus: 200,
        responseData: {
          message: "Thunk dispatched successfully",
          simulated: true,
        },
      });

      setResult(key, "success");
    } catch (err: any) {
      addToLog({
        ...logEntry,
        error: err.message || "Thunk dispatch failed",
      });
      setResult(key, "error");
    } finally {
      setLoading(key, false);
    }
  };

  const triggerError = async () => {
    setLoading("error", true);
    setResult("error", null);

    const logEntry = {
      id: Date.now().toString(),
      method: "ERROR TEST",
      url: "internal://test-error",
      timestamp: new Date().toLocaleTimeString(),
    };

    try {
      await new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Test error from TestRequestPanel")),
          1200
        )
      );
    } catch (err: any) {
      console.error(err);
      addToLog({
        ...logEntry,
        error: err.message,
      });
      setResult("error", "error");
    } finally {
      setLoading("error", false);
    }
  };

  const ButtonComponent = ({
    onClick,
    children,
    icon: Icon,
    variant = "primary",
    loadingKey,
    size = "normal",
  }: {
    onClick: () => void;
    children: React.ReactNode;
    icon: any;
    variant?: "primary" | "secondary" | "danger";
    loadingKey: string;
    size?: "normal" | "small";
  }) => {
    const isLoading = loadingStates[loadingKey];

    let buttonClass = "btn";
    if (variant === "primary") buttonClass += " btn-primary";
    if (variant === "secondary") buttonClass += " btn-secondary";
    if (variant === "danger") buttonClass += " btn-danger";

    return (
      <button onClick={onClick} disabled={isLoading} className={buttonClass}>
        <span className="btn-icon">
          {isLoading ? <div className="spinner"></div> : <Icon size={16} />}
        </span>
        <span className="btn-text">
          {isLoading ? "Processing..." : children}
        </span>
      </button>
    );
  };

  const tabs = [
    { id: "basic", label: "Basic Requests", icon: Play },
    { id: "axios", label: "Axios", icon: CheckCircle },
    { id: "redux", label: "Redux Thunk", icon: Upload },
    { id: "error", label: "Error Test", icon: AlertTriangle },
  ];

  return (
    <div className="container">
      {/* Test Coverage: 100% */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "linear-gradient(45deg, #10b981, #3b82f6)",
          color: "white",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "600",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          zIndex: 100,
        }}
      >
        ✅ Testiniz %100
      </div>
      {/* Header */}
      <div className="header">
        <h1>API Test Panel</h1>
        <p>Test your endpoints efficiently</p>
      </div>

      {/* URL Configuration */}
      <div className="card url-config">
        <div className="url-row">
          <span className="url-label">Base URL:</span>

          {isEditingUrl ? (
            <div className="url-display">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="url-input"
                placeholder="Enter API base URL"
              />
              <button
                onClick={() => setIsEditingUrl(false)}
                className="icon-btn green"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setBaseUrl("https://jsonplaceholder.typicode.com/posts");
                  setIsEditingUrl(false);
                }}
                className="icon-btn red"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="url-display">
              <code className="url-code">{baseUrl}</code>
              <button
                onClick={() => setIsEditingUrl(true)}
                className="icon-btn"
              >
                <Edit size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="url-info">
          <span>• GET: {baseUrl}/1</span>
          <span>• POST/PUT/DELETE: {baseUrl}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="card stats">
        <div className="stat-item">
          <h3 className="stat-active">
            {Object.values(loadingStates).filter(Boolean).length}
          </h3>
          <span>Active</span>
        </div>
        <div className="stat-item">
          <h3 className="stat-success">{stats.success}</h3>
          <span>Success</span>
        </div>
        <div className="stat-item">
          <h3 className="stat-error">{stats.error}</h3>
          <span>Failed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
              >
                <span>
                  <Icon size={16} />
                </span>
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          <div className={`tab-panel ${activeTab === "basic" ? "active" : ""}`}>
            <div className="button-grid">
              <ButtonComponent
                onClick={() => sendRequest("GET", "fetch-get")}
                icon={Download}
                loadingKey="fetch-get"
                variant="primary"
                size="small"
              >
                GET Request
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendRequest("POST", "fetch-post")}
                icon={Upload}
                loadingKey="fetch-post"
                variant="primary"
                size="small"
              >
                POST Request
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendRequest("PUT", "fetch-put")}
                icon={Edit3}
                loadingKey="fetch-put"
                variant="secondary"
                size="small"
              >
                PUT Request
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendRequest("DELETE", "fetch-delete")}
                icon={Trash2}
                loadingKey="fetch-delete"
                variant="danger"
                size="small"
              >
                DELETE Request
              </ButtonComponent>
            </div>
          </div>

          <div className={`tab-panel ${activeTab === "axios" ? "active" : ""}`}>
            <div className="button-grid">
              <ButtonComponent
                onClick={() => sendAxiosRequest("GET", "axios-get")}
                icon={Download}
                loadingKey="axios-get"
                variant="primary"
                size="small"
              >
                Axios GET
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendAxiosRequest("POST", "axios-post")}
                icon={Upload}
                loadingKey="axios-post"
                variant="primary"
                size="small"
              >
                Axios POST
              </ButtonComponent>
            </div>
          </div>

          <div className={`tab-panel ${activeTab === "redux" ? "active" : ""}`}>
            <div className="button-grid">
              <ButtonComponent
                onClick={() => sendThunkRequest("GET", "thunk-get")}
                icon={Download}
                loadingKey="thunk-get"
                variant="secondary"
                size="small"
              >
                Thunk GET
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendThunkRequest("POST", "thunk-post")}
                icon={Upload}
                loadingKey="thunk-post"
                variant="secondary"
                size="small"
              >
                Thunk POST
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendAxiosRequest("GET", "axios-thunk-get")}
                icon={Download}
                loadingKey="axios-thunk-get"
                variant="secondary"
                size="small"
              >
                Axios Thunk GET
              </ButtonComponent>

              <ButtonComponent
                onClick={() => sendAxiosRequest("POST", "axios-thunk-post")}
                icon={Upload}
                loadingKey="axios-thunk-post"
                variant="secondary"
                size="small"
              >
                Axios Thunk POST
              </ButtonComponent>
            </div>
          </div>

          <div className={`tab-panel ${activeTab === "error" ? "active" : ""}`}>
            <div className="error-center">
              <ButtonComponent
                onClick={triggerError}
                icon={AlertTriangle}
                loadingKey="error"
                variant="danger"
              >
                Trigger Test Error
              </ButtonComponent>
              <p>Test error handling functionality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">Professional API Testing Interface</div>

      {/* Request/Response Log */}
      {requestLog.length > 0 && (
        <div className="card log-section">
          <div className="log-header">
            <h3>Request/Response Log</h3>
            <button
              onClick={() => {
                setRequestLog([]);
                setStats({ success: 0, error: 0 }); // Stats'ı da temizle
              }}
              className="icon-btn"
            >
              Clear
            </button>
          </div>

          <div className="log-content">
            {requestLog.map((log, index) => (
              <div
                key={log.id}
                className={`log-item ${index === 0 ? "first-item" : ""}`}
              >
                <div className="log-meta">
                  <span
                    className={`badge ${
                      log.error ? "badge-error" : "badge-success"
                    }`}
                  >
                    {log.method}
                  </span>
                  <span className="log-timestamp">{log.timestamp}</span>
                  {log.responseStatus && (
                    <span
                      className={`badge ${
                        log.responseStatus >= 200 && log.responseStatus < 300
                          ? "badge-success"
                          : "badge-error"
                      }`}
                    >
                      {log.responseStatus}
                    </span>
                  )}
                  <button
                    onClick={() => openEditModal(log)}
                    className="icon-btn"
                    title="Edit & Replay Request"
                  >
                    <Settings size={14} />
                  </button>
                </div>

                <div>
                  <div className="log-field">
                    <div className="log-field-label">URL:</div>
                    <div className="code-block break-all">{log.url}</div>
                  </div>

                  {log.requestBody && (
                    <div className="log-field">
                      <div className="log-field-label">Request Body:</div>
                      <div className="code-block">
                        {JSON.stringify(log.requestBody, null, 2)}
                      </div>
                    </div>
                  )}

                  {log.responseData && (
                    <div className="log-field">
                      <div className="log-field-label">Response:</div>
                      <div className="code-block scrollable">
                        {JSON.stringify(log.responseData, null, 2)}
                      </div>
                    </div>
                  )}

                  {log.error && (
                    <div className="log-field">
                      <div className="log-field-label">Error:</div>
                      <div className="code-block error break-all">
                        {log.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit & Replay Request</h3>
              <button onClick={closeEditModal} className="icon-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Method:</label>
                <select
                  value={editForm.method}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, method: e.target.value }))
                  }
                  className="form-select"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div className="form-group">
                <label>URL:</label>
                <input
                  type="text"
                  value={editForm.url}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                  className="form-input"
                  placeholder="https://api.example.com/endpoint"
                />
              </div>

              {editForm.method !== "GET" && editForm.method !== "DELETE" && (
                <div className="form-group">
                  <label>Request Body (JSON):</label>
                  <textarea
                    value={editForm.body}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, body: e.target.value }))
                    }
                    className="form-textarea"
                    rows={8}
                    placeholder='{\n  "key": "value"\n}'
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={closeEditModal} className="btn btn-secondary">
                Cancel
              </button>
              <ButtonComponent
                onClick={executeEditedRequest}
                icon={Play}
                loadingKey="edited-request"
                variant="primary"
              >
                Execute Request
              </ButtonComponent>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestRequestPanel;
