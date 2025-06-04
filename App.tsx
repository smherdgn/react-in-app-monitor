
import React, { useEffect } from 'react';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import TestRequestsPage from './components/TestRequestsPage';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
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
    <Provider store={store}>
      <BrowserRouter>
        <div style={{ minHeight: '100vh' }}>
          <nav style={{ padding: '0.5rem' }}>
            <Link to="/">Dashboard</Link> |{' '}
            <Link to="/test">Test Requests</Link>
          </nav>
          <Routes>
            <Route path="/" element={<MonitoringDashboard />} />
            <Route path="/test" element={<TestRequestsPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
