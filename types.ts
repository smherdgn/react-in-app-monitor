export enum LogEntryType {
  PAGE_VIEW = 'PAGE_VIEW',
  API_CALL = 'API_CALL',
  COMPONENT_RENDER = 'COMPONENT_RENDER',
  ERROR = 'ERROR',
  CUSTOM_EVENT = 'CUSTOM_EVENT', // New type
}

export interface BaseLogEntry {
  id: string;
  timestamp: number;
  type: LogEntryType;
}

export interface PageViewLogData {
  path: string;
  referrer?: string;
}
export interface PageViewLog extends BaseLogEntry {
  type: LogEntryType.PAGE_VIEW;
  data: PageViewLogData;
}

export interface ApiCallLogData {
  url: string;
  method: string;
  duration: number;
  statusCode: number;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}
export interface ApiCallLog extends BaseLogEntry {
  type: LogEntryType.API_CALL;
  data: ApiCallLogData;
}

export enum ComponentEventType {
  MOUNT = 'mount',
  UNMOUNT = 'unmount',
  UPDATE = 'update',
}
export interface ComponentRenderLogData {
  componentName: string;
  duration: number; // in ms
  eventType: ComponentEventType;
}
export interface ComponentRenderLog extends BaseLogEntry {
  type: LogEntryType.COMPONENT_RENDER;
  data: ComponentRenderLogData;
}

export interface ErrorLogData {
  message: string;
  stack?: string;
  source: string; // e.g., 'global_error', 'unhandled_rejection', 'api_call_error'
}
export interface ErrorLog extends BaseLogEntry {
  type: LogEntryType.ERROR;
  data: ErrorLogData;
}

// New Log Type for Custom Events
export interface CustomEventLogData {
  eventName: string;
  details?: Record<string, any>;
}
export interface CustomEventLog extends BaseLogEntry {
  type: LogEntryType.CUSTOM_EVENT;
  data: CustomEventLogData;
}

export type LogEntry = PageViewLog | ApiCallLog | ComponentRenderLog | ErrorLog | CustomEventLog;

export interface IDBConfig {
  dbName: string;
  version: number;
  storeName: string;
}

export interface ChartDataItem {
  name: string;
  value: number;
}

export interface TimeChartDataItem {
  time: number; // timestamp
  count: number;
}

export interface PageVisit {
  startTime: number;
  endTime?: number; 
  duration?: number; 
  logIds: string[]; 
}

export interface PageInsight {
  path: string;
  visits: PageVisit[];
  totalVisits: number;
  totalApiCallCount: number;
  totalErrorCount: number;
  totalComponentRenderCount: number;
  avgDuration?: number; 
  firstViewedAt: number;
  lastViewedAt: number;
}

// For Component Performance Hotspots
export interface ComponentPerfStats {
    name: string;
    count: number;
    totalDuration: number;
    avgDuration: number;
}
export interface ComponentPerformanceData {
    byFrequency: ComponentPerfStats[];
    byAvgDuration: ComponentPerfStats[];
}