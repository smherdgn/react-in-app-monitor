
# In-App React Monitoring Tool

A fully self-contained, embeddable React in-app monitoring tool with zero external npm dependencies. Designed for easy integration into any existing React/Vite project.

## Key Features

*   **Zero External Dependencies**: No `npm install` needed for this tool. It's built with vanilla React and browser APIs.
*   **Automatic Data Collection**:
    *   **Page Navigation**: Tracks route changes (pushState, replaceState, popstate, hashchange). Query parameters are stripped by default when grouping pages for insights, but full paths are logged.
    *   **API Calls**: Intercepts `fetch` requests to log URL, method, duration, status code, and request/response bodies (for text-based content).
    *   **Component Renders**: Logs mount, unmount, and update events for key components (example provided for `MonitoringDashboard` itself, can be extended).
    *   **JavaScript Errors**: Captures global errors (`window.onerror`) and unhandled promise rejections.
    *   **Custom Events**: Allows the host application to log specific, meaningful events.
*   **Persistent Storage**: Uses **IndexedDB** to store logs, ensuring data persistence across sessions up to a configurable limit (`MAX_LOG_ENTRIES`).
*   **Real-time UI**:
    *   Dashboard with summary cards (total API calls, errors, page views, etc.).
    *   Line chart for page navigation over time.
    *   Bar chart for average API call durations per endpoint.
    *   **Page-Based Drill-Down**:
        *   "Page Insights" section listing unique pages (grouped by path without query parameters) with aggregated metrics.
        *   Click a page to view its individual visits.
        *   Click a visit to filter all logs and stats specifically for that page/visit.
    *   **Component Performance Hotspots**: Identifies components by render frequency and average render duration.
    *   Detailed activity log list with filtering by log type and text search.
*   **Log Management**:
    *   Clear all logs from IndexedDB.
    *   Download current (filtered) logs as a JSON file.
*   **Monitoring Control**:
    *   Toggle monitoring on/off. Status is persisted in `localStorage`.
*   **Theming**:
    *   Light/Dark mode is externally controlled via a `theme: 'light' | 'dark'` prop passed to the `MonitoringDashboard`. Styling is encapsulated within the component.
*   **Responsive Design**: Mobile-friendly layout.
*   **Accessibility**: Uses ARIA attributes and provides keyboard navigation for interactive elements.

## Exporting Logs
Use the download icon in the dashboard header to export the currently filtered logs as a JSON file for offline analysis or sharing.

## Live Demo & Local Showcase

You can see a live demo of the monitoring tool in action here:
**[LINK TO GITHUB PAGES DEMO - To be added after deploying to GitHub Pages]**

### Running the Showcase Locally

The `App.tsx` in this repository serves as a live showcase demonstrating how to integrate and use the `MonitoringDashboard`. To run it locally:

1.  **Clone this repository**:
    ```bash
    git clone <repository-url>
    ```
2.  **Navigate to the cloned directory**:
    ```bash
    cd <repository-name>
    ```
3.  **Serve the files**: Since this project has no build step and uses ESM via import maps, you need to serve the files using a simple HTTP server.
    *   Using `serve` (you might need to install it first: `npm install -g serve`):
        ```bash
        serve .
        ```
    *   Or using Python's built-in HTTP server (Python 3):
        ```bash
        python -m http.server
        ```
    *   Or any other simple HTTP server that can serve static files from the root directory.
4.  **Open your browser** and navigate to `http://localhost:<port>` (the port will be shown by your server, typically 3000, 5000, or 8000).

The `App.tsx` file demonstrates:
*   Rendering the `<MonitoringDashboard />`.
*   Controlling the dashboard's theme (light/dark) via props.
*   Interacting with `MonitoringService` to log custom events, and it implicitly showcases automatic tracking of navigation, errors, etc., as you interact with the demo page (if demo interactions are added to App.tsx).
*   A `<TestRequestPanel />` with buttons that fire example API requests and trigger a test error so you can immediately see logs populate in the dashboard.

## Getting Started / Integration

This tool is designed to be dropped into an existing React project.

### Prerequisites

*   A React project (e.g., created with Vite, Create React App).

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
    *Note: The `App.tsx`, `index.tsx`, and `index.html` from the monitoring tool's source are primarily for its standalone example and demonstration. You'll integrate the tool's components into your existing project structure.*

2.  **Adjust Paths (if necessary)**: If you place the files differently, ensure import paths within the monitoring tool files are correct. The provided structure assumes relative imports.

### Styling and Theming Integration

The `MonitoringDashboard` component manages its own styling and theming (light/dark modes) internally. To control the theme:

