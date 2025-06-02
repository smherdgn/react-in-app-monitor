
import { IDBConfig } from './types';

export const DB_CONFIG: IDBConfig = {
  dbName: 'InAppMonitoringDB',
  version: 1,
  storeName: 'logs',
};

export const MAX_LOG_ENTRIES = 500; // Max logs to keep in IndexedDB to prevent excessive storage use
export const POLLING_INTERVAL = 5000; // 5 seconds for dashboard data refresh

export const THEME_STORAGE_KEY = 'monitoringToolTheme';
export const MONITORING_STATUS_KEY = 'monitoringToolStatus';
