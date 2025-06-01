// monitor/MonitoringTool.tsx
import React, { useEffect } from "react";
import MonitoringService from "./MonitoringService";
import MonitoringDashboard from "./MonitoringDashboard";

const MonitoringTool: React.FC = () => {
  useEffect(() => {
    MonitoringService.startMonitoring(); // servis başlatılır
    return () => {
      MonitoringService.stopMonitoring(); // bileşen unmount olduğunda durdurulur
    };
  }, []);

  return <MonitoringDashboard />;
};

export default MonitoringTool;
