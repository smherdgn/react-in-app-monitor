import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { LogEntry, LogEntryType, ApiCallLog, PageViewLog, ErrorLog, ComponentRenderLog, CustomEventLog, ChartDataItem, TimeChartDataItem, ComponentEventType, PageInsight, PageVisit, ComponentPerformanceData, ComponentPerfStats, CustomEventLogData } from '../types';
import { MonitoringService } from '../services/MonitoringService';
import { PlayIcon, PauseIcon, TrashIcon, DownloadIcon, SunIcon, MoonIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, AlertTriangleIcon, CodeBracketIcon, EyeIcon, ArrowLeftIcon, ListBulletIcon, ClockIcon, TagIcon, CpuChipIcon, SimpleCpuChipIcon } from './icons';
import { SimpleBarChart } from './SimpleBarChart';
import { SimpleLineChart } from './SimpleLineChart';
import { POLLING_INTERVAL, THEME_STORAGE_KEY, MONITORING_STATUS_KEY } from '../constants';
import { getItem as getLocalStorageItem, setItem as setLocalStorageItem } from '../utils/localStorageHelper';

const getIconForLogType = (type: LogEntryType, className: string = "w-5 h-5") => {
  switch (type) {
    case LogEntryType.PAGE_VIEW:
      return <EyeIcon className={`${className} text-blue-500`} />;
    case LogEntryType.API_CALL:
      return <CodeBracketIcon className={`${className} text-green-500`} />;
    case LogEntryType.COMPONENT_RENDER:
      return <InfoIcon className={`${className} text-purple-500`} />;
    case LogEntryType.ERROR:
      return <AlertTriangleIcon className={`${className} text-red-500`} />;
    case LogEntryType.CUSTOM_EVENT:
      return <TagIcon className={`${className} text-yellow-500`} />;
    default:
      return <InfoIcon className={`${className} text-gray-500`} />;
  }
};


