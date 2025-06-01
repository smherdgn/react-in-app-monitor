import React from "react";
import MonitoringTool from "./MonitoringTool.tsx";

// The useComponentMonitor hook is exported from hooks.ts for consumption by the application being monitored,
// it is not directly used within the App.tsx of the monitoring tool itself.

const App: React.FC = () => {
  return <MonitoringTool />;
};
export default App;
