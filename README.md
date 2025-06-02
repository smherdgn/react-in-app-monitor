# In-App React Monitoring Tool

A fully self-contained, embeddable React in-app monitoring tool with zero external npm dependencies. Designed for easy integration into any existing React/Vite project.

## Key Features

- **Zero External Dependencies**: No `npm install` needed for this tool. It's built with vanilla React and browser APIs.
- **Automatic Data Collection**:
  - **Page Navigation**: Tracks route changes (pushState, replaceState, popstate, hashchange). Query parameters are stripped by default when grouping pages for insights, but full paths are logged.
  - **API Calls**: Intercepts `fetch` requests to log URL, method, duration, status code, and request/response bodies (for text-based content).
  - **Component Renders**: Logs mount, unmount, and update events for key components (example provided for `MonitoringDashboard` itself, can be extended).
  - **JavaScript Errors**: Captures global errors (`window.onerror`) and unhandled promise rejections.
  - **Custom Events**: Allows the host application to log specific, meaningful events.
- **Persistent Storage**: Uses **IndexedDB** to store logs, ensuring data persistence across sessions up to a configurable limit (`MAX_LOG_ENTRIES`).
- **Real-time UI**:
  - Dashboard with summary cards (total API calls, errors, page views, etc.).
  - Line chart for page navigation over time.
  - Bar chart for average API call durations per endpoint.
  - **Page-Based Drill-Down**:
    - "Page Insights" section listing unique pages (grouped by path without query parameters) with aggregated metrics.
    - Click a page to view its individual visits.
    - Click a visit to filter all logs and stats specifically for that page/visit.
  - **Component Performance Hotspots**: Identifies components by render frequency and average render duration.
  - Detailed activity log list with filtering by log type and text search.
- **Log Management**:
  - Clear all logs from IndexedDB.
  - Download current (filtered) logs as a JSON file.
- **Monitoring Control**:
  - Toggle monitoring on/off. Status is persisted in `localStorage`.
- **Theming**:
  - Light/Dark mode toggle, persisted in `localStorage`.
  - Clean, modern, enterprise-grade design using plain CSS variables.
- **Responsive Design**: Mobile-friendly layout using flex/grid.
- **Accessibility**: Uses ARIA attributes and provides keyboard navigation for interactive elements.

## Getting Started / Integration

This tool is designed to be dropped into an existing React project.

### Prerequisites

- A React project (e.g., created with Vite, Create React App).

### Installation

1.  **Copy Files**: Copy all the provided source files (`.ts`, `.tsx` from `components`, `services`, `hooks`, `utils` folders and root files like `constants.ts`, `types.ts`) into a dedicated directory within your React project (e.g., `src/monitoring-tool/`).

    ```
    your-project/
    ├── src/
    │   ├── monitoring-tool/  <-- COPIED TOOL FILES HERE
    │   │   ├── components/
    │   │   ├── services/
    │   │   ├── hooks/
    │   │   ├── utils/
    │   │   ├── constants.ts
    │   │   └── types.ts
    │   ├── ... your other application files
    └── ...
    ```

    _Note: `App.tsx`, `index.tsx`, and `index.html` from the monitoring tool's source are primarily for its standalone example and demonstration. You'll integrate the tool's components into your existing project structure._

2.  **Adjust Paths (if necessary)**: If you place the files differently, ensure import paths within the monitoring tool files are correct. The provided structure assumes relative imports.

### Styling and Theming Integration (CRUCIAL STEP)

The monitoring tool uses self-contained CSS for its appearance, including light/dark themes. For the theme and colors to work correctly in your project:

1.  **Copy CSS Styles**:

    - Open the `index.html` file that came with the monitoring tool.
    - Locate the entire `<style> ... </style>` block within the `<head>` section.
    - Copy the **complete content** of this `<style>` block.

2.  **Paste Styles into Your Project**:

    - Paste these copied styles into your host project's main HTML file (often `public/index.html`, inside the `<head>`) OR into a global CSS file that is loaded by your application.
    - **Ensure CSS variables are defined**: The copied block includes a `:root { ... }` section which defines all necessary color variables, fonts, and shadows. These are essential.
    - **Ensure dark mode styles are present**: The styles also include rules like `html.dark body { ... }` and other `.icon-page-view` type classes that handle dark mode variations.

    **Why is this necessary?**
    The tool relies on these predefined CSS variables and utility classes. Without them, the `MonitoringDashboard` component won't be able to apply its theme colors or structure correctly. The theme toggle in the dashboard works by adding/removing a `dark` class to the `<html>` element, which these CSS rules then use.

### Usage

