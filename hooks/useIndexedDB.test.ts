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
    openMonitoringDBSpy = customJest.spyOn(idbUtils, 'openMonitoringDB').mockResolvedValue(mockDbInstance);
    getAllLogsFromDBSpy = customJest.spyOn(idbUtils, 'getAllLogsFromDB').mockResolvedValue([]);
    clearAllLogsFromDBSpy = customJest.spyOn(idbUtils, 'clearAllLogsFromDB').mockResolvedValue(undefined);
    addLogEntryToDBSpy = customJest.spyOn(idbUtils, 'addLogEntryToDB').mockResolvedValue(undefined);
    
    consoleErrorSpy = customJest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = customJest.spyOn(console, 'warn').mockImplementation(() => {});
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
    getAllLogsFromDBSpy.mockResolvedValue(sampleLogs);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    expect(hookResult.result.current.isLoading).toBe(true); // Initial state
    
    await act(async () => { /* allow promises to settle */ });


    expect(idbUtils.openMonitoringDB).toHaveBeenCalledTimes(1);
    expect(idbUtils.getAllLogsFromDB).toHaveBeenCalledWith(mockDbInstance);
    expect(hookResult.result.current.logs).toEqual(sampleLogs);
    expect(hookResult.result.current.isLoading).toBe(false);
    expect(hookResult.result.current.dbError).toBeNull();
    
    hookResult.unmount();
  });

  it('should handle DB initialization failure', async () => {
    const dbOpenError = 'DB open failed';
    openMonitoringDBSpy.mockRejectedValue(dbOpenError);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle */ });


    expect(hookResult.result.current.dbError).toBe(dbOpenError);
    expect(hookResult.result.current.isLoading).toBe(false);
    expect(hookResult.result.current.logs).toEqual([]);
    expect(idbUtils.getAllLogsFromDB).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("Failed to open DB:", dbOpenError);
    
    hookResult.unmount();
  });

  it('should handle log fetching failure', async () => {
    const fetchError = 'Fetch logs failed';
    getAllLogsFromDBSpy.mockRejectedValue(fetchError);

    let hookResult: any;
    await act(async () => {
       hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle */ });

    expect(hookResult.result.current.dbError).toBe(fetchError);
    expect(hookResult.result.current.isLoading).toBe(false);
    expect(hookResult.result.current.logs).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch logs:", fetchError);
    
    hookResult.unmount();
  });

  it('fetchLogs should refetch logs and update state', async () => {
    getAllLogsFromDBSpy.mockResolvedValueOnce([]); // Initial empty fetch

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });

    expect(hookResult.result.current.logs).toEqual([]);

    const newLogs = [sampleLogs[0]];
    getAllLogsFromDBSpy.mockResolvedValueOnce(newLogs); // Setup for explicit fetchLogs call

    await act(async () => {
      await hookResult.result.current.fetchLogs();
    });

    expect(idbUtils.getAllLogsFromDB).toHaveBeenCalledTimes(2); // Initial + explicit
    expect(hookResult.result.current.logs).toEqual(newLogs);
    expect(hookResult.result.current.isLoading).toBe(false);
    
    hookResult.unmount();
  });
  
  it('fetchLogs should do nothing if DB is not initialized', async () => {
    openMonitoringDBSpy.mockRejectedValue("DB not available");

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for DB open failure */ });

    // Clear any potential calls during init fail by re-spying or using mockClear on the spy itself
    getAllLogsFromDBSpy.mock.mockClear();

    await act(async () => {
      await hookResult.result.current.fetchLogs();
    });
    
    expect(idbUtils.getAllLogsFromDB).not.toHaveBeenCalled();
    hookResult.unmount();
  });


  it('addLog should add a log and refetch', async () => {
    getAllLogsFromDBSpy.mockResolvedValue([]); // Initial fetch

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });


    const newLog = sampleLogs[0];
    getAllLogsFromDBSpy.mockResolvedValueOnce([newLog]); 

    await act(async () => {
      await hookResult.result.current.addLog(newLog);
    });

    expect(idbUtils.addLogEntryToDB).toHaveBeenCalledWith(mockDbInstance, newLog);
    expect(idbUtils.getAllLogsFromDB).toHaveBeenCalledTimes(2); // Initial + after add
    expect(hookResult.result.current.logs).toEqual([newLog]);
    hookResult.unmount();
  });
  
  it('addLog should handle failure and set error', async () => {
    getAllLogsFromDBSpy.mockResolvedValue([]);
    const addError = "Failed to add log";
    addLogEntryToDBSpy.mockRejectedValue(addError);

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
    expect(console.error).toHaveBeenCalledWith("Failed to add log via hook:", addError);
    hookResult.unmount();
  });


  it('clearLogs should clear logs in DB and state', async () => {
    getAllLogsFromDBSpy.mockResolvedValue(sampleLogs); // Initial fetch

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle for initial fetch */ });

    expect(hookResult.result.current.logs).toEqual(sampleLogs);

    await act(async () => {
      await hookResult.result.current.clearLogs();
    });

    expect(idbUtils.clearAllLogsFromDB).toHaveBeenCalledWith(mockDbInstance);
    expect(hookResult.result.current.logs).toEqual([]);
    expect(hookResult.result.current.isLoading).toBe(false);
    hookResult.unmount();
  });
  
  it('clearLogs should handle failure and set error', async () => {
    getAllLogsFromDBSpy.mockResolvedValue(sampleLogs);
    const clearError = "Failed to clear";
    clearAllLogsFromDBSpy.mockRejectedValue(clearError);

    let hookResult: any;
    await act(async () => {
        hookResult = renderHook(() => useIndexedDB());
    });
    await act(async () => { /* allow promises to settle */ });


    await act(async () => {
      await hookResult.result.current.clearLogs();
    });

    expect(hookResult.result.current.dbError).toBe(clearError);
    expect(hookResult.result.current.isLoading).toBe(false);
    // Logs are cleared optimistically in UI before error
    expect(hookResult.result.current.logs).toEqual([]); 
    expect(console.error).toHaveBeenCalledWith("Failed to clear logs:", clearError);
    hookResult.unmount();
  });
});