1.  **Pass the `theme` Prop**: The host application must pass a `theme` prop to the `<MonitoringDashboard />` component. This prop determines whether the dashboard renders in light or dark mode.
    *   Allowed values: `'light'` or `'dark'`.

    ```tsx
    // In your host application component
    import { MonitoringDashboard } from './monitoring-tool/components/MonitoringDashboard';
    import React, { useState } from 'react';

    function YourApp() {
      const [currentAppTheme, setCurrentAppTheme] = useState<'light' | 'dark'>('light');

      // Logic to toggle currentAppTheme (e.g., a button in your app)
      const toggleAppTheme = () => {
        setCurrentAppTheme(prev => prev === 'light' ? 'dark' : 'light');
      };

      return (
        <div>
          {/* Your app's theme toggle button */}
          <button onClick={toggleAppTheme}>
            Switch to {currentAppTheme === 'light' ? 'Dark' : 'Light'} Theme
          </button>

          {/* Render the dashboard, passing the theme prop */}
          <MonitoringDashboard theme={currentAppTheme} />
        </div>
      );
    }
    ```

2.  **Host Application Manages Theme State**: Your application is responsible for managing the overall theme state (e.g., using `React.useState`, `localStorage`, or a global state manager) and passing the current theme selection to the `MonitoringDashboard`.

3.  **Global Font (Optional but Recommended)**:
    While the dashboard encapsulates most of its styling, you might want to ensure a consistent base font across your application and the dashboard. The monitoring tool's original `index.html` defines a system font stack:
    ```css
    html {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    }
    ```
    If your host application doesn't already have a similar global font definition, you might consider adding this to your main CSS file or HTML file for visual consistency. The dashboard itself will use this font if it's globally available.

### Usage

1.  **Import and Render the Dashboard**:
    The `MonitoringService` starts automatically when its file is imported. To display the UI, import and render the `MonitoringDashboard` component, passing the `theme` prop.

    In your main application component (e.g., `App.tsx` in your host project):

    ```tsx
    // Example: In your project's App.tsx
    import React, { useState, useEffect } from 'react';
    // Assuming you copied the tool into 'src/monitoring-tool'
    import { MonitoringDashboard } from './monitoring-tool/components/MonitoringDashboard';
    // Importing MonitoringService ensures it initializes.
    import { MonitoringService } from './monitoring-tool/services/MonitoringService';
    import { getItem as getLocalStorageItem, setItem as setLocalStorageItem } from './monitoring-tool/utils/localStorageHelper';
    import { THEME_STORAGE_KEY } from './monitoring-tool/constants';


    function YourMainApp() {
      const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => {
        return getLocalStorageItem<'light' | 'dark'>(THEME_STORAGE_KEY, 'light');
      });

      useEffect(() => {
        setLocalStorageItem(THEME_STORAGE_KEY, appTheme);
        // Optional: If your app's body also needs a class for theming
        if (appTheme === 'dark') {
          document.body.classList.add('your-app-dark-theme');
          document.body.classList.remove('your-app-light-theme');
        } else {
          document.body.classList.add('your-app-light-theme');
          document.body.classList.remove('your-app-dark-theme');
        }
      }, [appTheme]);

      const toggleThemeForAppAndDashboard = () => {
        setAppTheme(prev => prev === 'light' ? 'dark' : 'light');
      };
      
      // Example: Log a custom event when the main app mounts
      React.useEffect(() => {
        MonitoringService.logCustomEvent("HostAppMounted", { appName: "MyAwesomeWebApp" });
      }, []);

      return (
        <div>
          <h1>My Awesome Web App</h1>
          <button onClick={toggleThemeForAppAndDashboard}>
            Toggle App & Dashboard Theme (Currently: {appTheme})
          </button>
          
          {/* Add the Monitoring Dashboard */}
          <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            zIndex: 9999, 
            width: 'clamp(350px, 40vw, 700px)', 
            height: 'clamp(400px, 70vh, 800px)',
            // Basic container styling; the dashboard itself handles its internal theme.
            // You might want to adjust border/shadow based on your app's theme.
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            border: '1px solid #ccc', 
            borderRadius: '0.5rem',
            overflow: 'hidden' 
          }}>
             <MonitoringDashboard theme={appTheme} />
          </div>
        </div>
      );
    }

    export default YourMainApp;
    ```
    *Note: The `div` with inline styles is just an example of how you might want to "float" the dashboard. The `MonitoringDashboard` will apply its theme based on the `theme` prop.*

2.  **Logging Custom Events**:
    You can log application-specific events from anywhere in your codebase.

    ```tsx
    import { MonitoringService } from './path/to/monitoring-tool/services/MonitoringService';

    function MyFeatureComponent() {
      const handleAction = () => {
        // ... perform action
        MonitoringService.logCustomEvent(
          'UserPerformedAction',
          { actionName: 'ButtonClicked', component: 'MyFeatureComponent', value: 42 }
        );
      };

      return <button onClick={handleAction}>Perform Action</button>;
    }
    ```

