
import React, { useRef, useEffect } from 'react';
import MonitoringService from './MonitoringService'; // Adjusted import path
import { ComponentMetricLog } from './types';

// This hook is intended to be used by components in the application being monitored.
export const useComponentMonitor = (componentName: string) => {
  const mountTimeRef = useRef(performance.now());
  const renderStartRef = useRef(0);

  // Using useLayoutEffect to capture timestamp before the browser paints
  React.useLayoutEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    const mountDuration = performance.now() - mountTimeRef.current;
    MonitoringService.logComponentMetric(componentName, 'mount', mountDuration);

    // Ensure renderStartRef was set by useLayoutEffect before calculating render duration
    if (renderStartRef.current > 0) {
      const renderDuration = performance.now() - renderStartRef.current;
      MonitoringService.logComponentMetric(componentName, 'render', renderDuration);
      renderStartRef.current = 0; // Reset for subsequent renders if any
    }

    return () => {
      // For unmount, duration is typically not measured, but we log the event
      MonitoringService.logComponentMetric(componentName, 'unmount', 0);
    };
  }, [componentName]); // Re-run if componentName changes, though typically it won't for a single component instance
};