const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const renderLogData = () => {
    switch (log.type) {
      case LogEntryType.PAGE_VIEW:
        const pvData = log.data as PageViewLog['data'];
        return <p>Path: {pvData.path}{pvData.referrer && <span className="text-xs block">Referrer: {pvData.referrer}</span>}</p>;
      case LogEntryType.API_CALL:
        const apiData = log.data as ApiCallLog['data'];
        return (
          <div>
            <p><strong>{apiData.method}</strong> {apiData.url}</p>
            <p>Status: <span className={apiData.statusCode >= 400 ? 'text-red-500' : 'text-green-500'}>{apiData.statusCode}</span>, Duration: {apiData.duration.toFixed(2)}ms</p>
            {apiData.error && <p className="text-red-500">Error: {apiData.error}</p>}
            {expanded && (
              <div className="mt-2 space-y-1 text-xs">
                {apiData.requestBody && <p><strong>Request:</strong> <pre className="bg-slate-100 dark:bg-slate-700 p-1 rounded max-h-20 overflow-auto">{apiData.requestBody}</pre></p>}
                {apiData.responseBody && <p><strong>Response:</strong> <pre className="bg-slate-100 dark:bg-slate-700 p-1 rounded max-h-20 overflow-auto">{apiData.responseBody}</pre></p>}
              </div>
            )}
          </div>
        );
      case LogEntryType.COMPONENT_RENDER:
        const crData = log.data as ComponentRenderLog['data'];
        return <p>Component: {crData.componentName}, Event: {crData.eventType}, Duration: {crData.duration.toFixed(2)}ms</p>;
      case LogEntryType.ERROR:
        const errData = log.data as ErrorLog['data'];
        return (
          <div>
            <p className="text-red-500">Error: {errData.message}</p>
            <p className="text-xs">Source: {errData.source}</p>
            {expanded && errData.stack && <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-700 p-1 rounded max-h-32 overflow-auto">{errData.stack}</pre>}
          </div>
        );
      case LogEntryType.CUSTOM_EVENT:
        const ceData = log.data as CustomEventLogData;
        return (
          <div>
            <p>Event: <strong>{ceData.eventName}</strong></p>
            {expanded && ceData.details && (
                <pre className="mt-2 text-xs bg-slate-100 dark:bg-slate-700 p-1 rounded max-h-32 overflow-auto">
                    {JSON.stringify(ceData.details, null, 2)}
                </pre>
            )}
          </div>
        );
      default:
        return <p>Unknown log type</p>;
    }
  };

  const canExpand = log.type === LogEntryType.API_CALL || 
                    (log.type === LogEntryType.ERROR && (log.data as ErrorLog['data']).stack) ||
                    (log.type === LogEntryType.CUSTOM_EVENT && (log.data as CustomEventLogData).details);


  return (
    <li className="py-3 px-4 border-b border-border-light dark:border-border-dark last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 pt-1">
          {getIconForLogType(log.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary-light dark:text-text-primary-dark">
            {renderLogData()}
          </div>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {new Date(log.timestamp).toLocaleString()}
          </p>
        </div>
        {canExpand && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="p-1 text-text-secondary-light dark:text-text-secondary-dark hover:text-brand-primary-light dark:hover:text-brand-primary-dark rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark"
            aria-label={expanded ? "Collapse details" : "Expand details"}
            >
            {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
          </button>
        )}
      </div>
    </li>
  );
};


export const MonitoringDashboard: React.FC = () => {
  const { logs, isLoading, dbError, fetchLogs, clearLogs: clearDBLogs } = useIndexedDB();
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(() => getLocalStorageItem(MONITORING_STATUS_KEY, MonitoringService.isRunning));
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => getLocalStorageItem<'light' | 'dark'>(THEME_STORAGE_KEY, 'light'));
  const [filterType, setFilterType] = useState<LogEntryType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [selectedPagePath, setSelectedPagePath] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<PageVisit | null>(null);

  useEffect(() => {
     MonitoringService.isRunning = isMonitoringActive; 
  }, [isMonitoringActive]);

  useEffect(() => {
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setLocalStorageItem(THEME_STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleMonitoring = () => {
    const newStatus = MonitoringService.toggleMonitoring();
    setIsMonitoringActive(newStatus);
    setLocalStorageItem(MONITORING_STATUS_KEY, newStatus);
  };

  const handleClearLogs = async () => {
    if (window.confirm("Are you sure you want to clear all logs? This cannot be undone.")) {
      await clearDBLogs();
      setSelectedPagePath(null); 
      setSelectedVisit(null);
    }
  };

  const downloadLogs = () => {
    const logsToDownload = filteredLogs; 
    const json = JSON.stringify(logsToDownload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let fileName = "monitoring_logs";
    if (selectedVisit) {
        fileName += `_visit_${selectedPagePath?.replace(/\//g, '_')}_${new Date(selectedVisit.startTime).toISOString()}`;
    } else if (selectedPagePath) {
        fileName += `_page_${selectedPagePath.replace(/\//g, '_')}`;
    }
    fileName += `_${new Date().toISOString()}.json`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleBackToAll = () => {
    setSelectedPagePath(null);
    setSelectedVisit(null);
  };

  useEffect(() => {
    const handleNewLog = () => fetchLogs();
    window.addEventListener('monitoring_new_log', handleNewLog);
    
    const intervalId = setInterval(fetchLogs, POLLING_INTERVAL);

    const mountTime = performance.now();
    MonitoringService.logComponentRender({ componentName: 'MonitoringDashboard', eventType: ComponentEventType.MOUNT, duration: 0 });
    
    // Example of logging a custom event
    // MonitoringService.logCustomEvent("DashboardMounted", { userAgent: navigator.userAgent });

    return () => {
      window.removeEventListener('monitoring_new_log', handleNewLog);
      clearInterval(intervalId);
      MonitoringService.logComponentRender({ componentName: 'MonitoringDashboard', eventType: ComponentEventType.UNMOUNT, duration: performance.now() - mountTime });
    };
  }, [fetchLogs]);


  const pageInsights = useMemo((): PageInsight[] => {
    if (!logs.length) return [];

    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    const pageViewEvents = sortedLogs.filter(log => log.type === LogEntryType.PAGE_VIEW) as PageViewLog[];
    const insightsMap: Map<string, PageInsight> = new Map();

    for (let i = 0; i < pageViewEvents.length; i++) {
      const currentPv = pageViewEvents[i];
      const lastLogTimestamp = sortedLogs[sortedLogs.length - 1].timestamp;
      
      const startTime = currentPv.timestamp;
      const endTime = pageViewEvents[i+1]?.timestamp ?? lastLogTimestamp; 


      const visitLogs: LogEntry[] = sortedLogs.filter(log => {
        return log.timestamp >= startTime && log.timestamp < endTime;
      });
      
      if (i === pageViewEvents.length - 1) {
         const remainingLogs = sortedLogs.filter(log => log.timestamp >= startTime && log.timestamp >= endTime);
         visitLogs.push(...remainingLogs.filter(rl => !visitLogs.find(vl => vl.id === rl.id)));
      }


      const pageVisit: PageVisit = {
        startTime,
        endTime: i === pageViewEvents.length - 1 ? undefined : endTime, 
        duration: i === pageViewEvents.length - 1 ? undefined : (endTime - startTime),
        logIds: visitLogs.map(l => l.id)
      };
      
      let pageInsight = insightsMap.get(currentPv.data.path);
      if (!pageInsight) {
        pageInsight = {
          path: currentPv.data.path,
          visits: [],
          totalVisits: 0,
          totalApiCallCount: 0,
          totalErrorCount: 0,
          totalComponentRenderCount: 0,
          firstViewedAt: startTime,
          lastViewedAt: startTime,
        };
      }

      pageInsight.visits.push(pageVisit); 
      pageInsight.totalVisits = pageInsight.visits.length; 
      pageInsight.lastViewedAt = Math.max(pageInsight.lastViewedAt, startTime);
      pageInsight.firstViewedAt = Math.min(pageInsight.firstViewedAt, startTime);
      
      
      const allLogsForThisPath = sortedLogs.filter(log => {
          return pageInsight!.visits.some(v => log.timestamp >= v.startTime && (v.endTime ? log.timestamp < v.endTime : log.timestamp <= pageInsight!.lastViewedAt));
      });

      pageInsight.totalApiCallCount = allLogsForThisPath.filter(l => l.type === LogEntryType.API_CALL).length;
      pageInsight.totalErrorCount = allLogsForThisPath.filter(l => l.type === LogEntryType.ERROR).length;
      pageInsight.totalComponentRenderCount = allLogsForThisPath.filter(l => l.type === LogEntryType.COMPONENT_RENDER).length;

      insightsMap.set(currentPv.data.path, pageInsight);
    }

    insightsMap.forEach(insight => {
      const durations = insight.visits.map(v => v.duration).filter(d => d !== undefined) as number[];
      if (durations.length > 0) {
        insight.avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      }
    });

    return Array.from(insightsMap.values()).sort((a,b) => b.lastViewedAt - a.lastViewedAt);
  }, [logs]);

  const getSourceLogsForStats = useCallback(() => {
    if (selectedVisit) {
        const relevantLogIds = new Set<string>(selectedVisit.logIds);
        return logs.filter(log => relevantLogIds.has(log.id));
    }
    if (selectedPagePath) {
        const insight = pageInsights.find(p => p.path === selectedPagePath);
        if (insight) {
            const relevantLogIds = new Set<string>();
            insight.visits.forEach(visit => visit.logIds.forEach(id => relevantLogIds.add(id)));
            return logs.filter(log => relevantLogIds.has(log.id));
        }
        return [];
    }
    return logs;
  }, [logs, selectedPagePath, selectedVisit, pageInsights]);

  const filteredLogs = useMemo(() => {
    let displayLogs = getSourceLogsForStats();

    if (filterType !== 'ALL') {
        displayLogs = displayLogs.filter(log => log.type === filterType);
    }

    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      displayLogs = displayLogs.filter(log => {
        const typeMatch = log.type.toLowerCase().replace(/_/g, ' ').includes(lowerSearchTerm);
        if (typeMatch) return true;

        // Stringify data for a general search, or specific fields
        let dataString = '';
        try {
          dataString = JSON.stringify(log.data).toLowerCase();
        } catch (e) { /* ignore serialization errors for search */ }
        if (dataString.includes(lowerSearchTerm)) return true;
        
        return false;
      });
    }
    return displayLogs.sort((a, b) => b.timestamp - a.timestamp);
  }, [getSourceLogsForStats, filterType, searchTerm]);


  const summaryStats = useMemo(() => {
    const sourceLogs = getSourceLogsForStats();
    return {
      pageViews: sourceLogs.filter(log => log.type === LogEntryType.PAGE_VIEW).length,
      apiCalls: sourceLogs.filter(log => log.type === LogEntryType.API_CALL).length,
      errors: sourceLogs.filter(log => log.type === LogEntryType.ERROR).length,
      componentRenders: sourceLogs.filter(log => log.type === LogEntryType.COMPONENT_RENDER).length,
      customEvents: sourceLogs.filter(log => log.type === LogEntryType.CUSTOM_EVENT).length,
    };
  }, [getSourceLogsForStats]);

  const apiDurationData: ChartDataItem[] = useMemo(() => {
    const sourceLogs = getSourceLogsForStats();
    const apiCalls = sourceLogs.filter(log => log.type === LogEntryType.API_CALL) as ApiCallLog[];
    const durations: { [key: string]: { totalDuration: number; count: number } } = {};
    apiCalls.forEach(call => {
      try {
        const endpoint = new URL(call.data.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
        if (!durations[endpoint]) {
          durations[endpoint] = { totalDuration: 0, count: 0 };
        }
        durations[endpoint].totalDuration += call.data.duration;
        durations[endpoint].count += 1;
      } catch (e) {
        console.warn("Invalid URL in API log for chart:", call.data.url);
      }
    });
    return Object.entries(durations)
      .map(([name, data]) => ({ name, value: data.totalDuration / data.count }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 5);
  }, [getSourceLogsForStats]);

  const pageNavigationData: TimeChartDataItem[] = useMemo(() => {
    const sourceLogs = getSourceLogsForStats();
    const pageViews = sourceLogs.filter(log => log.type === LogEntryType.PAGE_VIEW) as PageViewLog[];
    
    const intervalMillis = 60 * 1000 * 5; // 5 minute intervals
    const navigationCounts: { [key: number]: number } = {};
    
    pageViews.forEach(pv => {
      const intervalStart = Math.floor(pv.timestamp / intervalMillis) * intervalMillis;
      navigationCounts[intervalStart] = (navigationCounts[intervalStart] || 0) + 1;
    });

    return Object.entries(navigationCounts)
      .map(([time, count]) => ({ time: parseInt(time), count }))
      .sort((a, b) => a.time - b.time);
  }, [getSourceLogsForStats]);

  const componentPerformance = useMemo((): ComponentPerformanceData => {
    const sourceLogs = getSourceLogsForStats();
    const componentRenders = sourceLogs.filter(log => log.type === LogEntryType.COMPONENT_RENDER) as ComponentRenderLog[];
    const stats: { [name: string]: { count: number; totalDuration: number } } = {};

    componentRenders.forEach(log => {
        if (!stats[log.data.componentName]) {
            stats[log.data.componentName] = { count: 0, totalDuration: 0 };
        }
        stats[log.data.componentName].count++;
        stats[log.data.componentName].totalDuration += log.data.duration;
    });

    const processedStats: ComponentPerfStats[] = Object.entries(stats).map(([name, data]) => ({
        name,
        count: data.count,
        totalDuration: data.totalDuration,
        avgDuration: data.totalDuration / data.count,
    }));

    return {
        byFrequency: [...processedStats].sort((a,b) => b.count - a.count).slice(0,5),
        byAvgDuration: [...processedStats].sort((a,b) => b.avgDuration - a.avgDuration).slice(0,5),
    };
  }, [getSourceLogsForStats]);

  const renderStatCard = (title: string, value: number | string, icon: React.ReactNode) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow flex items-center space-x-3">
      <div className="p-2 bg-brand-primary-light/20 dark:bg-brand-primary-dark/20 rounded-full text-brand-primary-light dark:text-brand-primary-dark">
        {icon}
      </div>
      <div>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{title}</p>
        <p className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark">{value}</p>
      </div>
    </div>
  );

  const formatDuration = (ms?: number): string => {
    if (ms === undefined) return 'Ongoing';
    if (ms < 0) return 'N/A';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const handlePageInsightClick = (path: string) => {
    if (selectedPagePath === path) { 
        setSelectedPagePath(null);
        setSelectedVisit(null);
    } else {
        setSelectedPagePath(path);
        setSelectedVisit(null); 
    }
  };

  const handlePageVisitClick = (visit: PageVisit) => {
     if(selectedVisit && selectedVisit.startTime === visit.startTime) {
        setSelectedVisit(null); 
     } else {
        setSelectedVisit(visit);
     }
  };
  
  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark">
      <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-brand-secondary-light dark:text-brand-secondary-dark">Monitoring Dashboard</h1>
        <div className="flex items-center space-x-2">
          <button onClick={toggleMonitoring} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark" title={isMonitoringActive ? "Pause Monitoring" : "Start Monitoring"}>
            {isMonitoringActive ? <PauseIcon className="w-6 h-6 text-red-500" /> : <PlayIcon className="w-6 h-6 text-green-500" />}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark" title={`Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {currentTheme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
          </button>
          <button onClick={handleClearLogs} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark" title="Clear All Logs">
            <TrashIcon className="w-6 h-6" />
          </button>
          <button onClick={downloadLogs} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark" title="Download Logs">
            <DownloadIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {dbError && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-md">{dbError}</div>}
      
      <div className="mb-6">
        {(selectedPagePath || selectedVisit) && (
          <div className="mb-2 text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center">
            <span>Showing stats for: <strong className="text-text-primary-light dark:text-text-primary-dark">
                {selectedVisit ? `${selectedPagePath} (Visit at ${new Date(selectedVisit.startTime).toLocaleTimeString()})` : selectedPagePath}
            </strong></span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {renderStatCard("Page Views", summaryStats.pageViews, <EyeIcon className="w-5 h-5"/>)}
          {renderStatCard("API Calls", summaryStats.apiCalls, <CodeBracketIcon className="w-5 h-5"/>)}
          {renderStatCard("Errors", summaryStats.errors, <AlertTriangleIcon className="w-5 h-5"/>)}
          {renderStatCard("Components", summaryStats.componentRenders, <InfoIcon className="w-5 h-5"/>)}
          {renderStatCard("Custom Events", summaryStats.customEvents, <TagIcon className="w-5 h-5"/>)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SimpleLineChart data={pageNavigationData} title={`Page Navigation ${selectedVisit ? `during visit` : selectedPagePath ? `on ${selectedPagePath.substring(0,15)}...` : 'Over Time'}`} color={currentTheme === 'dark' ? '#60A5FA' : '#3B82F6'} />
        <SimpleBarChart data={apiDurationData} title={`Avg. API Duration ${selectedVisit ? `during visit` : selectedPagePath ? `on ${selectedPagePath.substring(0,15)}...` : ''} (Top 5)`} color={currentTheme === 'dark' ? '#60A5FA' : '#3B82F6'} />
      </div>

      {/* Component Performance Section */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-xl font-semibold flex items-center">
                <SimpleCpuChipIcon className="w-6 h-6 mr-2 text-brand-primary-light dark:text-brand-primary-dark"/>
                Component Performance Highlights
            </h2>
        </div>
        {isLoading && componentPerformance.byFrequency.length === 0 && componentPerformance.byAvgDuration.length === 0 ? (
             <p className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">Loading component performance...</p>
        ) : componentPerformance.byFrequency.length === 0 && componentPerformance.byAvgDuration.length === 0 ? (
            <p className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">No component render data available {selectedPagePath || selectedVisit ? 'for this selection' : ''}.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-px bg-border-light dark:bg-border-dark">
            <div className="bg-white dark:bg-slate-800 p-4">
                <h3 className="text-md font-semibold mb-2">Top 5 by Render Count</h3>
                {componentPerformance.byFrequency.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                        {componentPerformance.byFrequency.map(c => (
                            <li key={c.name} className="flex justify-between">
                                <span className="truncate pr-2" title={c.name}>{c.name}</span>
                                <span className="font-medium">{c.count} renders</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">None</p>}
            </div>
            <div className="bg-white dark:bg-slate-800 p-4">
                <h3 className="text-md font-semibold mb-2">Top 5 by Avg. Duration</h3>
                 {componentPerformance.byAvgDuration.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                        {componentPerformance.byAvgDuration.map(c => (
                            <li key={c.name} className="flex justify-between">
                                <span className="truncate pr-2" title={c.name}>{c.name}</span>
                                <span className="font-medium">{formatDuration(c.avgDuration)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">None</p>}
            </div>
        </div>
        )}
      </div>


      {/* Page Insights List */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-xl font-semibold flex items-center">
            <ListBulletIcon className="w-6 h-6 mr-2 text-brand-primary-light dark:text-brand-primary-dark"/>
            Page Insights
          </h2>
        </div>
        {isLoading && pageInsights.length === 0 ? (
          <p className="p-6 text-center text-text-secondary-light dark:text-text-secondary-dark">Loading page insights...</p>
        ) : pageInsights.length === 0 ? (
          <p className="p-6 text-center text-text-secondary-light dark:text-text-secondary-dark">No page view data yet to generate insights.</p>
        ) : (
          <ul className="divide-y divide-border-light dark:divide-border-dark max-h-[300px] overflow-y-auto">
            {pageInsights.map(insight => (
              <li 
                key={insight.path} 
                className={`p-4 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors duration-150 cursor-pointer ${selectedPagePath === insight.path ? 'bg-brand-primary-light/10 dark:bg-brand-primary-dark/10 border-l-4 border-brand-primary-light dark:border-brand-primary-dark' : ''}`}
                onClick={() => handlePageInsightClick(insight.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handlePageInsightClick(insight.path)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`text-lg font-medium ${selectedPagePath === insight.path ? 'text-brand-primary-light dark:text-brand-primary-dark font-semibold' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                      {insight.path}
                    </span>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      Visits: {insight.totalVisits}. Last: {new Date(insight.lastViewedAt).toLocaleTimeString()}. Avg Duration: {formatDuration(insight.avgDuration)}
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-0.5 min-w-[80px]">
                     <p>APIs: {insight.totalApiCallCount}</p>
                     <p className={insight.totalErrorCount > 0 ? 'text-red-500 font-medium' : ''}>Errors: {insight.totalErrorCount}</p>
                     <p>Renders: {insight.totalComponentRenderCount}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedPagePath && pageInsights.find(p => p.path === selectedPagePath) && (
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-xl font-semibold flex items-center">
              <ClockIcon className="w-6 h-6 mr-2 text-brand-primary-light dark:text-brand-primary-dark"/>
              Visits for {selectedPagePath}
            </h2>
          </div>
          <ul className="divide-y divide-border-light dark:divide-border-dark max-h-[300px] overflow-y-auto">
            {(pageInsights.find(p => p.path === selectedPagePath)?.visits || []).sort((a,b) => b.startTime - a.startTime).map((visit, index) => {
              const visitApiCount = logs.filter(l => visit.logIds.includes(l.id) && l.type === LogEntryType.API_CALL).length;
              const visitErrorCount = logs.filter(l => visit.logIds.includes(l.id) && l.type === LogEntryType.ERROR).length;
              return (
                <li 
                    key={visit.startTime}
                    className={`p-4 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors duration-150 cursor-pointer ${selectedVisit?.startTime === visit.startTime ? 'bg-brand-primary-light/10 dark:bg-brand-primary-dark/10 border-l-4 border-brand-primary-light dark:border-brand-primary-dark' : ''}`}
                    onClick={() => handlePageVisitClick(visit)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handlePageVisitClick(visit)}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <span className={`font-medium ${selectedVisit?.startTime === visit.startTime ? 'text-brand-primary-light dark:text-brand-primary-dark font-semibold' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                                Visit at {new Date(visit.startTime).toLocaleTimeString()}
                            </span>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Duration: {formatDuration(visit.duration)}</p>
                        </div>
                        <div className="text-right text-xs space-y-0.5 min-w-[70px]">
                            <p>APIs: {visitApiCount}</p>
                            <p className={visitErrorCount > 0 ? 'text-red-500 font-medium' : ''}>Errors: {visitErrorCount}</p>
                        </div>
                    </div>
                </li>
            )})}
          </ul>
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center flex-grow">
              {(selectedPagePath || selectedVisit) && (
                <button 
                  onClick={handleBackToAll}
                  className="mr-3 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark"
                  title="Back to all logs"
                  aria-label="Back to all logs"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-brand-primary-light dark:text-brand-primary-dark" />
                </button>
              )}
              <h2 className="text-xl font-semibold">
                {selectedVisit ? `Logs for visit to ${selectedPagePath?.substring(0,20)}... at ${new Date(selectedVisit.startTime).toLocaleTimeString()}` 
                 : selectedPagePath ? `Logs for ${selectedPagePath.substring(0,30)}${selectedPagePath.length > 30 ? '...' : ''}` 
                 : 'Activity Logs'} 
                &nbsp;({filteredLogs.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-50 dark:bg-slate-700 border border-border-light dark:border-border-dark rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark flex-grow sm:flex-grow-0"
                aria-label="Search logs"
              />
              <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value as LogEntryType | 'ALL')}
                  className="bg-slate-50 dark:bg-slate-700 border border-border-light dark:border-border-dark rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-brand-primary-dark"
                  aria-label="Filter logs by type"
              >
                  <option value="ALL">All Types</option>
                  {Object.values(LogEntryType).map(type => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
              </select>
            </div>
        </div>
        {isLoading && logs.length === 0 && !dbError ? ( 
          <p className="p-6 text-center text-text-secondary-light dark:text-text-secondary-dark">Loading logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-6 text-center text-text-secondary-light dark:text-text-secondary-dark">
            No logs to display
            {selectedVisit ? ` for this specific visit` : selectedPagePath ? ` for this page` : ''}
            {filterType !== 'ALL' ? ` with type ${filterType.replace(/_/g, ' ')}` : ''}
            {searchTerm ? ` matching "${searchTerm}"` : ''}.
            {dbError ? ' There might be an issue with the log database.' : ''}
          </p>
        ) : (
          <ul className="divide-y divide-border-light dark:divide-border-dark max-h-[600px] overflow-y-auto">
            {filteredLogs.map(log => (
              <LogItem key={log.id} log={log} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};