1.  **Import and Render the Dashboard**:
    The `MonitoringService` starts automatically when its file is imported. To display the UI, import and render the `MonitoringDashboard` component.

    In your main application component (e.g., `App.tsx` in your host project) or any specific component where you want the dashboard to appear:

    ```tsx
    // Example: In your project's App.tsx
    import React, { useEffect } from "react";
    // Assuming you copied the tool into 'src/monitoring-tool'
    import { MonitoringDashboard } from "./monitoring-tool/components/MonitoringDashboard";
    // Importing MonitoringService ensures it initializes, even if not directly used here.
    import { MonitoringService } from "./monitoring-tool/services/MonitoringService";
    // Optional: For initial theme loading from localStorage, similar to the tool's own App.tsx
    import { getItem as getLocalStorageItem } from "./monitoring-tool/utils/localStorageHelper";
    import { THEME_STORAGE_KEY } from "./monitoring-tool/constants";

    function YourMainApp() {
      // Your application's state and logic

      // Optional: Initialize theme based on localStorage on host app load
      useEffect(() => {
        const savedTheme = getLocalStorageItem<"light" | "dark">(
          THEME_STORAGE_KEY,
          "light"
        );
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }, []);

      // Example: Log a custom event when the main app mounts
      React.useEffect(() => {
        MonitoringService.logCustomEvent("HostAppMounted", {
          appName: "MyAwesomeWebApp",
        });
      }, []);

      return (
        <div>
          {/* Your existing application components */}
          <h1>My Awesome Web App</h1>
          <p>Welcome!</p>

          {/* Add the Monitoring Dashboard */}
          {/* It's recommended to render it conditionally or in a dedicated admin section */}
          {/* The dashboard will manage its own theme class toggling once initialized. */}
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              zIndex: 9999,
              width: "clamp(350px, 40vw, 700px)",
              height: "clamp(400px, 70vh, 800px)",
              boxShadow:
                "var(--shadow-lg)" /* Uses CSS var from copied styles */,
              border: "1px solid var(--border-light)" /* Uses CSS var */,
              borderRadius: "0.5rem",
              overflow: "hidden",
            }}
          >
            <MonitoringDashboard />
          </div>
        </div>
      );
    }

    export default YourMainApp;
    ```

    _Note: The `div` with inline styles is just an example of how you might want to "float" the dashboard. You can integrate it into your layout as you see fit. The `MonitoringDashboard` itself will correctly apply theme changes and use the CSS variables if they are available globally from the copied styles._

2.  **Logging Custom Events**:
    You can log application-specific events from anywhere in your codebase.

    ```tsx
    import { MonitoringService } from "./path/to/monitoring-tool/services/MonitoringService";

    function MyFeatureComponent() {
      const handleAction = () => {
        // ... perform action
        MonitoringService.logCustomEvent("UserPerformedAction", {
          actionName: "ButtonClicked",
          component: "MyFeatureComponent",
          value: 42,
        });
      };

      return <button onClick={handleAction}>Perform Action</button>;
    }
    ```

## Showcase / How it Works

The tool is self-contained. The `MonitoringDashboard` component is the single UI entry point you need to render. The `MonitoringService` automatically:

1.  **Initializes** itself when its module is first imported.
2.  **Overrides** `window.fetch` to intercept API calls.
3.  **Attaches** global error listeners.
4.  **Sets up** history API wrappers for route tracking.
5.  **Logs** an initial page view.

All collected data is stored in IndexedDB. The `MonitoringDashboard` then reads from this database (with real-time polling and event-driven updates) to display the logs, charts, and statistics.

**Visual Showcase (Description):**

When you integrate and run the `MonitoringDashboard`, you'll see a panel (stylable and positionable by you) typically at a corner of your application.

- **Header**: Title, monitoring status toggle (play/pause), theme toggle (sun/moon), clear logs (trash), download logs.
- **Summary Cards**: Quick counts for Page Views, API Calls, Errors, Component Renders, Custom Events.
- **Charts**:
  - A line chart showing page navigation frequency over time.
  - A bar chart showing average API call durations for the top 5 slowest endpoints.
- **Component Performance**: Lists of components that render most frequently or take the longest on average.
- **Page Insights**: A list of all unique pages visited (query parameters are stripped for grouping). Clicking a page:
  - Filters the summary cards and charts to that page's context.
  - Shows a list of individual "visits" to that page.
  - Clicking a specific visit further filters all data to that single session.
- **Activity Log**:
  _ A filterable (by type) and searchable list of all log entries.
  _ Each log item shows its type (with an icon), relevant data, and timestamp. \* Expandable sections for API calls (to see request/response bodies) and errors (to see stack traces).
  The entire UI is responsive and adapts to light/dark themes based on user selection. Styling is done with plain CSS variables copied into your project.

## Technical Details

- **Core UI**: `components/MonitoringDashboard.tsx`
- **Core Logic**: `services/MonitoringService.ts`
- **Data Storage**: `utils/indexedDB.ts` (uses IndexedDB directly, no wrapper library)
- **State Management**: React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) and a custom hook `hooks/useIndexedDB.ts`.
- **Styling**: Plain CSS using variables (expected to be copied from the tool's `index.html` into your project).

## Development & Customization

- **Component Tracking**: To track your own components' render times, you can use `MonitoringService.logComponentRender()` in their `useEffect` hooks (similar to how `MonitoringDashboard` tracks itself).
- **Configuration**: Constants like `MAX_LOG_ENTRIES` and `POLLING_INTERVAL` can be adjusted in `constants.ts`.
- **Extending**: New log types or data visualizations can be added by extending `types.ts`, `MonitoringService.ts`, and `MonitoringDashboard.tsx`.

This tool provides a solid foundation for in-app monitoring and can be extended further based on specific project needs.
