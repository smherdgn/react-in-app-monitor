
import React from 'react';

// --- STYLE DEFINITIONS ---
export const garantiBlue = '#004F9F';
export const garantiGreen = '#00A551';
export const garantiRed = '#D92C2C';
export const garantiOrange = '#FF8A00';
export const garantiDarkGray = '#333333';
export const garantiMediumGray = '#5F6A74';
export const garantiLightGray = '#EAEFF3';
export const garantiBackground = '#F5F8FA';
export const garantiWhite = '#FFFFFF';
export const timelineComponentColor = '#3498DB'; // Example: Blue for components
export const timelineApiColor = '#F1C40F';      // Example: Yellow for API calls
export const timelineErrorColor = '#E74C3C';    // Example: Red for errors
export const timelineRouteColor = '#2ECC71';    // Example: Green for routes


export const GlobalStylesComponent: React.FC = () => (
  <style>{`
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      background-color: ${garantiBackground};
      color: ${garantiDarkGray};
      line-height: 1.6;
      font-size: 16px; /* Base font size for responsiveness */
    }
    * {
      box-sizing: border-box;
    }
    .monitoring-dashboard {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-height: 100vh; /* Ensure it doesn't exceed viewport height */
      width: 100%;
    }
    .dashboard-header {
      background-color: ${garantiBlue};
      color: ${garantiWhite};
      padding: 12px 20px;
      display: flex;
      flex-wrap: wrap; /* Allow wrapping for smaller screens */
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      gap: 10px; /* Space between title and controls */
    }
    .dashboard-header h1 {
      margin: 0;
      font-size: 1.3em; /* Adjusted for responsiveness */
    }
    .dashboard-nav {
      background-color: ${garantiBlue};
      padding: 8px 20px;
      display: flex;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border-top: 1px solid #003A70;
      overflow-x: auto; /* Allow horizontal scrolling on small screens */
      white-space: nowrap; /* Keep buttons on one line */
    }
    .dashboard-nav button {
      background-color: transparent;
      color: #BCCFE0;
      border: none;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 0.9em;
      border-radius: 4px;
      transition: background-color 0.2s, color 0.2s;
      flex-shrink: 0; /* Prevent buttons from shrinking too much */
    }
    .dashboard-nav button.active, .dashboard-nav button:hover {
      background-color: ${garantiGreen};
      color: ${garantiWhite};
    }
    .dashboard-controls {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap; /* Allow controls to wrap */
    }
    .dashboard-controls button {
      background-color: ${garantiRed};
      color: ${garantiWhite};
      border: none;
      padding: 7px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      transition: background-color 0.2s;
      white-space: nowrap; /* Prevent text wrapping inside button */
    }
    .dashboard-controls button:hover { opacity: 0.85; }
    .dashboard-controls button.refresh { background-color: ${garantiGreen}; }
    .dashboard-controls button.monitoring-toggle { background-color: ${garantiOrange}; }
    .dashboard-content {
      flex-grow: 1;
      padding: 20px;
      overflow-y: auto;
      background-color: ${garantiWhite};
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 0.85em; /* Adjusted for readability */
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      word-break: break-word; /* Prevent long strings from breaking layout */
    }
    .log-table th, .log-table td {
      border: 1px solid ${garantiLightGray};
      padding: 8px 10px; /* Adjusted padding */
      text-align: left;
      vertical-align: top; /* Better for multi-line content */
    }
    .log-table th {
      background-color: #F0F3F5;
      font-weight: 600;
      color: ${garantiBlue};
      position: sticky; /* Make headers sticky if table scrolls */
      top: 0;
      z-index: 1;
    }
    .log-table tr:nth-child(even) { background-color: #F9FAFB; }
    .log-table tr:hover { background-color: #f0f3f5; }
    .log-table td.error { color: ${garantiRed}; font-weight: 500; }
    .log-table td.success { color: ${garantiGreen}; font-weight: 500; }
    .error-stack {
      white-space: pre-wrap;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85em;
      background-color: #FEF2F2;
      padding: 8px;
      border-radius: 4px;
      max-height: 180px; /* Adjusted height */
      overflow-y: auto;
      border: 1px solid #F8D7DA;
      color: ${garantiDarkGray};
    }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* Smaller min for more columns */
      gap: 15px; /* Adjusted gap */
    }
    .overview-card {
      background-color: ${garantiWhite};
      padding: 15px; /* Adjusted padding */
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(50,50,93,0.08), 0 1px 3px rgba(0,0,0,0.05);
      border-left-width: 5px;
      border-left-style: solid;
      cursor: pointer;
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    .overview-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(50,50,93,0.12), 0 2px 6px rgba(0,0,0,0.08);
    }
    .overview-card h3 {
      margin-top: 0;
      color: ${garantiBlue};
      font-size: 1em; /* Adjusted font size */
      margin-bottom: 8px;
    }
    .overview-card p {
      font-size: 1.6em; /* Adjusted font size */
      margin: 5px 0 0;
      color: ${garantiDarkGray};
      font-weight: 600;
    }
    .svg-chart-container {
      margin-top: 25px;
      padding: 15px;
      background-color: ${garantiWhite};
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(50,50,93,0.08), 0 1px 3px rgba(0,0,0,0.05);
      overflow-x: auto; /* Allow chart to scroll if too wide */
    }
    .svg-chart-container h3 { margin-top: 0; color: ${garantiBlue}; font-size: 1.1em; margin-bottom: 10px; }
    .page-detail-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      gap: 10px;
    }
    .page-detail-header h2 {
      color: ${garantiBlue};
      margin: 0;
      font-size: 1.2em;
    }
    .page-detail-header button {
      background-color: ${garantiMediumGray};
      color: ${garantiWhite};
      font-size: 0.85em;
      padding: 7px 12px;
    }
    .log-detail-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 15px; /* Padding for small screens */
    }
    .log-detail-modal-content {
      background-color: ${garantiWhite};
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 600px;
      max-height: 90vh; /* Use viewport height */
      overflow-y: auto;
    }
    .log-detail-modal-content h3 {
      color: ${garantiBlue};
      margin-top: 0;
      border-bottom: 1px solid ${garantiLightGray};
      padding-bottom: 10px;
      margin-bottom: 15px;
      font-size: 1.2em;
    }
    .log-detail-modal-content p { margin: 8px 0; line-height: 1.5; font-size: 0.9em; }
    .log-detail-modal-content strong { color: ${garantiMediumGray}; }
    .log-detail-modal-content pre {
      background-color: ${garantiLightGray};
      padding: 10px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 0.85em;
      max-height: 200px;
      overflow-y: auto;
    }
    .log-detail-modal-close-button {
      background-color: ${garantiRed};
      color: ${garantiWhite};
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      transition: background-color 0.2s;
      float: right;
      margin-top: 15px;
    }
    .log-detail-modal-close-button:hover { opacity:0.85; }

    /* Timeline Chart Specific Styles */
    .timeline-chart-svg {
      user-select: none; /* Prevent text selection during interaction */
    }
    /* Group for circle and text */
    .timeline-event-item { 
      cursor: pointer;
      transition: opacity 0.1s ease-in-out;
    }
    .timeline-event-item .timeline-event-marker { /* The circle */
      transition: opacity 0.2s, r 0.2s; /* r for radius, if animated */
    }
    .timeline-event-item .timeline-event-label { /* The text label */
      transition: fill 0.2s, font-weight 0.2s;
    }
    .timeline-event-item:hover .timeline-event-marker {
      opacity: 0.7;
      /* r: current_radius + 1px; Example: this needs JS or complex CSS if possible */
    }
    .timeline-event-item:hover .timeline-event-label {
      font-weight: bold;
      fill: ${garantiBlue}; 
    }

    .timeline-axis path, .timeline-axis line {
        fill: none;
        stroke: ${garantiMediumGray};
        shape-rendering: crispEdges;
    }
    .timeline-axis text {
        fill: ${garantiMediumGray};
        font-size: 10px;
    }
    .timeline-tooltip {
        position: absolute;
        background-color: rgba(30,30,30,0.85); /* Darker, slightly less transparent */
        color: white;
        padding: 8px 12px;
        border-radius: 5px;
        font-size: 0.85em; /* Slightly larger for readability */
        pointer-events: none; /* Allow clicks to pass through to SVG elements */
        opacity: 0;
        transition: opacity 0.15s ease-in-out;
        white-space: pre-wrap; /* Changed from nowrap to pre-wrap for multi-line */
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1001; /* Ensure it's above other dashboard elements */
    }
    .timeline-tooltip pre { /* Style for pre inside tooltip */
        margin: 0;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
    }


    /* Responsive adjustments */
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .dashboard-nav {
        padding: 8px 10px; /* Smaller padding on mobile */
      }
       .dashboard-nav button {
        padding: 8px;
        font-size: 0.85em;
      }
      .dashboard-content {
        padding: 15px;
      }
      .log-table {
        font-size: 0.75em; /* Smaller font for tables on mobile */
      }
      .log-table th, .log-table td {
        padding: 6px 8px;
      }
      .overview-grid {
        grid-template-columns: 1fr; /* Stack cards on mobile */
      }
      .overview-card p {
        font-size: 1.4em;
      }
      .timeline-axis text { font-size: 9px; } /* Smaller axis text */
      .timeline-event-item .timeline-event-label { font-size: 8px; } /* Smaller event labels on timeline */

    }
    @media (max-width: 480px) {
      .dashboard-header h1 {
        font-size: 1.1em;
      }
      .dashboard-controls button {
        padding: 6px 10px;
        font-size: 0.75em;
      }
      .log-detail-modal-content {
        padding: 15px;
      }
      .log-detail-modal-content h3 {
        font-size: 1.1em;
      }
      .timeline-tooltip {
        font-size: 0.75em; /* Smaller tooltip on very small screens */
        padding: 6px 10px;
      }
    }
  `}</style>
);