### Exporting to Another Project

You can either copy the source files directly or package the tool as a small npm
dependency.

#### 1. Manual copy

Run `npm run prepare-export`. This command collects all the relevant source
files (`components/`, `services/`, `hooks/`, `utils/`, `constants.ts`, and
`types.ts`) into a new `export/` folder.

Copy that folder into your other project's source directory:

```bash
cp -r export/ your-other-project/src/monitoring-tool
```

Import the dashboard component using a relative path:

```tsx
import { MonitoringDashboard } from './monitoring-tool/components/MonitoringDashboard';
```

#### 2. Package as an npm dependency

1.  Run `npm run build` to generate a `dist/` folder with compiled JavaScript
    files.
2.  Create a tarball with `npm pack`. The command outputs a file such as
    `in-app-monitoring-tool-0.0.0.tgz` in the project root.
3.  In your other project, install the tarball:

 
If you want to maintain this monitoring tool as a separate repository and reuse
it across multiple projects, you can package it as a small npm dependency:

1.  Run `npm run build` inside this repository. This generates a `dist/` folder
    with the compiled JavaScript files.
2.  Create a tarball with `npm pack`. The command outputs a file like
    `in-app-monitoring-tool-0.0.0.tgz` in the project root.
3.  In another project, install the tarball directly:


 
    ```bash
    npm install ../path/to/in-app-monitoring-tool-0.0.0.tgz
    ```

    (You can also publish the tarball to a private registry and install from
    there.)
4.  Import the dashboard component from the package:

    ```tsx
    import { MonitoringDashboard } from 'in-app-monitoring-tool';
    ```
 
Both approaches keep the monitoring code isolated so you can update it
independently of your host applications.
 

## Showcase / How it Works

The tool is self-contained. The `MonitoringDashboard` component is the single UI entry point you need to render. The `MonitoringService` automatically:

1.  **Initializes** itself when its module is first imported.
2.  **Overrides** `window.fetch` to intercept API calls.
3.  **Attaches** global error listeners.
4.  **Sets up** history API wrappers for route tracking.
5.  **Logs** an initial page view.

All collected data is stored in IndexedDB. The `MonitoringDashboard` then reads from this database (with real-time polling and event-driven updates) to display the logs, charts, and statistics. Its appearance (light/dark mode) is determined by the `theme` prop passed by the host application.

**Visual Showcase (Description):**

When you integrate and run the `MonitoringDashboard`, you'll see a panel (stylable and positionable by you) typically at a corner of your application.
*   **Header**: Title, monitoring status toggle (play/pause), clear logs (trash), download logs. (The theme toggle is now managed by the host application).
*   **Summary Cards**: Quick counts for Page Views, API Calls, Errors, Component Renders, Custom Events.
*   **Charts**:
    *   A line chart showing page navigation frequency over time.
    *   A bar chart showing average API call durations for the top 5 slowest endpoints.
*   **Component Performance**: Lists of components that render most frequently or take the longest on average.
*   **Page Insights**: A list of all unique pages visited (query parameters are stripped for grouping). Clicking a page:
    *   Filters the summary cards and charts to that page's context.
    *   Shows a list of individual "visits" to that page.
    *   Clicking a specific visit further filters all data to that single session.
*   **Activity Log**:
    *   A filterable (by type) and searchable list of all log entries.
    *   Each log item shows its type (with an icon), relevant data, and timestamp.
    *   Expandable sections for API calls (to see request/response bodies) and errors (to see stack traces).
The entire UI is responsive and adapts to light/dark themes based on the `theme` prop. Styling is encapsulated within the component.

## Technical Details

*   **Core UI**: `components/MonitoringDashboard.tsx`
*   **Core Logic**: `services/MonitoringService.ts`
*   **Data Storage**: `utils/indexedDB.ts` (uses IndexedDB directly, no wrapper library)
*   **State Management**: React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) and a custom hook `hooks/useIndexedDB.ts`.
*   **Styling**: Encapsulated inline styles and JavaScript style objects within `MonitoringDashboard.tsx` and its child components, driven by the `theme` prop.

## Development & Customization

*   **Component Tracking**: To track your own components' render times, you can use `MonitoringService.logComponentRender()` in their `useEffect` hooks (similar to how `MonitoringDashboard` tracks itself).
*   **Configuration**: Constants like `MAX_LOG_ENTRIES` and `POLLING_INTERVAL` can be adjusted in `constants.ts`.
*   **Extending**: New log types or data visualizations can be added by extending `types.ts`, `MonitoringService.ts`, and `MonitoringDashboard.tsx`.

This tool provides a solid foundation for in-app monitoring and can be extended further based on specific project needs.

## License

This project is licensed under the [MIT License](LICENSE).
