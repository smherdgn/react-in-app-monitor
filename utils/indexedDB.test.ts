
import { openMonitoringDB, addLogEntryToDB, getAllLogsFromDB, clearAllLogsFromDB } from './indexedDB';
import { DB_CONFIG, MAX_LOG_ENTRIES } from '../constants';
import { LogEntry, LogEntryType, PageViewLogData } from '../types';
import { describe, it, expect, beforeEach, mockIndexedDB, mockFn, afterEach, jest as customJest, MockFunction } from '../test-utils/test-helpers'; 

// Helper to simulate async IDBRequest success/error
const simulateRequestEvent = (request: IDBRequest, eventType: 'success' | 'error', eventData?: any) => {
  const event = new Event(eventType);
  Object.defineProperty(event, 'target', { value: request, writable: false, configurable: true });

  if (eventType === 'success') {
    Object.defineProperty(request, 'result', { value: eventData !== undefined ? eventData : (request as any)._result, writable: true, configurable: true });
    if (typeof request.onsuccess === 'function') {
      request.onsuccess(event);
    }
  } else {
    Object.defineProperty(request, 'error', { value: eventData || new DOMException("Test Error", "ErrorName"), writable: true, configurable: true });
    if (typeof request.onerror === 'function') {
      request.onerror(event);
    }
  }
};

interface MockIDBRequest<T = any> extends IDBRequest<T> {
    _result?: T;
    _error?: DOMException;
}


describe('IndexedDB Utils', () => {
  let mockIDB: ReturnType<typeof mockIndexedDB>;
  let mockDbInstance: IDBDatabase;
  let consoleErrorSpy: MockFunction<(...args: any[]) => void>;
  let mockTransaction: IDBTransaction;
  let mockStore: {
    add: MockFunction<(value: any, key?: IDBValidKey | undefined) => IDBRequest<IDBValidKey>>;
    getAll: MockFunction<() => IDBRequest<any[]>>;
    clear: MockFunction<() => IDBRequest<undefined>>;
    count: MockFunction<(query?: IDBValidKey | IDBKeyRange | undefined) => IDBRequest<number>>;
    index: MockFunction<(name: string) => IDBIndex>;
    delete: MockFunction<(key: IDBValidKey | IDBKeyRange) => IDBRequest<undefined>>;
    // ... other store methods if needed
  };

  beforeEach(() => {
    mockIDB = mockIndexedDB();
    consoleErrorSpy = customJest.spyOn(console, 'error') as MockFunction<(...args: any[]) => void>;
    consoleErrorSpy.mock.mockImplementation(() => {});

    mockStore = {
        add: mockFn((value: any, key?: IDBValidKey | undefined): IDBRequest<IDBValidKey> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn() } as unknown as MockIDBRequest<IDBValidKey>;
            setTimeout(() => simulateRequestEvent(req, 'success'), 0);
            return req;
        }),
        getAll: mockFn((): IDBRequest<any[]> => {
            const req = { onsuccess: null, onerror: null, result: [], dispatchEvent: mockFn() } as unknown as MockIDBRequest<any[]>;
            req._result = [];
            setTimeout(() => simulateRequestEvent(req, 'success', []), 0);
            return req;
        }),
        clear: mockFn((): IDBRequest<undefined> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn() } as unknown as MockIDBRequest<undefined>;
            setTimeout(() => simulateRequestEvent(req, 'success'), 0);
            return req;
        }),
        count: mockFn((query?: IDBValidKey | IDBKeyRange | undefined): IDBRequest<number> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn(), _result: 0 } as unknown as MockIDBRequest<number>;
            setTimeout(() => simulateRequestEvent(req, 'success', 0), 0); // Default to 0 count
            return req;
        }),
        index: mockFn((name: string): IDBIndex => ({
            name: name,
            objectStore: mockStore as unknown as IDBObjectStore,
            keyPath: 'timestamp',
            multiEntry: false,
            unique: false,
            openCursor: mockFn((query?: IDBValidKey | IDBKeyRange | null | undefined, direction?: IDBCursorDirection | undefined): IDBRequest<IDBCursorWithValue | null> => {
                const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn(), _result: null } as unknown as MockIDBRequest<IDBCursorWithValue | null>;
                 // Simulate finding no items by default for cursor
                setTimeout(() => simulateRequestEvent(req, 'success', null), 0);
                return req;
            }),
            // Implement other IDBIndex methods if needed
        } as unknown as IDBIndex)),
        delete: mockFn((key: IDBValidKey | IDBKeyRange): IDBRequest<undefined> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn() } as unknown as MockIDBRequest<undefined>;
            setTimeout(() => simulateRequestEvent(req, 'success'), 0);
            return req;
        }),
    };
    
    mockTransaction = {
        objectStore: mockFn(() => mockStore as unknown as IDBObjectStore),
        commit: mockFn(),
        abort: mockFn(),
        db: {} as IDBDatabase,
        error: null,
        mode: 'readwrite',
        objectStoreNames: { contains: () => true } as DOMStringList,
        onabort: null,
        oncomplete: null,
        onerror: null,
        addEventListener: mockFn(),
        removeEventListener: mockFn(),
        dispatchEvent: mockFn(() => true),
    } as unknown as IDBTransaction;

    mockDbInstance = {
      name: DB_CONFIG.dbName,
      version: DB_CONFIG.version,
      objectStoreNames: { contains: mockFn(() => true ), length: 1, item: mockFn(() => DB_CONFIG.storeName) } as unknown as DOMStringList,
      createObjectStore: mockFn(() => ({ createIndex: mockFn() }) as unknown as IDBObjectStore),
      deleteObjectStore: mockFn(),
      transaction: mockFn(() => mockTransaction),
      close: mockFn(),
      onabort: null,
      onclose: null,
      onerror: null,
      onversionchange: null,
      addEventListener: mockFn(),
      