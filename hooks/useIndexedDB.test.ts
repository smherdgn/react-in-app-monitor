
import React from 'react';
// Using custom renderHook and act from local test helpers
import { renderHook, act, jest as customJest, MockFunction } from '../test-utils/test-helpers';
import { useIndexedDB } from './useIndexedDB';
import { LogEntry, LogEntryType, PageViewLogData } from '../types';
import { DB_CONFIG } from '../constants';
import { describe, it, expect, beforeEach, afterEach, mockFn } from '../test-utils/test-helpers';

// Mock the entire indexedDB utility module using spies
import * as idbUtils from '../utils/indexedDB';

describe('useIndexedDB Hook', () => {
  const mockDbInstance = { name: DB_CONFIG.dbName, version: DB_CONFIG.version } as IDBDatabase;
  const sampleLogs: LogEntry[] = [
    { id: '1', timestamp: 1, type: LogEntryType.PAGE_VIEW, data: { path: '/page1' } as PageViewLogData },
    { id: '2', timestamp: 2, type: LogEntryType.PAGE_VIEW, data: { path: '/page2' } as PageViewLogData },
  ];

  let openMonitoringDBSpy: MockFunction<any>;
  let getAllLogsFromDBSpy: MockFunction<any>;
  let clearAllLogsFromDBSpy: MockFunction<any>;
  let addLogEntryToDBSpy: MockFunction<any>;
  let consoleErrorSpy: MockFunction<any>;
  let consoleWarnSpy: MockFunction<any>;


  beforeEach(() => {
    openMonitoringDBSpy = customJest.spyOn(idbUtils, 'openMonitoringDB').mock.mockResolvedValue(mockDbInstance);
    getAllLogsFromDBSpy = customJest.spyOn(idbUtils, 'getAllLogsFromDB').mock.mockResolvedValue([]);
    clearAllLogsFromDBSpy = customJest.spyOn(idbUtils, 'clearAllLogsFromDB').mock.mockResolvedValue(undefined);
    addLogEntryToDBSpy = customJest.spyOn(idbUtils, 'addLogEntryToDB').mock.mockResolvedValue(undefined);
    
    consoleErrorSpy = customJest.spyOn(console, 'error').mock.mockImplementation(() => {});
    consoleWarnSpy = customJest.spyOn(console, 'warn').mock.mockImplementation(() => {});
  });
  
  afterEach(() => {
    openMonitoringDBSpy.mock.mockRestore?.();
    getAllLogsFromDBSpy.mock.mockRestore?.();
    clearAllLogsFromDBSpy.mock.mockRestore?.();
    addLogEntryToDBSpy.mock.mockRestore?.();
    consoleErrorSpy.mock.mockRestore?.();
    consoleWarnSpy.mock.mockRestore?.();
  });

  it('should initialize DB and fetch logs on mount', async () => {
    getAllLogsFromDBSpy.mock.mockResolvedValue(sampleLogs);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    // isLoading is true initially before DB open resolves
    expect(hookResult.result.current.isLoading).toBe(true); 
    
    await act(async () => { /* allow promises to settle for DB open and first fetch */ });


    expect(openMonitoringDBSpy).toHaveBeenCalledTimes(1);
    expect(getAllLogsFromDBSpy).toHaveBeenCalledWith(mockDbInstance);
    expect(hookResult.result.current.logs).toEqual(sampleLogs);
    expect(hookResult.result.current.isLoading).toBe(false);
    expect(hookResult.result.current.dbError).toBeNull();
    
    hookResult.unmount();
  });

  it('should handle DB initialization failure', async () => {
    const dbOpenError = 'DB open failed';
    openMonitoringDBSpy.mock.mockRejectedValue(dbOpenError);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle */ });


    expect(hookResult.result.current.dbError).toBe(dbOpenError);
    expect(hookResult.result.current.isLoading).toBe(false);
    expect(hookResult.result.current.logs).toEqual([]);
    expect(getAllLogsFromDBSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to open DB:", dbOpenError);
    
    hookResult.unmount();
  });

  it('should handle log fetching failure', async () => {
    const fetchError = 'Fetch logs failed';
    getAllLogsFromDBSpy.mock.mockRejectedValue(fetchError);

    let hookResult: any;
    await act(async () => {
       hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for DB open and first fetch */ });

    expect(hookResult.result.current.dbError).toBe(fetchError);
    expect(hookResult.result.current.isLoading).toBe(false);
    expect(hookResult.result.current.logs).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch logs:", fetchError);
    
    hookResult.unmount();
  });

  it('fetchLogs should refetch logs and update state', async () => {
    getAllLogsFromDBSpy.mock.mockResolvedValueOnce([]); // Initial empty fetch

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });

    expect(hookResult.result.current.logs).toEqual([]);

    const newLogs = [sampleLogs[0]];
    getAllLogsFromDBSpy.mock.mockResolvedValueOnce(newLogs); // Setup for explicit fetchLogs call

    await act(async () => {
      await hookResult.result.current.fetchLogs();
    });

    expect(getAllLogsFromDBSpy).toHaveBeenCalledTimes(2); // Initial + explicit
    expect(hookResult.result.current.logs).toEqual(newLogs);
    expect(hookResult.result.current.isLoading).toBe(false);
    
    hookResult.unmount();
  });
  
  it('fetchLogs should do nothing if DB is not initialized', async () => {
    openMonitoringDBSpy.mock.mockRejectedValue("DB not available");

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for DB open failure */ });

    getAllLogsFromDBSpy.mock.mockClear();

    await act(async () => {
      await hookResult.result.current.fetchLogs();
    });
    
    expect(getAllLogsFromDBSpy).not.toHaveBeenCalled();
    // expect(consoleWarnSpy).toHaveBeenCalledWith("DB not initialized, cannot fetch logs."); //This console warn is commented out in the hook
    hookResult.unmount();
  });


  it('addLog should add a log and refetch', async () => {
    getAllLogsFromDBSpy.mock.mockResolvedValue([]); // Initial fetch

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });


    const newLog = sampleLogs[0];
    getAllLogsFromDBSpy.mock.mockResolvedValueOnce([newLog]); 

    await act(async () => {
      await hookResult.result.current.addLog(newLog);
    });

    expect(addLogEntryToDBSpy).toHaveBeenCalledWith(mockDbInstance, newLog);
    expect(getAllLogsFromDBSpy).toHaveBeenCalledTimes(2); // Initial + after add
    expect(hookResult.result.current.logs).toEqual([newLog]);
    hookResult.unmount();
  });
  
  it('addLog should handle failure and set error', async () => {
    getAllLogsFromDBSpy.mock.mockResolvedValue([]);
    const addError = "Failed to add log";
    addLogEntryToDBSpy.mock.mockRejectedValue(addError);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });

    const newLog = sampleLogs[0];
    await act(async () => {
      await hookResult.result.current.addLog(newLog);
    });
    
    expect(hookResult.result.current.dbError).toBe(addError);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to add log via hook:", addError);
    hookResult.unmount();
  });


  it('clearLogs should clear logs in DB and state', async () => {
    getAllLogsFromDBSpy.mock.mockResolvedValue(sampleLogs); // Initial fetch

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });

    expect(hookResult.result.current.logs).toEqual(sampleLogs);

    await act(async () => {
      await hookResult.result.current.clearLogs();
    });

    expect(clearAllLogsFromDBSpy).toHaveBeenCalledWith(mockDbInstance);
    expect(hookResult.result.current.logs).toEqual([]);
    expect(hookResult.result.current.isLoading).toBe(false);
    hookResult.unmount();
  });
  
  it('clearLogs should handle failure and set error', async () => {
    getAllLogsFromDBSpy.mock.mockResolvedValue(sampleLogs);
    const clearError = "Failed to clear";
    clearAllLogsFromDBSpy.mock.mockRejectedValue(clearError);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for DB open and initial fetch */ });


    await act(async () => {
      await hookResult.result.current.clearLogs();
    });

    expect(hookResult.result.current.dbError).toBe(clearError);
    expect(hookResult.result.current.isLoading).toBe(false);
    // Logs are cleared optimistically in UI before error
    expect(hookResult.result.current.logs).toEqual([]); 
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear logs:", clearError);
    hookResult.unmount();
  });
});

