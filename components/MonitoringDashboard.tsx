import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { LogEntry, LogEntryType, ApiCallLog, PageViewLog, ErrorLog, ComponentRenderLog, CustomEventLog, ChartDataItem, TimeChartDataItem, ComponentEventType, PageInsight, PageVisit, ComponentPerformanceData, ComponentPerfStats, CustomEventLogData } from '../types';
import { MonitoringService } from '../services/MonitoringService';
import { PlayIcon, PauseIcon, TrashIcon, DownloadIcon, SunIcon, MoonIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, AlertTriangleIcon, CodeBracketIcon, EyeIcon, ArrowLeftIcon, ListBulletIcon, ClockIcon, TagIcon, CpuChipIcon, SimpleCpuChipIcon } from './icons';
import { SimpleBarChart } from './SimpleBarChart';
import { SimpleLineChart } from './SimpleLineChart';
import { POLLING_INTERVAL, THEME_STORAGE_KEY, MONITORING_STATUS_KEY } from '../constants';
import { getItem as getLocalStorageItem, setItem as setLocalStorageItem } from '../utils/localStorageHelper';

const getIconForLogType = (type: LogEntryType, className: string = "icon-default") => {
  // className will be icon-page-view, icon-api-call etc. which are defined in global CSS
  const sizeStyle = { width: '1.25rem', height: '1.25rem' }; // Corresponds to w-5 h-5
  switch (type) {
    case LogEntryType.PAGE_VIEW:
      return <EyeIcon style={sizeStyle} className="icon-page-view" />;
    case LogEntryType.API_CALL:
      return <CodeBracketIcon style={sizeStyle} className="icon-api-call" />;
    case LogEntryType.COMPONENT_RENDER:
      return <InfoIcon style={sizeStyle} className="icon-component-render" />;
    case LogEntryType.ERROR:
      return <AlertTriangleIcon style={sizeStyle} className="icon-error" />;
    case LogEntryType.CUSTOM_EVENT:
      return <TagIcon style={sizeStyle} className="icon-custom-event" />;
    default:
      return <InfoIcon style={sizeStyle} className="icon-default" />;
  }
};


