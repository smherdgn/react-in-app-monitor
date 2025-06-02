
import React, { useEffect } from 'react';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { MonitoringService } from './services/MonitoringService'; // Ensures service is initialized on app load
import { getItem } from './utils/localStorageHelper';
import { THEME_STORAGE_KEY, MONITORING_STATUS_KEY } from './constants';

const App: React.FC = () => {
  // Initialize theme from localStorage on app load
  useEffect(() => {
    const savedTheme = getItem<'light' | 'dark'>(THEME_STORAGE_KEY, 'light');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Initialize monitoring status from localStorage
    const savedMonitoringStatus = getItem<boolean>(MONITORING_STATUS_KEY, true);
    if (MonitoringService.isRunning !== savedMonitoringStatus) {
        if(savedMonitoringStatus) MonitoringService.start(); else MonitoringService.stop();
    }
    
  }, []);

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <MonitoringDashboard />
    </div>
  );
};

export default App;
