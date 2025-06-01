import React from 'react';
import { GlobalStylesComponent } from './styles.tsx';
import MonitoringDashboard from './MonitoringDashboard.tsx'; // Import the new dashboard component

// The useComponentMonitor hook is exported from hooks.ts for consumption by the application being monitored,
// it is not directly used within the App.tsx of the monitoring tool itself.

const App: React.FC = () => {
  return (
    <>
      <GlobalStylesComponent />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <MonitoringDashboard />
      </div>
    </>
  );
};
export default App;