const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const renderLogData = () => {
    switch (log.type) {
      case LogEntryType.PAGE_VIEW:
        const pvData = log.data as PageViewLog['data'];
        return <p>Path: {pvData.path}{pvData.referrer && <span style={{ fontSize: '0.75rem', display: 'block' }}>Referrer: {pvData.referrer}</span>}</p>;
      case LogEntryType.API_CALL:
        const apiData = log.data as ApiCallLog['data'];
        return (
          <div>
            <p><strong>{apiData.method}</strong> {apiData.url}</p>
            <p>Status: <span style={{ color: apiData.statusCode >= 400 ? 'var(--error-light)' : 'var(--success-light)' }} className={apiData.statusCode >= 400 ? 'dark-error-text' : 'dark-success-text'}>{apiData.statusCode}</span>, Duration: {apiData.duration.toFixed(2)}ms</p>
            {apiData.error && <p style={{ color: 'var(--error-light)' }} className="dark-error-text">Error: {apiData.error}</p>}
            {expanded && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {apiData.requestBody && <p><strong>Request:</strong> <pre style={preStyle}>{apiData.requestBody}</pre></p>}
                {apiData.responseBody && <p><strong>Response:</strong> <pre style={preStyle}>{apiData.responseBody}</pre></p>}
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
            <p style={{ color: 'var(--error-light)' }} className="dark-error-text">Error: {errData.message}</p>
            <p style={{ fontSize: '0.75rem' }}>Source: {errData.source}</p>
            {expanded && errData.stack && <pre style={{...preStyle, marginTop: '0.5rem'}}>{errData.stack}</pre>}
          </div>
        );
      case LogEntryType.CUSTOM_EVENT:
        const ceData = log.data as CustomEventLogData;
        return (
          <div>
            <p>Event: <strong>{ceData.eventName}</strong></p>
            {expanded && ceData.details && (
                <pre style={{...preStyle, marginTop: '0.5rem'}}>
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

  const listItemStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-light)',
    transition: 'background-color 0.15s ease-in-out'
  };
  const darkListItemStyle: React.CSSProperties = {
    borderBottomColor: 'var(--border-dark)',
  };
  const preStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-medium-light)',
    padding: '0.25rem',
    borderRadius: '0.25rem',
    maxHeight: '5rem',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  };

  return (
    <li 
        style={Object.assign({}, listItemStyle, document.documentElement.classList.contains('dark') ? darkListItemStyle : {})}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = document.documentElement.classList.contains('dark') ? 'rgba(55, 65, 81, 0.5)' : '#F9FAFB'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flexShrink: 0, paddingTop: '0.25rem' }}>
          {getIconForLogType(log.type)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary-light)' }} className="dark-text-primary">
            {renderLogData()}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">
            {new Date(log.timestamp).toLocaleString()}
          </p>
        </div>
        {canExpand && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="btn-icon" // This class is defined in global styles
            style={{ padding: '0.25rem', borderRadius: '0.375rem' }}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? <ChevronUpIcon style={{width: '1.25rem', height: '1.25rem'}} /> : <ChevronDownIcon style={{width: '1.25rem', height: '1.25rem'}} />}
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
        const safePagePath = selectedPagePath ? selectedPagePath.replace(/[^a-zA-Z0-9_.-]/g, '_') : 'unknownpage';
        fileName += `_visit_${safePagePath}_${new Date(selectedVisit.startTime).toISOString().replace(/:/g, '-')}`;
    } else if (selectedPagePath) {
        const safePagePath = selectedPagePath.replace(/[^a-zA-Z0-9_.-]/g, '_');
        fileName += `_page_${safePagePath}`;
    }
    fileName += `_${new Date().toISOString().replace(/:/g, '-')}.json`;
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
    
    return () => {
      window.removeEventListener('monitoring_new_log', handleNewLog);
      clearInterval(intervalId);
      MonitoringService.logComponentRender({ componentName: 'MonitoringDashboard', eventType: ComponentEventType.UNMOUNT, duration: performance.now() - mountTime });
    };
  }, [fetchLogs]);

  const stripQueryParams = (fullPath: string): string => {
    try {
      // Use a dummy base if the path is relative, URL needs a base.
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      return new URL(fullPath, base).pathname;
    } catch (e) {
      // Fallback for invalid paths or if URL constructor fails
      const qIndex = fullPath.indexOf('?');
      return qIndex !== -1 ? fullPath.substring(0, qIndex) : fullPath;
    }
  };

  const pageInsights = useMemo((): PageInsight[] => {
    if (!logs.length) return [];

    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    const pageViewEvents = sortedLogs.filter(log => log.type === LogEntryType.PAGE_VIEW) as PageViewLog[];
    const insightsMap: Map<string, PageInsight> = new Map();

    for (let i = 0; i < pageViewEvents.length; i++) {
      const currentPv = pageViewEvents[i];
      const pathWithoutParams = stripQueryParams(currentPv.data.path); // Strip params for grouping
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
      
      let pageInsight = insightsMap.get(pathWithoutParams); // Use stripped path for map key
      if (!pageInsight) {
        pageInsight = {
          path: pathWithoutParams, // Store stripped path
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

      insightsMap.set(pathWithoutParams, pageInsight);
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
    if (selectedPagePath) { // selectedPagePath is already stripped
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
        
        let dataString = '';
        try {
          dataString = JSON.stringify(log.data).toLowerCase();
        } catch (e) { /* ignore */ }
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
    
    const intervalMillis = 60 * 1000 * 5; 
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
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
    }));

    return {
        byFrequency: [...processedStats].sort((a,b) => b.count - a.count).slice(0,5),
        byAvgDuration: [...processedStats].sort((a,b) => b.avgDuration - a.avgDuration).slice(0,5),
    };
  }, [getSourceLogsForStats]);

  const renderStatCard = (title: string, value: number | string, icon: React.ReactNode) => (
    <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ 
          padding: '0.5rem', 
          borderRadius: '9999px', /* full */
          backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
          color: document.documentElement.classList.contains('dark') ? 'var(--brand-primary-dark)' : 'var(--brand-primary-light)'
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">{title}</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary-light)' }} className="dark-text-primary">{value}</p>
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

  // Inline styles for complex elements
  const headerStyle: React.CSSProperties = { marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' };
  const headerTitleStyle: React.CSSProperties = { fontSize: '1.875rem', fontWeight: 700, color: 'var(--brand-secondary-light)'};
  const darkHeaderTitleStyle: React.CSSProperties = { color: 'var(--brand-secondary-dark)'};
  const controlsContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem' };
  const iconStyle = {width: '1.5rem', height: '1.5rem'}; // for header buttons

  const sectionTitleStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center' };
  const sectionIconStyle = { width: '1.5rem', height: '1.5rem', marginRight: '0.5rem', color: 'var(--brand-primary-light)' };
  const darkSectionIconStyle = { color: 'var(--brand-primary-dark)' };

  const gridStyle: React.CSSProperties = { display: 'grid', gap: '1rem' };
  // Responsive grid columns (example)
  const twoColGridStyle: React.CSSProperties = { ...gridStyle, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' };
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) { // lg breakpoint
      twoColGridStyle.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  }
  const summaryGridStyle: React.CSSProperties = { ...gridStyle, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' };
  if (typeof window !== 'undefined' && window.innerWidth >= 640) { // sm breakpoint
      summaryGridStyle.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  }
   if (typeof window !== 'undefined' && window.innerWidth >= 1024) { // lg breakpoint
      summaryGridStyle.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
  }
  
  const ulStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--border-light)'};
  const darkUlStyle: React.CSSProperties = { borderTopColor: 'var(--border-dark)' };

  return (
    <div style={{ padding: '1rem', minHeight: '100vh' }} className="dashboard-container">
      {/* Dynamic CSS for dark mode text etc. */}
      <style>{`
        html.dark .dark-text-primary { color: var(--text-primary-dark); }
        html.dark .dark-text-secondary { color: var(--text-secondary-dark); }
        html.dark .dark-border { border-color: var(--border-dark); }
        html.dark .dark-bg-surface-medium { background-color: var(--surface-medium-dark); }
        html.dark .dark-error-text { color: var(--error-dark) !important; }
        html.dark .dark-success-text { color: var(--success-dark) !important; }
        html.dark .dark-brand-primary-text { color: var(--brand-primary-dark) !important; }

        .dashboard-container { padding: clamp(1rem, 5vw, 2rem); }
        .page-insight-item:hover { background-color: ${currentTheme === 'dark' ? 'rgba(55, 65, 81, 0.7)' : '#f0f4f8'}; }
        .page-insight-item.selected { 
            background-color: ${currentTheme === 'dark' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
            border-left: 4px solid ${currentTheme === 'dark' ? 'var(--brand-primary-dark)' : 'var(--brand-primary-light)'};
        }
        .page-insight-item.selected .page-insight-path {
             color: ${currentTheme === 'dark' ? 'var(--brand-primary-dark)' : 'var(--brand-primary-light)'};
             font-weight: 600;
        }
        .log-list-container { max-height: 600px; overflow-y: auto; }
        .page-insights-list { max-height: 300px; overflow-y: auto; }
         @media (min-width: 768px) { /* md */
            .dashboard-container { padding: 1.5rem; }
            .comp-perf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; /* for border effect */ background-color: var(--border-light); }
            html.dark .comp-perf-grid { background-color: var(--border-dark); }
            .comp-perf-grid > div { background-color: var(--surface-elevated-light); padding: 1rem;}
            html.dark .comp-perf-grid > div { background-color: var(--surface-elevated-dark); }
         }
         @media (min-width: 1024px) { /* lg */
            .dashboard-container { padding: 2rem; }
         }
      `}</style>
      <header style={headerStyle}>
        <h1 style={Object.assign({}, headerTitleStyle, currentTheme === 'dark' ? darkHeaderTitleStyle : {})}>Monitoring Dashboard</h1>
        <div style={controlsContainerStyle}>
          <button onClick={toggleMonitoring} className="btn-icon" title={isMonitoringActive ? "Pause Monitoring" : "Start Monitoring"}>
            {isMonitoringActive ? <PauseIcon style={{...iconStyle, color: 'var(--error-light)'}} className="dark-error-text" /> : <PlayIcon style={{...iconStyle, color: 'var(--success-light)'}} className="dark-success-text" />}
          </button>
          <button onClick={toggleTheme} className="btn-icon" title={`Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {currentTheme === 'light' ? <MoonIcon style={iconStyle} /> : <SunIcon style={iconStyle} />}
          </button>
          <button onClick={handleClearLogs} className="btn-icon" title="Clear All Logs">
            <TrashIcon style={iconStyle} />
          </button>
          <button onClick={downloadLogs} className="btn-icon" title="Download Logs">
            <DownloadIcon style={iconStyle} />
          </button>
        </div>
      </header>

      {dbError && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: currentTheme === 'dark' ? 'rgba(239,68,68,0.2)' : '#FECACA', border: `1px solid ${currentTheme === 'dark' ? 'var(--error-dark)' : 'var(--error-light)'}`, color: currentTheme === 'dark' ? 'var(--error-dark)' : 'var(--error-light)', borderRadius: '0.375rem' }}>{dbError}</div>}
      
      <div style={{ marginBottom: '1.5rem' }}>
        {(selectedPagePath || selectedVisit) && (
          <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">
            <span>Showing stats for: <strong style={{ color: 'var(--text-primary-light)'}} className="dark-text-primary">
                {selectedVisit ? `${selectedPagePath} (Visit at ${new Date(selectedVisit.startTime).toLocaleTimeString()})` : selectedPagePath}
            </strong></span>
          </div>
        )}
        <div style={summaryGridStyle}>
          {renderStatCard("Page Views", summaryStats.pageViews, <EyeIcon style={{width: '1.25rem', height: '1.25rem'}}/>)}
          {renderStatCard("API Calls", summaryStats.apiCalls, <CodeBracketIcon style={{width: '1.25rem', height: '1.25rem'}}/>)}
          {renderStatCard("Errors", summaryStats.errors, <AlertTriangleIcon style={{width: '1.25rem', height: '1.25rem'}}/>)}
          {renderStatCard("Components", summaryStats.componentRenders, <InfoIcon style={{width: '1.25rem', height: '1.25rem'}}/>)}
          {renderStatCard("Custom Events", summaryStats.customEvents, <TagIcon style={{width: '1.25rem', height: '1.25rem'}}/>)}
        </div>
      </div>
      
      <div style={Object.assign({}, twoColGridStyle, { marginBottom: '1.5rem' })}>
        <SimpleLineChart data={pageNavigationData} title={`Page Navigation ${selectedVisit ? `during visit` : selectedPagePath ? `on ${selectedPagePath.substring(0,15)}...` : 'Over Time'}`} color={currentTheme === 'dark' ? 'var(--brand-primary-dark)' : 'var(--brand-primary-light)'} />
        <SimpleBarChart data={apiDurationData} title={`Avg. API Duration ${selectedVisit ? `during visit` : selectedPagePath ? `on ${selectedPagePath.substring(0,15)}...` : ''} (Top 5)`} color={currentTheme === 'dark' ? 'var(--brand-primary-dark)' : 'var(--brand-primary-light)'} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', borderBottom: `1px solid ${currentTheme === 'dark' ? 'var(--border-dark)' : 'var(--border-light)'}` }}>
            <h2 style={sectionTitleStyle}>
                <SimpleCpuChipIcon style={Object.assign({}, sectionIconStyle, currentTheme === 'dark' ? darkSectionIconStyle : {})} />
                Component Performance Highlights
            </h2>
        </div>
        {isLoading && componentPerformance.byFrequency.length === 0 && componentPerformance.byAvgDuration.length === 0 ? (
             <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">Loading component performance...</p>
        ) : componentPerformance.byFrequency.length === 0 && componentPerformance.byAvgDuration.length === 0 ? (
            <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">No component render data available {selectedPagePath || selectedVisit ? 'for this selection' : ''}.</p>
        ) : (
        <div className="comp-perf-grid">
            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Top 5 by Render Count</h3>
                {componentPerformance.byFrequency.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {componentPerformance.byFrequency.map(c => (
                            <li key={c.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }} title={c.name}>{c.name}</span>
                                <span style={{ fontWeight: 500 }}>{c.count} renders</span>
                            </li>
                        ))}
                    </ul>
                ) : <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">None</p>}
            </div>
            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Top 5 by Avg. Duration</h3>
                 {componentPerformance.byAvgDuration.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {componentPerformance.byAvgDuration.map(c => (
                            <li key={c.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }} title={c.name}>{c.name}</span>
                                <span style={{ fontWeight: 500 }}>{formatDuration(c.avgDuration)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">None</p>}
            </div>
        </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', borderBottom: `1px solid ${currentTheme === 'dark' ? 'var(--border-dark)' : 'var(--border-light)'}` }}>
          <h2 style={sectionTitleStyle}>
            <ListBulletIcon style={Object.assign({}, sectionIconStyle, currentTheme === 'dark' ? darkSectionIconStyle : {})} />
            Page Insights
          </h2>
        </div>
        {isLoading && pageInsights.length === 0 ? (
          <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary-light)'}} className="dark-text-secondary">Loading page insights...</p>
        ) : pageInsights.length === 0 ? (
          <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary-light)'}} className="dark-text-secondary">No page view data yet to generate insights.</p>
        ) : (
          <ul className="page-insights-list" style={Object.assign({}, ulStyle, currentTheme === 'dark' ? darkUlStyle : {})}>
            {pageInsights.map(insight => (
              <li 
                key={insight.path} 
                className={`page-insight-item ${selectedPagePath === insight.path ? 'selected' : ''}`}
                style={{ padding: '1rem', transition: 'background-color 0.15s ease-in-out', cursor: 'pointer' }}
                onClick={() => handlePageInsightClick(insight.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handlePageInsightClick(insight.path)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="page-insight-path" style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-primary-light)' }} >
                      {insight.path}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">
                      Visits: {insight.totalVisits}. Last: {new Date(insight.lastViewedAt).toLocaleTimeString()}. Avg Duration: {formatDuration(insight.avgDuration)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: '80px' }}>
                     <p>APIs: {insight.totalApiCallCount}</p>
                     <p style={insight.totalErrorCount > 0 ? {color: 'var(--error-light)', fontWeight: 500} : {}} className={insight.totalErrorCount > 0 ? 'dark-error-text' : ''}>Errors: {insight.totalErrorCount}</p>
                     <p>Renders: {insight.totalComponentRenderCount}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedPagePath && pageInsights.find(p => p.path === selectedPagePath) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderBottom: `1px solid ${currentTheme === 'dark' ? 'var(--border-dark)' : 'var(--border-light)'}` }}>
            <h2 style={sectionTitleStyle}>
              <ClockIcon style={Object.assign({}, sectionIconStyle, currentTheme === 'dark' ? darkSectionIconStyle : {})} />
              Visits for {selectedPagePath}
            </h2>
          </div>
          <ul className="page-insights-list" style={Object.assign({}, ulStyle, currentTheme === 'dark' ? darkUlStyle : {})}>
            {(pageInsights.find(p => p.path === selectedPagePath)?.visits || []).sort((a,b) => b.startTime - a.startTime).map((visit) => {
              const visitApiCount = logs.filter(l => visit.logIds.includes(l.id) && l.type === LogEntryType.API_CALL).length;
              const visitErrorCount = logs.filter(l => visit.logIds.includes(l.id) && l.type === LogEntryType.ERROR).length;
              return (
                <li 
                    key={visit.startTime}
                    className={`page-insight-item ${selectedVisit?.startTime === visit.startTime ? 'selected' : ''}`}
                    style={{ padding: '1rem', transition: 'background-color 0.15s ease-in-out', cursor: 'pointer' }}
                    onClick={() => handlePageVisitClick(visit)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handlePageVisitClick(visit)}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span className="page-insight-path" style={{ fontWeight: 500, color: 'var(--text-primary-light)' }}>
                                Visit at {new Date(visit.startTime).toLocaleTimeString()}
                            </span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }} className="dark-text-secondary">Duration: {formatDuration(visit.duration)}</p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: '70px' }}>
                            <p>APIs: {visitApiCount}</p>
                            <p style={visitErrorCount > 0 ? {color: 'var(--error-light)', fontWeight: 500} : {}} className={visitErrorCount > 0 ? 'dark-error-text' : ''}>Errors: {visitErrorCount}</p>
                        </div>
                    </div>
                </li>
            )})}
          </ul>
        </div>
      )}
      
      <div className="card">
        <div style={{ padding: '1rem', borderBottom: `1px solid ${currentTheme === 'dark' ? 'var(--border-dark)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, flexWrap: 'wrap', gap: '0.75rem' }}>
              {(selectedPagePath || selectedVisit) && (
                <button 
                  onClick={handleBackToAll}
                  className="btn-icon"
                  style={{ marginRight: '0.75rem', padding: '0.375rem' }}
                  title="Back to all logs"
                  aria-label="Back to all logs"
                >
                  <ArrowLeftIcon style={Object.assign({width:'1.25rem', height:'1.25rem'}, sectionIconStyle, currentTheme === 'dark' ? darkSectionIconStyle : {})} />
                </button>
              )}
              <h2 style={sectionTitleStyle}>
                {selectedVisit ? `Logs for visit to ${selectedPagePath?.substring(0,20)}... at ${new Date(selectedVisit.startTime).toLocaleTimeString()}` 
                 : selectedPagePath ? `Logs for ${selectedPagePath.substring(0,30)}${selectedPagePath.length > 30 ? '...' : ''}` 
                 : 'Activity Logs'} 
                &nbsp;({filteredLogs.length})
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <input 
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ flexGrow: 1, minWidth: '150px' }}
                aria-label="Search logs"
              />
              <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value as LogEntryType | 'ALL')}
                  className="form-select"
                  style={{ minWidth: '120px' }}
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
          <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary-light)'}} className="dark-text-secondary">Loading logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary-light)'}} className="dark-text-secondary">
            No logs to display
            {selectedVisit ? ` for this specific visit` : selectedPagePath ? ` for this page` : ''}
            {filterType !== 'ALL' ? ` with type ${filterType.replace(/_/g, ' ')}` : ''}
            {searchTerm ? ` matching "${searchTerm}"` : ''}.
            {dbError ? ' There might be an issue with the log database.' : ''}
          </p>
        ) : (
          <ul className="log-list-container" style={Object.assign({}, ulStyle, {borderTopColor: 'transparent'}, currentTheme === 'dark' ? darkUlStyle : {})}>
            {filteredLogs.map(log => (
              <LogItem key={log.id} log={log} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
