
// This script assumes it's being run from the root of the project or a similar context
// where the paths to test files are relative to `process.cwd()`.

import { runTests } from './test-utils/test-helpers';

// Manually import all test files
// In a larger project, you'd use a dynamic import or a build step to collect these.
import './utils/localStorageHelper.test';
import './utils/indexedDB.test';
import './services/MonitoringService.test';
import './hooks/useIndexedDB.test';
import './components/SimpleBarChart.test';
import './components/SimpleLineChart.test';
import './components/MonitoringDashboard.test';
import './components/TestRequestPanel.test';
import './store/index.test';

async function main() {
  try {
    // test-utils/test-helpers.ts already initializes mocks for Node.js environment upon its import.
    // No need to re-initialize here.
    
    await runTests();
    console.log("Test execution script finished.");
  } catch (error) {
    console.error("Error running test script:", error);
    if (typeof process !== 'undefined' && (process as any).exit && (process as any).exitCode !== undefined) {
        (process as any).exitCode = 1; // Indicate failure
    }
  }
}

main().catch(e => {
    console.error("Unhandled error in main test runner:", e);
    if (typeof process !== 'undefined' && (process as any).exit && (process as any).exitCode !== undefined) {
        (process as any).exitCode = 1; // Indicate failure
    }
});
