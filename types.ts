// types.ts

export interface BaseLog {
  id: string;
  timestamp: number;
  sessionId: string;
  pagePath?: string; // Path of the page when this log was created
}

export interface PageRouteLog extends BaseLog {
  type: 'page_route';
  path: string; // This is the primary identifier for a page view
}

export interface ComponentMetricLog extends BaseLog {
  type: 'component_metric';
  componentName: string;
  metricName: 'mount' | 'render' | 'unmount';
  duration: number; // milliseconds
}

export interface ApiCallLog extends BaseLog {
  type: 'api_call';
  url: string;
  method: string;
  duration: number; // milliseconds
  status: 'success' | 'failure';
  statusCode?: number;
}

export interface ErrorLog extends BaseLog {
  type: 'error';
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  errorObject?: string; // Stringified error object
  stack?: string;
}

export type AnyLog = PageRouteLog | ComponentMetricLog | ApiCallLog | ErrorLog;

export enum StorageKey {
  PAGES = 'monitoring.pages',
  COMPONENTS = 'monitoring.components',
  API = 'monitoring.api',
  ERRORS = 'monitoring.errors',
  SETTINGS = 'monitoring.settings', // For monitoring status (on/off)
}

// Represents the different views in the monitoring dashboard
export type TabKey = 'overview' | 'pages' | 'components' | 'api' | 'errors' | 'pageDetail';

export interface AllLogsState {
  pages: PageRouteLog[];
  components: ComponentMetricLog[];
  api: ApiCallLog[];
  errors: ErrorLog[];
}

export interface MonitoringSettings {
  isMonitoringActive: boolean;
}

// For the combined timeline view on the page detail screen
export interface TimelineEvent extends BaseLog {
  eventType: 'Component Metric' | 'API Call' | 'Error Log' | 'Page Route';
  summary: string; // A brief description of the event
  originalLog: AnyLog; // The original log entry for detailed view
}
