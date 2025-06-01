import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BaseLog,
  PageRouteLog,
  ComponentMetricLog,
  ApiCallLog,
  ErrorLog,
  AnyLog,
  StorageKey,
  TabKey,
  AllLogsState,
  MonitoringSettings,
  TimelineEvent,
} from "./types";
import {
  garantiBlue,
  garantiGreen,
  garantiOrange,
  garantiRed,
  garantiMediumGray,
  timelineApiColor,
  timelineComponentColor,
  timelineErrorColor,
  timelineRouteColor,
  garantiDarkGray,
} from "./styles.tsx"; // Added garantiDarkGray
import MonitoringService from "./MonitoringService";

// --- UI COMPONENTS (including new TimelineChart) ---

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  barColor?: string;
  title: string;
}
const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  width = 500,
  height = 300,
  barColor = garantiGreen,
  title,
}) => {
  if (!data || data.length === 0)
    return (
      <div style={{ padding: "20px", textAlign: "center", fontSize: "0.9em" }}>
        No data available for {title}.
      </div>
    );
  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((d) => d.value), 0);
  if (maxValue === 0 && data.every((d) => d.value <= 0))
    return (
      <div style={{ padding: "20px", textAlign: "center", fontSize: "0.9em" }}>
        Data for {title} contains only zero or negative values.
      </div>
    );
  const barWidth = Math.max(1, (chartWidth / data.length) * 0.8);
  const barSpacing = (chartWidth / data.length) * 0.2;
  const yTicksCount = 5;
  const yTicks =
    maxValue > 0
      ? Array.from(
          { length: yTicksCount },
          (_, i) => maxValue * (i / (yTicksCount - 1))
        )
      : [0];
  return (
    <div className="svg-chart-container">
      <h3>{title}</h3>
      <svg
        width={width}
        height={height}
        aria-label={title}
        role="img"
        tabIndex={0}
        style={{ maxWidth: "100%" }}
      >
        <title id={`${title.replace(/\s+/g, "-")}-title`}>{title}</title>
        <desc id={`${title.replace(/\s+/g, "-")}-desc`}>
          Bar chart showing {title.toLowerCase()}. X-axis represents categories,
          Y-axis represents values.
        </desc>
        <g
          transform={`translate(${padding.left}, ${padding.top})`}
          aria-labelledby={`${title.replace(/\s+/g, "-")}-title`}
          aria-describedby={`${title.replace(/\s+/g, "-")}-desc`}
        >
          {yTicks.map((tickValue) => (
            <g
              key={`y-tick-${tickValue}`}
              transform={`translate(0, ${
                chartHeight - (tickValue / (maxValue || 1)) * chartHeight
              })`}
            >
              <line x1="-5" x2="0" y1="0" y2="0" stroke={garantiMediumGray} />
              <text
                x="-10"
                y="5"
                textAnchor="end"
                fontSize="10px"
                fill={garantiMediumGray}
              >
                {tickValue.toFixed(
                  maxValue > 0 &&
                    maxValue < 10 &&
                    maxValue !== Math.floor(maxValue)
                    ? 1
                    : 0
                )}
              </text>
            </g>
          ))}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={chartHeight}
            stroke={garantiMediumGray}
            aria-hidden="true"
          />
          <line
            x1="0"
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke={garantiMediumGray}
            aria-hidden="true"
          />
          {data.map((d, i) => {
            const barHeightValue = d.value >= 0 ? d.value : 0;
            const barHeight = (barHeightValue / (maxValue || 1)) * chartHeight;
            const x = i * (barWidth + barSpacing);
            const y = chartHeight - barHeight;
            return (
              <g
                key={d.label}
                role="listitem"
                aria-label={`${d.label}, value ${d.value.toFixed(2)}`}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(0, barHeight)}
                  fill={barColor}
                >
                  <title>{`${d.label}: ${d.value.toFixed(2)}`}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  fontSize="10px"
                  fill={garantiMediumGray}
                >
                  {d.label.length > 10
                    ? d.label.substring(0, 7) + "..."
                    : d.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

interface TimelineChartProps {
  events: TimelineEvent[];
  width?: number;
  height?: number;
  onEventClick: (event: AnyLog) => void;
  title: string;
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  events,
  width = 800,
  height = 150,
  onEventClick,
  title,
}) => {
  const [tooltip, setTooltip] = useState<{
    content: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!events || events.length === 0)
    return (
      <div style={{ padding: "20px", textAlign: "center", fontSize: "0.9em" }}>
        No timeline data available for {title}.
      </div>
    );

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minTimestamp = Math.min(...events.map((e) => e.timestamp));
  const maxTimestamp = Math.max(...events.map((e) => e.timestamp));
  const timeSpan = maxTimestamp - minTimestamp;

  const getEventColor = (eventType: TimelineEvent["eventType"]) => {
    switch (eventType) {
      case "Component Metric":
        return timelineComponentColor;
      case "API Call":
        return timelineApiColor;
      case "Error Log":
        return timelineErrorColor;
      case "Page Route":
        return timelineRouteColor;
      default:
        return garantiMediumGray;
    }
  };

  const timeScale = (timestamp: number) => {
    if (timeSpan === 0) return 0;
    return ((timestamp - minTimestamp) / timeSpan) * chartWidth;
  };

  const handleMouseEnter = (
    event: React.MouseEvent<SVGGElement>,
    timelineEvent: TimelineEvent,
    svgElement: SVGSVGElement | null
  ) => {
    if (!svgElement) return;
    const svgRect = svgElement.getBoundingClientRect();
    const x = event.clientX - svgRect.left + 15;
    const y = event.clientY - svgRect.top - 30;

    let details = "";
    const { originalLog } = timelineEvent;
    if (originalLog.type === "api_call") {
      details = `\nURL: ${originalLog.url.substring(0, 50)}${
        originalLog.url.length > 50 ? "..." : ""
      }\nStatus: ${originalLog.status} (${
        originalLog.statusCode || "N/A"
      })\nDuration: ${originalLog.duration.toFixed(2)}ms`;
    } else if (originalLog.type === "component_metric") {
      details = `\nComponent: ${originalLog.componentName}\nMetric: ${
        originalLog.metricName
      }\nDuration: ${originalLog.duration.toFixed(2)}ms`;
    } else if (originalLog.type === "error") {
      details = `\nMessage: ${originalLog.message.substring(0, 70)}${
        originalLog.message.length > 70 ? "..." : ""
      }`;
      if (originalLog.source)
        details += `\nSource: ${originalLog.source.substring(
          originalLog.source.lastIndexOf("/") + 1
        )}`;
    } else if (originalLog.type === "page_route") {
      details = `\nPath: ${originalLog.path}`;
    }

    setTooltip({
      content: `${timelineEvent.eventType}: ${
        timelineEvent.summary
      }\nTime: ${new Date(timelineEvent.timestamp).toLocaleString()}${details}`,
      x: x,
      y: y,
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => (prev ? { ...prev, visible: false } : null));
  };

  const laneHeight = chartHeight / Math.max(1, events.length);
  const eventMarkerRadius = Math.max(2, Math.min(5, laneHeight * 0.25));
  const labelFontSize = Math.max(8, Math.min(10, laneHeight * 0.3));

  const timeTicksCount = Math.max(2, Math.min(5, Math.floor(chartWidth / 100))); // Responsive ticks
  const timeTicks =
    timeSpan > 0
      ? Array.from(
          { length: timeTicksCount },
          (_, i) => minTimestamp + (timeSpan / (timeTicksCount - 1)) * i
        )
      : [minTimestamp];

  return (
    <div className="svg-chart-container" style={{ position: "relative" }}>
      <h3>{title}</h3>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        aria-label={title}
        role="img"
        tabIndex={0}
        className="timeline-chart-svg"
        style={{ maxWidth: "100%" }}
      >
        <title id={`${title.replace(/\s+/g, "-")}-timeline-title`}>
          {title}
        </title>
        <desc id={`${title.replace(/\s+/g, "-")}-timeline-desc`}>
          Timeline chart showing events. X-axis represents time.
        </desc>
        <g
          className="timeline-axis"
          transform={`translate(${padding.left}, ${padding.top + chartHeight})`}
        >
          <line
            x1="0"
            y1="0"
            x2={chartWidth}
            y2="0"
            stroke={garantiMediumGray}
          />
          {timeTicks.map((tick, i) => (
            <g
              key={`time-tick-${i}`}
              transform={`translate(${timeScale(tick)}, 0)`}
            >
              <line y1="0" y2="5" stroke={garantiMediumGray} />
              <text
                y="15"
                textAnchor="middle"
                fontSize="9px"
                fill={garantiMediumGray}
              >
                {new Date(tick).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </text>
            </g>
          ))}
        </g>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {events.map((event, index) => {
            const xPos = timeScale(event.timestamp);
            const yLaneCenter = laneHeight * index + laneHeight / 2;
            const color = getEventColor(event.eventType);
            return (
              <g
                key={event.id}
                className="timeline-event-item"
                onClick={() => onEventClick(event.originalLog)}
                onMouseEnter={(e) => handleMouseEnter(e, event, svgRef.current)}
                onMouseLeave={handleMouseLeave}
                aria-label={`${event.eventType}: ${event.summary} at ${new Date(
                  event.timestamp
                ).toLocaleString()}`}
              >
                <circle
                  cx={xPos}
                  cy={yLaneCenter}
                  r={eventMarkerRadius}
                  fill={color}
                  className="timeline-event-marker"
                />
                <text
                  x={xPos + eventMarkerRadius + 4}
                  y={yLaneCenter}
                  fontSize={labelFontSize}
                  fill={garantiDarkGray}
                  dominantBaseline="middle"
                  textAnchor="start"
                  className="timeline-event-label"
                >
                  {event.summary.substring(0, Math.floor(chartWidth / 20))}
                  {event.summary.length > Math.floor(chartWidth / 20)
                    ? "..."
                    : ""}{" "}
                  {/* Dynamic substring length */}
                </text>
                <title>{`${event.eventType}: ${event.summary}\n${new Date(
                  event.timestamp
                ).toLocaleString()}`}</title>{" "}
                {/* SVG native tooltip */}
              </g>
            );
          })}
        </g>
      </svg>
      {tooltip && (
        <div
          className="timeline-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            opacity: tooltip.visible ? 1 : 0,
          }}
        >
          {/* Pre-wrap to respect newlines in tooltip content */}
          <pre
            style={{ margin: 0, fontFamily: "inherit", fontSize: "inherit" }}
          >
            {tooltip.content}
          </pre>
        </div>
      )}
    </div>
  );
};

interface LogTableProps<T extends BaseLog> {
  title?: string;
  logs: T[];
  columns: Array<{
    key: keyof T | string;
    header: string;
    render?: (log: T) => React.ReactNode;
  }>;
  onRowClick?: (log: T) => void;
}
const LogTable = <T extends BaseLog>({
  title,
  logs,
  columns,
  onRowClick,
}: LogTableProps<T>) => {
  if (!logs || logs.length === 0)
    return (
      <p style={{ padding: "20px", textAlign: "center", fontSize: "0.9em" }}>
        No {title ? title.toLowerCase() : "logs"} available.
      </p>
    );
  return (
    <div>
      {title && (
        <h3
          style={{
            fontSize: "1.1em",
            color: garantiBlue,
            marginTop: "20px",
            marginBottom: "10px",
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ overflowX: "auto" }}>
        {" "}
        {/* Wrapper for horizontal scroll on small screens */}
        <table className="log-table" aria-label={title || "Log data table"}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} scope="col">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs
              .slice()
              .reverse()
              .map((log) => {
                // Show newest first
                const anyLog = log as unknown as AnyLog;

                return (
                  <tr
                    key={log.id}
                    onClick={() => onRowClick?.(log)}
                    style={onRowClick ? { cursor: "pointer" } : {}}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => e.key === "Enter" && onRowClick(log)
                        : undefined
                    }
                  >
                    {columns.map((col) => {
                      let cellClassName = "";
                      if (String(col.key) === "status") {
                        if (anyLog.type === "api_call") {
                          const currentApiLog = anyLog as ApiCallLog;
                          if (currentApiLog.status === "failure")
                            cellClassName = "error";
                          else if (currentApiLog.status === "success")
                            cellClassName = "success";
                        }
                      }
                      return (
                        <td key={String(col.key)} className={cellClassName}>
                          {col.render
                            ? col.render(log)
                            : String(log[col.key as keyof T] ?? "")}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface LogDetailModalProps {
  log: AnyLog | null;
  onClose: () => void;
}
const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
  if (!log) return null;
  const renderLogDetails = () =>
    Object.entries(log).map(([key, value]) => {
      if (key === "id" || key === "sessionId" || key === "originalLog")
        return null;
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      )
        return null;
      let displayValue: React.ReactNode = String(value);
      if (key === "timestamp")
        displayValue = new Date(value as number).toLocaleString();
      else if (key === "duration" && typeof value === "number")
        displayValue = `${value.toFixed(3)} ms`;
      else if (key === "stack" || key === "errorObject")
        displayValue = <pre>{String(value)}</pre>;
      else if (typeof value === "object")
        displayValue = <pre>{JSON.stringify(value, null, 2)}</pre>;
      return (
        <p key={key}>
          <strong>
            {key.charAt(0).toUpperCase() +
              key.slice(1).replace(/([A-Z])/g, " $1")}
            :{" "}
          </strong>
          {displayValue}
        </p>
      );
    });
  const logTitleType = (log.type || "Event").replace(/_/g, " ").toUpperCase();
  return (
    <div
      className="log-detail-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logDetailModalTitle"
    >
      <div
        className="log-detail-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="logDetailModalTitle">Log Detail: {logTitleType}</h3>
        {renderLogDetails()}
        <button
          className="log-detail-modal-close-button"
          onClick={onClose}
          aria-label="Close log detail modal"
        >
          Close
        </button>
      </div>
    </div>
  );
};

interface TabViewProps {
  logs: AllLogsState;
  setActiveTab: (tab: TabKey) => void;
  setSelectedLogDetail: (log: AnyLog | null) => void;
  setSelectedPageRoutePath?: (path: string) => void;
}

const OverviewView: React.FC<TabViewProps> = ({ logs, setActiveTab }) => {
  const totalApiCalls = logs.api.length;
  const successfulApiCalls = logs.api.filter(
    (log) => log.status === "success"
  ).length;
  const apiSuccessRate =
    totalApiCalls > 0 ? (successfulApiCalls / totalApiCalls) * 100 : 0;
  const avgApiDuration =
    totalApiCalls > 0
      ? logs.api.reduce((sum, log) => sum + log.duration, 0) / totalApiCalls
      : 0;
  const componentMounts = logs.components.filter(
    (c) => c.metricName === "mount"
  );
  const avgMountTime =
    componentMounts.length > 0
      ? componentMounts.reduce((sum, log) => sum + log.duration, 0) /
        componentMounts.length
      : 0;

  const componentMetricsData = Object.values(
    logs.components.reduce((acc, curr) => {
      if (!acc[curr.componentName])
        acc[curr.componentName] = {
          name: curr.componentName,
          mounts: 0,
          mountTime: 0,
          renders: 0,
          renderTime: 0,
          totalDuration: 0,
          count: 0,
        };
      acc[curr.componentName].totalDuration += curr.duration;
      acc[curr.componentName].count++;
      if (curr.metricName === "mount") {
        acc[curr.componentName].mounts++;
        acc[curr.componentName].mountTime += curr.duration;
      }
      if (curr.metricName === "render") {
        acc[curr.componentName].renders++;
        acc[curr.componentName].renderTime += curr.duration;
      }
      return acc;
    }, {} as Record<string, { name: string; mounts: number; mountTime: number; renders: number; renderTime: number; totalDuration: number; count: number }>)
  ).map((c) => ({
    label: c.name,
    value: c.count > 0 ? c.totalDuration / c.count : 0,
  }));

  return (
    <div>
      <h2 style={{ color: garantiBlue, marginBottom: "15px" }}>Overview</h2>
      <div className="overview-grid">
        <div
          className="overview-card"
          style={{ borderColor: garantiBlue }}
          onClick={() => setActiveTab("pages")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("pages")}
        >
          <h3>Page Views</h3>
          <p>{logs.pages.length}</p>
        </div>
        <div
          className="overview-card"
          style={{ borderColor: garantiOrange }}
          onClick={() => setActiveTab("components")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("components")}
        >
          <h3>Total Component Events</h3>
          <p>{logs.components.length}</p>
        </div>
        <div
          className="overview-card"
          style={{ borderColor: garantiGreen }}
          onClick={() => setActiveTab("api")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("api")}
        >
          <h3>API Calls</h3>
          <p>{totalApiCalls}</p>
        </div>
        <div
          className="overview-card"
          style={{ borderColor: garantiRed }}
          onClick={() => setActiveTab("errors")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("errors")}
        >
          <h3>Errors Logged</h3>
          <p>{logs.errors.length}</p>
        </div>
        <div
          className="overview-card"
          style={{ borderColor: "#17A2B8" }}
          onClick={() => setActiveTab("api")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("api")}
        >
          <h3>API Success Rate</h3>
          <p>{apiSuccessRate.toFixed(1)}%</p>
        </div>
        <div
          className="overview-card"
          style={{ borderColor: "#6F42C1" }}
          onClick={() => setActiveTab("api")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("api")}
        >
          <h3>Avg. API Duration</h3>
          <p>{avgApiDuration.toFixed(2)} ms</p>
        </div>
        <div
          className="overview-card"
          style={{ borderColor: "#FFC107" }}
          onClick={() => setActiveTab("components")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTab("components")}
        >
          <h3>Avg. Component Mount</h3>
          <p>{avgMountTime.toFixed(2)} ms</p>
        </div>
      </div>
      <SimpleBarChart
        data={componentMetricsData}
        title="Average Metric Duration per Component (ms)"
        barColor={garantiOrange}
      />
    </div>
  );
};

const pageViewColumns: LogTableProps<PageRouteLog>["columns"] = [
  {
    key: "timestamp",
    header: "Last Visited",
    render: (log) => new Date(log.timestamp).toLocaleString(),
  },
  {
    key: "path",
    header: "Path",
    render: (log) => (
      <span title={log.path}>
        {log.path.length > 60 ? log.path.substring(0, 57) + "..." : log.path}
      </span>
    ),
  },
  { key: "sessionId", header: "Session ID" },
];
const PageViewsView: React.FC<TabViewProps> = ({
  logs,
  setSelectedLogDetail,
  setActiveTab,
  setSelectedPageRoutePath,
}) => {
  const uniquePages = logs.pages.reduce((acc, page) => {
    if (!acc.find((p) => p.path === page.path)) acc.push(page);
    return acc;
  }, [] as PageRouteLog[]);

  return (
    <LogTable
      title="Page Routes"
      logs={uniquePages}
      onRowClick={(log) => {
        if (setSelectedPageRoutePath && setActiveTab) {
          setSelectedPageRoutePath(log.path);
          setActiveTab("pageDetail");
        } else {
          setSelectedLogDetail(log);
        }
      }}
      columns={pageViewColumns}
    />
  );
};

const pageDetailColumns: LogTableProps<TimelineEvent>["columns"] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (log) => {
      const d = new Date(log.timestamp);
      const time = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const ms = String(d.getMilliseconds()).padStart(3, "0");
      return `${time}.${ms}`;
    },
  },
  { key: "eventType", header: "Event Type" },
  {
    key: "summary",
    header: "Summary",
    render: (log) => (
      <span title={log.summary}>
        {log.summary.length > 70
          ? log.summary.substring(0, 67) + "..."
          : log.summary}
      </span>
    ),
  },
];
const PageDetailView: React.FC<TabViewProps & { pageRoutePath: string }> = ({
  logs,
  pageRoutePath,
  setSelectedLogDetail,
  setActiveTab,
}) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const filteredEvents: TimelineEvent[] = [];
    logs.components
      .filter((c) => c.pagePath === pageRoutePath)
      .forEach((c) => {
        filteredEvents.push({
          ...c,
          eventType: "Component Metric",
          summary: `${c.componentName} ${c.metricName} (${c.duration.toFixed(
            2
          )}ms)`,
          originalLog: c,
        });
      });
    logs.api
      .filter((a) => a.pagePath === pageRoutePath)
      .forEach((a) => {
        filteredEvents.push({
          ...a,
          eventType: "API Call",
          summary: `${a.method} ${a.url.substring(0, 50)}... (${a.status})`,
          originalLog: a,
        });
      });
    logs.errors
      .filter((e) => e.pagePath === pageRoutePath)
      .forEach((e) => {
        filteredEvents.push({
          ...e,
          eventType: "Error Log",
          summary:
            e.message.substring(0, 70) + (e.message.length > 70 ? "..." : ""),
          originalLog: e,
        });
      });
    const pageRouteLog = logs.pages.find((p) => p.path === pageRoutePath);
    if (pageRouteLog) {
      filteredEvents.push({
        ...pageRouteLog,
        eventType: "Page Route",
        summary: `Navigated to ${pageRouteLog.path}`,
        originalLog: pageRouteLog,
      });
    }
    filteredEvents.sort((a, b) => a.timestamp - b.timestamp);
    setTimelineEvents(filteredEvents);
  }, [logs, pageRoutePath]);

  return (
    <div>
      <div className="page-detail-header">
        <h2>
          Page Detail:{" "}
          <span
            style={{
              fontWeight: 400,
              color: garantiMediumGray,
              wordBreak: "break-all",
            }}
          >
            {pageRoutePath}
          </span>
        </h2>
        <button onClick={() => setActiveTab("pages")}>Back to Pages</button>
      </div>
      <TimelineChart
        events={timelineEvents}
        onEventClick={(log) => setSelectedLogDetail(log)}
        title={`Event Timeline for ${
          pageRoutePath.substring(pageRoutePath.lastIndexOf("/") + 1) ||
          "Homepage"
        }`}
      />
      <LogTable<TimelineEvent>
        title={`Event List for ${
          pageRoutePath.substring(pageRoutePath.lastIndexOf("/") + 1) ||
          "Homepage"
        }`}
        logs={timelineEvents}
        onRowClick={(log) => setSelectedLogDetail(log.originalLog)}
        columns={pageDetailColumns}
      />
    </div>
  );
};

const componentMetricsColumns: LogTableProps<ComponentMetricLog>["columns"] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (log) => new Date(log.timestamp).toLocaleString(),
  },
  { key: "componentName", header: "Component" },
  { key: "metricName", header: "Metric" },
  {
    key: "duration",
    header: "Duration (ms)",
    render: (log) => log.duration.toFixed(3),
  },
  {
    key: "pagePath",
    header: "Page Path",
    render: (log) => (
      <span title={log.pagePath}>
        {log.pagePath && log.pagePath.length > 40
          ? "..." + log.pagePath.substring(log.pagePath.length - 37)
          : log.pagePath}
      </span>
    ),
  },
];
const ComponentMetricsView: React.FC<TabViewProps> = ({
  logs,
  setSelectedLogDetail,
}) => (
  <LogTable
    title="Component Metrics"
    logs={logs.components}
    onRowClick={setSelectedLogDetail}
    columns={componentMetricsColumns}
  />
);

const apiLogColumns: LogTableProps<ApiCallLog>["columns"] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (log) => new Date(log.timestamp).toLocaleString(),
  },
  { key: "method", header: "Method" },
  {
    key: "url",
    header: "URL",
    render: (log) => (
      <span title={log.url}>
        {log.url.length > 40 ? log.url.substring(0, 37) + "..." : log.url}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (log) => (
      <span className={log.status === "success" ? "success" : "error"}>
        {log.status} ({log.statusCode})
      </span>
    ),
  },
  {
    key: "duration",
    header: "Duration (ms)",
    render: (log) => log.duration.toFixed(3),
  },
  {
    key: "pagePath",
    header: "Page Path",
    render: (log) => (
      <span title={log.pagePath}>
        {log.pagePath && log.pagePath.length > 40
          ? "..." + log.pagePath.substring(log.pagePath.length - 37)
          : log.pagePath}
      </span>
    ),
  },
];
const ApiLogView: React.FC<TabViewProps> = ({ logs, setSelectedLogDetail }) => (
  <LogTable
    title="API Calls"
    logs={logs.api}
    onRowClick={setSelectedLogDetail}
    columns={apiLogColumns}
  />
);

const errorLogColumns: LogTableProps<ErrorLog>["columns"] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (log) => new Date(log.timestamp).toLocaleString(),
  },
  {
    key: "message",
    header: "Message",
    render: (log) => (
      <span title={log.message}>
        {log.message.length > 50
          ? log.message.substring(0, 47) + "..."
          : log.message}
      </span>
    ),
  },
  {
    key: "source",
    header: "Source",
    render: (log) => (
      <span title={log.source}>
        {log.source && log.source.length > 30
          ? "..." + log.source.substring(log.source.length - 27)
          : log.source}
      </span>
    ),
  },
  {
    key: "stack",
    header: "Stack",
    render: (log) =>
      log.stack ? (
        <details>
          <summary>View Stack</summary>
          <div className="error-stack">{log.stack}</div>
        </details>
      ) : (
        "N/A"
      ),
  },
  {
    key: "pagePath",
    header: "Page Path",
    render: (log) => (
      <span title={log.pagePath}>
        {log.pagePath && log.pagePath.length > 40
          ? "..." + log.pagePath.substring(log.pagePath.length - 37)
          : log.pagePath}
      </span>
    ),
  },
];
const ErrorLogView: React.FC<TabViewProps> = ({
  logs,
  setSelectedLogDetail,
}) => (
  <LogTable
    title="Error Logs"
    logs={logs.errors}
    onRowClick={setSelectedLogDetail}
    columns={errorLogColumns}
  />
);

const MonitoringDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [logs, setLogs] = useState<AllLogsState>({
    pages: [],
    components: [],
    api: [],
    errors: [],
  });
  const [selectedLogDetail, setSelectedLogDetail] = useState<AnyLog | null>(
    null
  );
  const [selectedPageRoutePath, setSelectedPageRoutePath] = useState<
    string | null
  >(null);
  const [isMonitoringActiveState, setIsMonitoringActiveState] = useState(
    MonitoringService.getIsMonitoringActive()
  );

  const fetchAllLogs = useCallback(() => {
    setLogs({
      pages: MonitoringService.readStorage<PageRouteLog>(StorageKey.PAGES),
      components: MonitoringService.readStorage<ComponentMetricLog>(
        StorageKey.COMPONENTS
      ),
      api: MonitoringService.readStorage<ApiCallLog>(StorageKey.API),
      errors: MonitoringService.readStorage<ErrorLog>(StorageKey.ERRORS),
    });
  }, []);

  useEffect(() => {
    fetchAllLogs();
    const intervalId = setInterval(fetchAllLogs, 2000);
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith("monitoring.")) fetchAllLogs();
    };
    const handleCustomEvents = () => fetchAllLogs();
    const handleStatusChange = (event: Event) =>
      setIsMonitoringActiveState((event as CustomEvent).detail.isActive);

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("monitoring-log-added", handleCustomEvents);
    window.addEventListener("monitoring-cleared", handleCustomEvents);
    window.addEventListener("monitoring-status-changed", handleStatusChange);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("monitoring-log-added", handleCustomEvents);
      window.removeEventListener("monitoring-cleared", handleCustomEvents);
      window.removeEventListener(
        "monitoring-status-changed",
        handleStatusChange
      );
    };
  }, [fetchAllLogs]);

  const handleToggleMonitoring = () => {
    if (isMonitoringActiveState) MonitoringService.stopMonitoring();
    else MonitoringService.startMonitoring();
  };
  const handleClearAllLogs = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all monitoring logs (except settings)?"
      )
    ) {
      MonitoringService.clearStorageData();
      fetchAllLogs();
    }
  };

  const renderTabContent = () => {
    const props = {
      logs,
      setActiveTab,
      setSelectedLogDetail,
      setSelectedPageRoutePath,
    };
    switch (activeTab) {
      case "overview":
        return <OverviewView {...props} />;
      case "pages":
        return <PageViewsView {...props} />;
      case "pageDetail":
        return selectedPageRoutePath ? (
          <PageDetailView {...props} pageRoutePath={selectedPageRoutePath} />
        ) : (
          <p>No page selected. Go to 'Pages' tab to select one.</p>
        );
      case "components":
        return <ComponentMetricsView {...props} />;
      case "api":
        return <ApiLogView {...props} />;
      case "errors":
        return <ErrorLogView {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="monitoring-dashboard">
      <header className="dashboard-header">
        <h1>React In-App Monitor</h1>
        <div className="dashboard-controls">
          <button
            onClick={handleToggleMonitoring}
            className="monitoring-toggle"
          >
            {isMonitoringActiveState ? "Stop" : "Start"} Monitoring
          </button>
          <button onClick={fetchAllLogs} className="refresh">
            Refresh Now
          </button>
          <button onClick={handleClearAllLogs}>Clear Logs</button>
        </div>
      </header>
      <nav className="dashboard-nav">
        {(
          ["overview", "pages", "components", "api", "errors"] as Exclude<
            TabKey,
            "pageDetail"
          >[]
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedPageRoutePath(null);
            }}
            className={activeTab === tab ? "active" : ""}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      <main className="dashboard-content">{renderTabContent()}</main>
      <LogDetailModal
        log={selectedLogDetail}
        onClose={() => setSelectedLogDetail(null)}
      />
    </div>
  );
};

export default MonitoringDashboard;
