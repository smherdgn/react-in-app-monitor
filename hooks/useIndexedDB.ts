
import React, { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '../types';
import { openMonitoringDB, getAllLogsFromDB, clearAllLogsFromDB, addLogEntryToDB } from '../utils/indexedDB';

interface UseIndexedDBResult {
  logs: LogEntry[];
  isLoading: boolean;
  dbError: string | null;
  fetchLogs: () => Promise<void>;
  addLog: (logEntry: LogEntry) => Promise<void>;
  clearLogs: () => Promise<void>;
}

export function useIndexedDB(): UseIndexedDBResult {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function initDB() {
      try {
        setIsLoading(true);
        const openedDb = await openMonitoringDB();
        setDb(openedDb);
        setDbError(null);
      } catch (error) {
        console.error("Failed to open DB:", error);
        setDbError(typeof error === 'string' ? error : 'Failed to initialize database.');
        setIsLoading(false);
      }
    }
    initDB();
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!db) {
      // console.warn("DB not initialized, cannot fetch logs.");
      return;
    }
    setIsLoading(true);
    try {
      const fetchedLogs = await getAllLogsFromDB(db);
      setLogs(fetchedLogs);
      setDbError(null);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setDbError(typeof error === 'string' ? error : 'Failed to fetch logs.');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      fetchLogs();
    }
  }, [db, fetchLogs]);

  const addLog = useCallback(async (logEntry: LogEntry) => {
    if (!db) {
      console.warn("DB not initialized, cannot add log.");
      return;
    }
    try {
      await addLogEntryToDB(db, logEntry);
      // Optimistically update UI or refetch
      // For simplicity, refetching ensures consistency
      await fetchLogs(); 
    } catch (error) {
      console.error("Failed to add log via hook:", error);
      setDbError(typeof error === 'string' ? error : 'Failed to add log.');
    }
  }, [db, fetchLogs]);

  const clearLogs = useCallback(async () => {
    if (!db) {
      console.warn("DB not initialized, cannot clear logs.");
      return;
    }
    setIsLoading(true);
    try {
      await clearAllLogsFromDB(db);
      setLogs([]); // Clear logs in state immediately
      setDbError(null);
    } catch (error) {
      console.error("Failed to clear logs:", error);
      setDbError(typeof error === 'string' ? error : 'Failed to clear logs.');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  return { logs, isLoading, dbError, fetchLogs, addLog, clearLogs };
}
