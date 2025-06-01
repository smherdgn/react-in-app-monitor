# React In-App Monitor

A zero-dependency, client-side monitoring tool designed to be embedded within React applications. It captures and displays crucial runtime information, including page navigations, component lifecycle metrics, API call performance, and JavaScript errors. All data is stored locally in the browser's `localStorage` and visualized in a built-in dashboard.

## Features

- **Zero External Dependencies:** Runs entirely standalone without needing any NPM packages or external CDNs (React/ReactDOM are expected to be provided by the host application).
- **Comprehensive Monitoring:**
  - **Page Route Tracking:** Logs all client-side route changes (pathname, hash, popstate).
  - **Component Metrics:** Tracks React component mount, render, and unmount times using `performance.now()` and `React.useEffect`.
  - **API Call Logging:** Overrides `window.fetch` to log URL, method, duration, success/failure status, and timestamp for all API requests.
  - **Error Capturing:** Listens for runtime JavaScript errors via `window.onerror` and unhandled promise rejections.
- **`localStorage` Based Storage:**
  - All monitoring data is saved in `localStorage` under specific keys (e.g., `monitoring.pages`, `monitoring.api`).
  - Includes functionality to clear logs.
- **Real-time Dashboard UI:**
  - **Auto-refresh:** Data in the dashboard updates periodically and on storage events.
  - **Manual Controls:** "Refresh Now" and "Clear Logs" buttons.
  - **Multiple Views:**
    - **Overview:** Summary statistics (total pages, components, API success rate, etc.) and a bar chart for average component metric durations.
    - **Pages View:** Lists unique page routes encountered. Clicking a page leads to a detailed view.
    - **Page Detail View:** A chronological timeline and list of all events (component metrics, API calls, errors) that occurred on a specific page. Includes an interactive SVG Timeline Chart.
    - **Component Metrics:** Table of component mount/render/unmount durations.
    - **API Logs:** Table of API calls with method, URL, duration, and status.
    - **Error Logs:** Table of JavaScript errors with message, source, and stack trace.
  - **Log Detail Modal:** Click on any log entry to view its full details.
- **Pure SVG Charts:** Simple bar charts and a timeline chart rendered using pure SVG, no external charting libraries.
- **Responsive Design:** The dashboard is designed to be usable across various screen sizes.
- **Start/Stop Monitoring:** Ability to toggle monitoring on and off, with the state persisted.
- **Branding:** Styled with Gar thematic colors.

## Architecture

The tool is built as a set of React components and TypeScript modules:

- **`MonitoringService.ts`:** The core engine. Handles event listener setup (fetch, errors, navigation), data collection, and `localStorage` interactions. It operates as a singleton IIFE.
- **`MonitoringDashboard.tsx`:** Contains all React components for the dashboard UI, including views, charts, tables, and modals.
- **`styles.tsx`:** Provides global CSS styles for the dashboard via a React component (`GlobalStylesComponent`) that injects a `<style>` tag. Includes color constants.
- **`hooks.ts`:** Contains custom React hooks, primarily `useComponentMonitor`, which application components can use to log their lifecycle events.
- **`types.ts`:** Defines all TypeScript types and interfaces used throughout the tool.
- **`App.tsx`:** A simple wrapper component that integrates the `GlobalStylesComponent` and the `MonitoringDashboard`. This is the main entry point for the monitoring tool's UI.
- **`index.tsx`:** Standard React entry point that renders the `App` component into the DOM.

## Integration

This tool is designed to be embedded directly into an existing React + TypeScript application.

1.  **Copy Files:** Copy all the `.ts`, `.tsx`, and relevant static files (`index.html`, `metadata.json` if starting from scratch) into your project's source directory (e.g., `src/monitoring/`).
2.  **Render the Dashboard:**
    In your main application component (e.g., your existing `App.tsx` or a specific admin/debug route), import and render the `MonitoringDashboard` component from this tool. You might also want to render the `GlobalStylesComponent`.

    ```tsx
    // Example: In your application's main App.tsx
    import React from "react";
    // ... other imports from your app
    import MonitoringDashboard from "./path/to/your/monitoring/MonitoringDashboard";
    import { GlobalStylesComponent } from "./path/to/your/monitoring/styles";

    function YourApp() {
      // ... your existing app logic

      // Conditionally render the monitor (e.g., based on a flag or route)
      const showMonitor = process.env.NODE_ENV === "development"; // Or some other condition

      return (
        <>
          {/* ... your existing app JSX */}
          {showMonitor && (
            <>
              <GlobalStylesComponent />
              <MonitoringDashboard />
            </>
          )}
        </>
      );
    }

    export default YourApp;
    ```

3.  **Monitor Components (Optional but Recommended):**
    To track individual component metrics, use the `useComponentMonitor` hook within your application's components:

    ```tsx
    // Example: In one of your application's components
    import React from "react";
    import { useComponentMonitor } from "./path/to/your/monitoring/hooks"; // Adjust path

    const MyMonitoredComponent: React.FC = (props) => {
      useComponentMonitor("MyMonitoredComponent"); // Pass the component's name

      // ... rest of your component logic

      return <div>{/* ... component JSX */}</div>;
    };

    export default MyMonitoredComponent;
    ```

4.  **Initialization:** The `MonitoringService.ts` initializes itself automatically when imported/loaded, setting up global listeners. Ensure it's part of your application's bundle. If `MonitoringDashboard.tsx` is imported, `MonitoringService.ts` will be transitively imported.

## File Structure

```
.
├── App.tsx                 # Main React component for the monitor UI shell
├── MonitoringDashboard.tsx # Contains all UI components for the dashboard
├── MonitoringService.ts    # Core monitoring logic and localStorage interaction
├── hooks.ts                # Custom React hooks (e.g., useComponentMonitor)
├── styles.tsx              # Global styles and style constants (exports GlobalStylesComponent)
├── types.ts                # TypeScript type definitions
├── index.html              # Basic HTML structure (if used standalone)
├── index.tsx               # React DOM rendering entry point
├── metadata.json           # Application metadata
└── README.md               # This file
```

## Usage Notes

- **Performance:** While designed to be lightweight, extensive logging (especially rapid component re-renders) can have a minor performance impact. Use judiciously in production or primarily for development/debugging.
- **`localStorage` Limits:** `localStorage` has size limits (typically 5-10MB). The tool caps logs per category (`MAX_LOG_ENTRIES_PER_KEY`) to prevent exceeding these limits.
- **Security:** As data is stored in `localStorage`, it's accessible via JavaScript on the same domain. Avoid logging highly sensitive information if the application might be vulnerable to XSS.
- **`window.fetch` Override:** The tool overrides `window.fetch`. If other parts of your application or third-party scripts also attempt to modify `window.fetch`, ensure compatibility or load this monitor last to ensure its wrapper is active.
- **Error Boundaries:** Consider using React Error Boundaries in your main application to catch rendering errors from the monitoring tool itself, although it's designed to be robust.

## Development & Customization

- **Styling:** Modify `styles.tsx` to change the appearance.
- **Functionality:** Extend `MonitoringService.ts` to capture more types of events or `MonitoringDashboard.tsx` to add new views or visualizations.

```

```
