
import { DB_CONFIG, MAX_LOG_ENTRIES } from '../constants';
import { LogEntry } from '../types';

export function openMonitoringDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.dbName, DB_CONFIG.version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
        const store = db.createObjectStore(DB_CONFIG.storeName, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error}`);
    };
  });
}

export async function addLogEntryToDB(db: IDBDatabase, logEntry: LogEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.storeName, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.storeName);
    
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result >= MAX_LOG_ENTRIES) {
        // Trim oldest logs
        const cursorRequest = store.index('timestamp').openCursor(null, 'next');
        let deletedCount = 0;
        const numToDelete = countRequest.result - MAX_LOG_ENTRIES + 1; // +1 for the new entry
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && deletedCount < numToDelete) {
            store.delete(cursor.primaryKey);
            deletedCount++;
            cursor.continue();
          } else {
            putEntry();
          }
        };
        cursorRequest.onerror = (event) => {
            console.error('Error trimming logs:', (event.target as IDBRequest).error);
            putEntry(); // Attempt to add anyway
        };
      } else {
        putEntry();
      }
    };
    countRequest.onerror = (event) => {
        console.error('Error counting logs:', (event.target as IDBRequest).error);
        putEntry(); // Attempt to add anyway
    };

    function putEntry() {
        const addRequest = store.add(logEntry);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = (event) => {
            console.error('Failed to add log entry:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
        };
    }
  });
}

export async function getAllLogsFromDB(db: IDBDatabase): Promise<LogEntry[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.storeName, 'readonly');
    const store = transaction.objectStore(DB_CONFIG.storeName);
    const request = store.getAll();

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest<LogEntry[]>).result.sort((a, b) => b.timestamp - a.timestamp)); // Sort newest first
    };

    request.onerror = (event) => {
      console.error('Failed to get all logs:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function clearAllLogsFromDB(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.storeName, 'readwrite');
    const store = transaction.objectStore(DB_CONFIG.storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Failed to clear logs:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}
