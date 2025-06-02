
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
  
  interface MockStoreType {
    add: MockFunction<(value: any, key?: IDBValidKey | undefined) => IDBRequest<IDBValidKey>>;
    getAll: MockFunction<() => IDBRequest<any[]>>;
    clear: MockFunction<() => IDBRequest<undefined>>;
    count: MockFunction<(query?: IDBValidKey | IDBKeyRange | undefined) => IDBRequest<number>>;
    index: MockFunction<(name: string) => IDBIndex>;
    delete: MockFunction<(key: IDBValidKey | IDBKeyRange) => IDBRequest<undefined>>;
  }
  let mockStore: MockStoreType;
  
  const mockDomStringList = (containsImpl: () => boolean = () => false): DOMStringList => {
    const items: string[] = [];
    const mockList = {
        length: 0,
        item: mockFn((index: number): string | null => items[index] || null),
        contains: mockFn(containsImpl),
        [Symbol.iterator]: function* (): IterableIterator<string> {
            for (let i = 0; i < mockList.length; i++) {
                // Directly access items array for iterator, or use the mockFn if needed for spying on iteration
                yield items[i]!;
            }
        }
    };
    // Helper to update length for Object.assign
    Object.defineProperty(mockList, 'length', {
        get: () => items.length,
        set: (v) => { /* allow setting if needed by Object.assign's mechanics, though usually it's about properties */ }
    });
    return mockList as unknown as DOMStringList;
  };


  beforeEach(() => {
    mockIDB = mockIndexedDB();
    consoleErrorSpy = customJest.spyOn(console, 'error') as MockFunction<(...args: any[]) => void>;
    consoleErrorSpy.mock.mockImplementation(() => {});

    mockStore = {
        add: mockFn<(value: any, key?: IDBValidKey | undefined) => IDBRequest<IDBValidKey>>((value: any, key?: IDBValidKey | undefined): IDBRequest<IDBValidKey> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn() } as unknown as MockIDBRequest<IDBValidKey>;
            setTimeout(() => simulateRequestEvent(req, 'success'), 0);
            return req;
        }),
        getAll: mockFn<() => IDBRequest<any[]>>((): IDBRequest<any[]> => {
            const req = { onsuccess: null, onerror: null, result: [], dispatchEvent: mockFn() } as unknown as MockIDBRequest<any[]>;
            req._result = [];
            setTimeout(() => simulateRequestEvent(req, 'success', []), 0);
            return req;
        }),
        clear: mockFn<() => IDBRequest<undefined>>((): IDBRequest<undefined> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn() } as unknown as MockIDBRequest<undefined>;
            setTimeout(() => simulateRequestEvent(req, 'success'), 0);
            return req;
        }),
        count: mockFn<(query?: IDBValidKey | IDBKeyRange | undefined) => IDBRequest<number>>((query?: IDBValidKey | IDBKeyRange | undefined): IDBRequest<number> => {
            const req = { onsuccess: null, onerror: null, dispatchEvent: mockFn(), _result: 0 } as unknown as MockIDBRequest<number>;
            setTimeout(() => simulateRequestEvent(req, 'success', 0), 0); // Default to 0 count
            return req;
        }),
        index: mockFn<(name: string) => IDBIndex>((name: string): IDBIndex => ({
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
        } as unknown as IDBIndex)),
        delete: mockFn<(key: IDBValidKey | IDBKeyRange) => IDBRequest<undefined>>((key: IDBValidKey | IDBKeyRange): IDBRequest<undefined> => {
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
        objectStoreNames: Object.assign(mockDomStringList(() => true), {0: DB_CONFIG.storeName, length: 1}),
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
      objectStoreNames: Object.assign(mockDomStringList(() => true), {0: DB_CONFIG.storeName, length: 1}),
      createObjectStore: mockFn(() => ({ createIndex: mockFn() }) as unknown as IDBObjectStore),
      deleteObjectStore: mockFn(),
      transaction: mockFn(() => mockTransaction),
      close: mockFn(),
      onabort: null,
      onclose: null,
      onerror: null,
      onversionchange: null,
      addEventListener: mockFn(),
      removeEventListener: mockFn(),
      dispatchEvent: mockFn(() => true),
    } as unknown as IDBDatabase;
  });

  afterEach(() => {
    consoleErrorSpy.mock.mockRestore?.();
  });

  describe('openMonitoringDB', () => {
    it('should resolve with db instance on success', async () => {
      const openRequest = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDbInstance } as unknown as IDBOpenDBRequest;
      mockIDB.open.mock.mockReturnValueOnce(openRequest);
      
      const promise = openMonitoringDB();
      simulateRequestEvent(openRequest, 'success', mockDbInstance);
      
      await expect(promise).resolves.toBe(mockDbInstance);
      expect(mockIDB.open).toHaveBeenCalledWith(DB_CONFIG.dbName, DB_CONFIG.version);
    });

    it('should reject on open error', async () => {
      const openRequest = { onsuccess: null, onerror: null, onupgradeneeded: null } as unknown as IDBOpenDBRequest;
      const dbError = new DOMException('Open failed');
      mockIDB.open.mock.mockReturnValueOnce(openRequest);
      
      const promise = openMonitoringDB();
      simulateRequestEvent(openRequest, 'error', dbError);
      
      await expect(promise).rejects.toEqual('IndexedDB error: Open failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('IndexedDB error:', dbError);
    });

    it('should create object store on upgradeneeded if not exists', async () => {
      const mockEmptyStoreNames = mockDomStringList(() => false);
      const mockDbWithNoStore = {
        ...mockDbInstance,
        objectStoreNames: mockEmptyStoreNames,
        createObjectStore: mockFn().mockReturnValue({ createIndex: mockFn() }),
      } as unknown as IDBDatabase;


      const openRequest = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDbWithNoStore } as unknown as IDBOpenDBRequest;
      mockIDB.open.mock.mockReturnValueOnce(openRequest);
      
      const promise = openMonitoringDB();
      
      const upgradeEvent = new Event('upgradeneeded') as IDBVersionChangeEvent;
      Object.defineProperty(upgradeEvent, 'target', { value: openRequest, writable: false });
      Object.defineProperty(openRequest, 'result', { value: mockDbWithNoStore, writable: true, configurable: true });

      // Ensure the 'contains' mock on objectStoreNames is correctly configured for this test path
      (mockDbWithNoStore.objectStoreNames.contains as MockFunction<any>).mock.mockReturnValue(false);

      if (openRequest.onupgradeneeded) {
        openRequest.onupgradeneeded(upgradeEvent);
      }
      expect(mockDbWithNoStore.createObjectStore).toHaveBeenCalledWith(DB_CONFIG.storeName, { keyPath: 'id' });
      
      simulateRequestEvent(openRequest, 'success', mockDbWithNoStore);
      await expect(promise).resolves.toBe(mockDbWithNoStore);
    });
  });

  describe('addLogEntryToDB', () => {
    const logEntry: LogEntry = { id: '1', timestamp: Date.now(), type: LogEntryType.PAGE_VIEW, data: { path: '/test' } as PageViewLogData };

    it('should add log entry and resolve on success', async () => {
       const mockCountRequest = { onsuccess: null, onerror: null, _result: 0, dispatchEvent: mockFn() } as unknown as MockIDBRequest<number>;
       mockStore.count.mock.mockReturnValueOnce(mockCountRequest);

      const promise = addLogEntryToDB(mockDbInstance, logEntry);
      simulateRequestEvent(mockCountRequest, 'success', 0); 

      await expect(promise).resolves.toBeUndefined();
      expect(mockStore.add).toHaveBeenCalledWith(logEntry);
    });

    it('should reject on add error', async () => {
      const addError = new DOMException('Add failed');
      const mockAddRequest = { onsuccess: null, onerror: null, dispatchEvent: mockFn(), _error: addError } as unknown as MockIDBRequest<IDBValidKey>;
      mockStore.add.mock.mockReturnValueOnce(mockAddRequest);

      const mockCountRequest = { onsuccess: null, onerror: null, _result: 0, dispatchEvent: mockFn() } as unknown as MockIDBRequest<number>;
      mockStore.count.mock.mockReturnValueOnce(mockCountRequest);


      const promise = addLogEntryToDB(mockDbInstance, logEntry);
      simulateRequestEvent(mockCountRequest, 'success', 0);
      simulateRequestEvent(mockAddRequest, 'error', addError);

      await expect(promise).rejects.toBe(addError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to add log entry:', addError);
    });

    it('should trim old logs if MAX_LOG_ENTRIES is reached', async () => {
        const currentLogsCount = MAX_LOG_ENTRIES + 5;
        const mockCountRequest = { onsuccess: null, onerror: null, _result: currentLogsCount, dispatchEvent: mockFn() } as unknown as MockIDBRequest<number>;
        mockStore.count.mock.mockReturnValueOnce(mockCountRequest);
        
        const mockCursor = {
            primaryKey: 'old-id-1',
            continue: mockFn(),
        } as unknown as IDBCursorWithValue;
        
        const cursorRequest = { 
            onsuccess: null, onerror: null, _result: mockCursor, dispatchEvent: mockFn()
        } as unknown as MockIDBRequest<IDBCursorWithValue | null>;
        
        const timestampIndexMock = {
            name: 'timestamp',
            objectStore: mockStore as unknown as IDBObjectStore,
            keyPath: 'timestamp',
            multiEntry: false,
            unique: false,
            openCursor: mockFn().mockReturnValue(cursorRequest)
        } as unknown as IDBIndex;
        mockStore.index.mock.mockImplementation((name: string) => {
            if (name === 'timestamp') return timestampIndexMock;
            throw new Error(`Unexpected index name: ${name}`);
        });


        const promise = addLogEntryToDB(mockDbInstance, logEntry);

        simulateRequestEvent(mockCountRequest, 'success', currentLogsCount);

        const numToDelete = currentLogsCount - MAX_LOG_ENTRIES + 1;
        for (let i = 0; i < numToDelete; i++) {
            const currentCursorMock = {...mockCursor, primaryKey: `old-id-${i+1}`};
            (timestampIndexMock.openCursor as MockFunction<any>).mock.mockReturnValueOnce({
                onsuccess: null, onerror: null, _result: currentCursorMock, dispatchEvent: mockFn()
            } as unknown as MockIDBRequest<IDBCursorWithValue | null>);
            simulateRequestEvent(cursorRequest, 'success', currentCursorMock); 
        }
        (timestampIndexMock.openCursor as MockFunction<any>).mock.mockReturnValueOnce({
             onsuccess: null, onerror: null, _result: null, dispatchEvent: mockFn()
        } as unknown as MockIDBRequest<IDBCursorWithValue | null>);
        simulateRequestEvent(cursorRequest, 'success', null);


        await expect(promise).resolves.toBeUndefined();
        expect(mockStore.delete).toHaveBeenCalledTimes(numToDelete);
        expect(mockStore.add).toHaveBeenCalledWith(logEntry);
    });

  });

  describe('getAllLogsFromDB', () => {
    it('should resolve with all logs on success, sorted by timestamp desc', async () => {
      const unsortedLogs: LogEntry[] = [
        { id: '1', timestamp: 100, type: LogEntryType.PAGE_VIEW, data: {} as PageViewLogData },
        { id: '2', timestamp: 300, type: LogEntryType.PAGE_VIEW, data: {} as PageViewLogData },
        { id: '3', timestamp: 200, type: LogEntryType.PAGE_VIEW, data: {} as PageViewLogData },
      ];
      const expectedSortedLogs: LogEntry[] = [unsortedLogs[1], unsortedLogs[2], unsortedLogs[0]];
      
      const mockGetAllRequest = { onsuccess: null, onerror: null, _result: unsortedLogs, dispatchEvent: mockFn() } as unknown as MockIDBRequest<LogEntry[]>;
      mockStore.getAll.mock.mockReturnValueOnce(mockGetAllRequest);

      const promise = getAllLogsFromDB(mockDbInstance);
      simulateRequestEvent(mockGetAllRequest, 'success', unsortedLogs);
      
      await expect(promise).resolves.toEqual(expectedSortedLogs);
    });

    it('should reject on getAll error', async () => {
      const getAllError = new DOMException('GetAll failed');
      const mockGetAllRequest = { onsuccess: null, onerror: null, _error: getAllError, dispatchEvent: mockFn()} as unknown as MockIDBRequest<LogEntry[]>;
      mockStore.getAll.mock.mockReturnValueOnce(mockGetAllRequest);
      
      const promise = getAllLogsFromDB(mockDbInstance);
      simulateRequestEvent(mockGetAllRequest, 'error', getAllError);

      await expect(promise).rejects.toBe(getAllError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get all logs:', getAllError);
    });
  });

  describe('clearAllLogsFromDB', () => {
    it('should resolve on clear success', async () => {
      const promise = clearAllLogsFromDB(mockDbInstance);
      await expect(promise).resolves.toBeUndefined();
      expect(mockStore.clear).toHaveBeenCalledTimes(1);
    });

    it('should reject on clear error', async () => {
      const clearError = new DOMException('Clear failed');
      const mockClearRequest = { onsuccess: null, onerror: null, _error: clearError, dispatchEvent: mockFn() } as unknown as MockIDBRequest<undefined>;
      mockStore.clear.mock.mockReturnValueOnce(mockClearRequest);

      const promise = clearAllLogsFromDB(mockDbInstance);
      simulateRequestEvent(mockClearRequest, 'error', clearError);

      await expect(promise).rejects.toBe(clearError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear logs:', clearError);
    });
  });
});
