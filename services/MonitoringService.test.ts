
import { MonitoringService as serviceInstance } from './MonitoringService'; 
import { LogEntryType, ApiCallLogData, PageViewLogData, ComponentRenderLogData, ErrorLogData, CustomEventLogData, ComponentEventType } from '../types';
import { DB_CONFIG } from '../constants';
import { describe, it, expect, beforeEach, afterEach, mockFn, mockWindow, mockIndexedDB, mockPerformance, mockLocalStorage, jest as customJest, MockFunction } from '../test-utils/test-helpers';

import * as idbUtils from '../utils/indexedDB';


describe('MonitoringService', () => {
  let mockWin: any;
  let mockPerf: any;
  let openMonitoringDBSpy: MockFunction<any>;
  let addLogEntryToDBSpy: MockFunction<any>;


  const resetServiceState = () => {
      serviceInstance.stop(); 
      (serviceInstance as any).currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search + window.location.hash) : '/'; // Reset path
      serviceInstance.start(); 
  };


  beforeEach(async () => {
    mockWin = mockWindow();
    mockPerf = mockPerformance();
    mockLocalStorage(); 
    mockIndexedDB(); 
    
    openMonitoringDBSpy = customJest.spyOn(idbUtils, 'openMonitoringDB').mockResolvedValue({
        name: DB_CONFIG.dbName,
        version: DB_CONFIG.version,
        objectStoreNames: { contains: () => true },
        transaction: () => ({
          objectStore: () => ({
            add: mockFn(async () => {}),
          }),
        }),
        close: mockFn(),
      } as any);

    addLogEntryToDBSpy = customJest.spyOn(idbUtils, 'addLogEntryToDB').mockResolvedValue(undefined);

    // Clear mocks for window/global objects
    (window.dispatchEvent as MockFunction<any>).mock.mockClear();
    // window.fetch is mocked by mockWindow, ensure it's a fresh mock function for each test
    // This is important if mockWindow's fetch is reused across tests.
    // If mockWindow creates a new fetch mock each time, this might not be strictly needed, but it's safer.
    if ((window.fetch as MockFunction<any>).mock && (window.fetch as MockFunction<any>).mock.mockClear) {
        (window.fetch as MockFunction<any>).mock.mockClear();
    } else { // If it's not a mockFn from our helper (e.g. native or other mock)
        window.fetch = mockFn(async () => new Response(null, {status: 200}));
    }
    
    if ((window.history.pushState as MockFunction<any>).mock && (window.history.pushState as MockFunction<any>).mock.mockClear) {
        (window.history.pushState as MockFunction<any>).mock.mockClear();
    } else {
        window.history.pushState = mockFn();
    }


    resetServiceState(); 
  });

  afterEach(() => {
    serviceInstance.stop(); 
    openMonitoringDBSpy.mock.mockRestore?.();
    addLogEntryToDBSpy.mock.mockRestore?.();
    // Restore other spies if any
  });

  const expectLogAdded = (type: LogEntryType, dataMatcher: object) => {
    expect(idbUtils.addLogEntryToDB).toHaveBeenCalledTimes(1);
    const callArgs = (idbUtils.addLogEntryToDB as MockFunction<any>).mock.calls[0];
    expect(callArgs[1].type).toBe(type);
    expect(callArgs[1].data).toMatchObject(dataMatcher);
    expect(callArgs[1].id).toBeDefined();
    expect(callArgs[1].timestamp).toBeDefined();
    expect(window.dispatchEvent).toHaveBeenCalledWith((expect as any).any(CustomEvent)); // Using custom expect.any
    expect(((window.dispatchEvent as MockFunction<any>).mock.calls[0][0] as CustomEvent).type).toBe('monitoring_new_log');
  };
  
  it('should log an initial page view on instantiation', () => {
    // This is hard to test directly for the *very first* instantiation due to singleton nature.
    // We check if it has been called with the initial path.
    // The beforeEach resets spies, so we'd need to check calls before reset or adjust the test structure.
    // For now, assume the constructor logic works and subsequent path changes are tested.
    // The service is re-initialized effectively by `resetServiceState` which calls start/stop.
    // The initial call happens when the module is loaded, before spies are set up by `beforeEach`.
    // So, to test this, we'd need to spy BEFORE the service is first imported/instantiated, or test currentPath.
    
    // Check current state (after resetServiceState which includes a start())
    const initialPath = window.location.pathname + window.location.search + window.location.hash;
    const calls = (idbUtils.addLogEntryToDB as MockFunction<any>).mock.calls;
    const initialPageViewCall = calls.find(
        (call: any[]) => call[1].type === LogEntryType.PAGE_VIEW && call[1].data.path === initialPath
    );
    // This will likely be true due to how resetServiceState works (it calls start, which might log if path is considered new)
    // or due to the service's constructor if it's the first time.
    expect(initialPageViewCall).toBeDefined(); 
  });


  describe('Logging Methods', () => {
    it('logPageView should add a PAGE_VIEW log', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear(); 
      const data: PageViewLogData = { path: '/test', referrer: '/prev' };
      serviceInstance.logPageView(data.path, data.referrer);
      expectLogAdded(LogEntryType.PAGE_VIEW, data);
    });

    it('logApiCall should add an API_CALL log', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const data: ApiCallLogData = { url: '/api/data', method: 'GET', duration: 100, statusCode: 200 };
      serviceInstance.logApiCall(data);
      expectLogAdded(LogEntryType.API_CALL, data);
    });

    it('logComponentRender should add a COMPONENT_RENDER log', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const data: ComponentRenderLogData = { componentName: 'TestComp', duration: 10, eventType: ComponentEventType.MOUNT };
      serviceInstance.logComponentRender(data);
      expectLogAdded(LogEntryType.COMPONENT_RENDER, data);
    });

    it('logError should add an ERROR log', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const data: ErrorLogData = { message: 'Test error', source: 'test' };
      serviceInstance.logError(data);
      expectLogAdded(LogEntryType.ERROR, data);
    });

    it('logCustomEvent should add a CUSTOM_EVENT log', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const data: CustomEventLogData = { eventName: 'TestEvent', details: { info: 'abc' } };
      serviceInstance.logCustomEvent(data.eventName, data.details);
      expectLogAdded(LogEntryType.CUSTOM_EVENT, data);
    });

    it('should not log if service is stopped', () => {
        serviceInstance.stop();
        (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
        serviceInstance.logPageView('/stopped', '/prev');
        expect(idbUtils.addLogEntryToDB).not.toHaveBeenCalled();
        serviceInstance.start(); 
    });
  });

  describe('Global Error Handlers', () => {
    it('should log global errors via window.onerror', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const errorEvent = new ErrorEvent('error', {
        message: 'Global error occurred',
        error: new Error('Global error occurred'),
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });
      if(errorEvent.error) (errorEvent.error as any).stack = "Error: Global error occurred\n at test.js:10:5";

      const errorListener = (mockWin.addEventListener as MockFunction<any>).mock.calls.find((call: any[]) => call[0] === 'error')[1];
      errorListener(errorEvent);

      expectLogAdded(LogEntryType.ERROR, {
        message: 'Global error occurred',
        stack: "Error: Global error occurred\n at test.js:10:5",
        source: 'global_error:test.js:10:5',
      });
    });

    it('should log unhandled promise rejections', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Promise rejected')),
        reason: new Error('Promise rejected'),
      });
      if(rejectionEvent.reason) (rejectionEvent.reason as any).stack = "Error: Promise rejected\n at somePromise:1:1";
      
      const rejectionListener = (mockWin.addEventListener as MockFunction<any>).mock.calls.find((call: any[]) => call[0] === 'unhandledrejection')[1];
      rejectionListener(rejectionEvent);

      expectLogAdded(LogEntryType.ERROR, {
        message: 'Promise rejected',
        stack: "Error: Promise rejected\n at somePromise:1:1",
        source: 'unhandled_rejection',
      });
    });

     it('should handle non-Error promise rejections', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('Simple string rejection'),
        reason: 'Simple string rejection',
      });
      
      const rejectionListener = (mockWin.addEventListener as MockFunction<any>).mock.calls.find((call: any[]) => call[0] === 'unhandledrejection')[1];
      rejectionListener(rejectionEvent);

      expectLogAdded(LogEntryType.ERROR, {
        message: 'Simple string rejection',
        source: 'unhandled_rejection',
      });
    });
  });

  describe('Fetch Override', () => {
    // window.fetch is already mocked by mockWindow and reset in beforeEach

    it('should intercept fetch calls and log API_CALL data on success', async () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const mockResponse = new (window as any).Response(JSON.stringify({ data: 'success' }), { status: 200, headers: {'Content-Type': 'application/json'} });
      (window.fetch as MockFunction<any>).mockResolvedValueOnce(mockResponse);
      
      await window.fetch('/api/test-success', { method: 'POST', body: '{"key":"value"}' });

      expect(window.fetch).toHaveBeenCalledTimes(1); // This is the mocked window.fetch from mockWindow
      expectLogAdded(LogEntryType.API_CALL, {
        url: '/api/test-success',
        method: 'POST',
        statusCode: 200,
        requestBody: '{"key":"value"}',
        responseBody: '{"data":"success"}',
      });
      expect((idbUtils.addLogEntryToDB as MockFunction<any>).mock.calls[0][1].data.duration).toBeGreaterThan(0);
    });

    it('should intercept fetch calls and log API_CALL data on failure', async () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const fetchError = new TypeError('Network error');
      (window.fetch as MockFunction<any>).mockRejectedValueOnce(fetchError);

      try {
        await window.fetch('/api/test-fail');
      } catch (e) {
        expect(e).toBe(fetchError);
      }

      expect(window.fetch).toHaveBeenCalledTimes(1);
      expectLogAdded(LogEntryType.API_CALL, {
        url: '/api/test-fail',
        method: 'GET',
        statusCode: 0,
        error: 'Network error',
      });
       expect((idbUtils.addLogEntryToDB as MockFunction<any>).mock.calls[0][1].data.duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should correctly handle Request object as input to fetch', async () => {
        (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
        const request = new Request('/api/request-obj', {method: 'PUT', body: 'req-body', headers: {'Content-Type': 'text/plain'}});
        const mockResponse = new (window as any).Response("OK", { status: 200, headers: {'Content-Type': 'text/plain'} });
        (window.fetch as MockFunction<any>).mockResolvedValueOnce(mockResponse);

        await window.fetch(request);

        expect(window.fetch).toHaveBeenCalledTimes(1);
        expectLogAdded(LogEntryType.API_CALL, {
            url: '/api/request-obj',
            method: 'PUT',
            statusCode: 200,
            requestBody: 'req-body', // Will be read as text
            responseBody: 'OK',
        });
    });

    it('should correctly handle URL object as input to fetch', async () => {
        (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
        const url = new URL('http://localhost/api/url-obj');
        const mockResponse = new (window as any).Response("OK", { status: 200, headers: {'Content-Type': 'text/plain'} });
        (window.fetch as MockFunction<any>).mockResolvedValueOnce(mockResponse);

        await window.fetch(url, {method: 'DELETE'});

        expect(window.fetch).toHaveBeenCalledTimes(1);
        expectLogAdded(LogEntryType.API_CALL, {
            url: 'http://localhost/api/url-obj',
            method: 'DELETE',
            statusCode: 200,
            responseBody: 'OK',
        });
    });

    it('should not log API call if service is stopped', async () => {
        serviceInstance.stop();
        (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
        const mockResponse = new (window as any).Response("OK", { status: 200 });
        (window.fetch as MockFunction<any>).mockResolvedValueOnce(mockResponse);

        await window.fetch('/api/stopped-service');
        expect(idbUtils.addLogEntryToDB).not.toHaveBeenCalled();
        serviceInstance.start();
    });
  });

  describe('Route Tracking', () => {
    it('should log page view on history.pushState', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear(); 
      mockWin.location.pathname = '/initial';
      mockWin.location.search = '';
      mockWin.location.hash = '';
      (serviceInstance as any).currentPath = '/initial'; 

      window.history.pushState({}, '', '/new-route');
      
      expect(window.history.pushState).toHaveBeenCalledTimes(1);
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/new-route', referrer: '/initial' });
    });

    it('should log page view on history.replaceState', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      mockWin.location.pathname = '/current';
      mockWin.location.search = '';
      mockWin.location.hash = '';
      (serviceInstance as any).currentPath = '/current';

      window.history.replaceState({}, '', '/replaced-route');
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/replaced-route', referrer: '/current' });
    });

    it('should log page view on popstate event', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const previousPath = (serviceInstance as any).currentPath;
      mockWin.location.pathname = '/popped-route'; 
      mockWin.location.search = '';
      mockWin.location.hash = '';
      
      const popstateListener = (mockWin.addEventListener as MockFunction<any>).mock.calls.find((call: any[]) => call[0] === 'popstate')[1];
      popstateListener(new PopStateEvent('popstate'));
      
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/popped-route', referrer: previousPath });
    });
    
    it('should log page view on hashchange event', () => {
      (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
      const previousPath = (serviceInstance as any).currentPath;
      mockWin.location.pathname = '/hash-page'; // assume path remains
      mockWin.location.search = '';
      mockWin.location.hash = '#new-hash'; 
      
      const hashchangeListener = (mockWin.addEventListener as MockFunction<any>).mock.calls.find((call: any[]) => call[0] === 'hashchange')[1];
      hashchangeListener(new HashChangeEvent('hashchange'));
      
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: (expect as any).stringContaining('#new-hash'), referrer: previousPath });
    });

    it('should not log if path does not change', () => {
        (idbUtils.addLogEntryToDB as MockFunction<any>).mock.mockClear();
        const currentPath = '/same-route';
        (serviceInstance as any).currentPath = currentPath;
        mockWin.location.pathname = currentPath;
        mockWin.location.search = '';
        mockWin.location.hash = '';

        window.history.pushState({}, '', currentPath); // pushState with the same path
        expect(idbUtils.addLogEntryToDB).not.toHaveBeenCalled();
    });
  });

  describe('Start/Stop/Toggle Monitoring', () => {
    it('start() should set isRunning to true', () => {
      serviceInstance.stop();
      expect(serviceInstance.isRunning).toBe(false);
      serviceInstance.start();
      expect(serviceInstance.isRunning).toBe(true);
    });

    it('stop() should set isRunning to false', () => {
      serviceInstance.start();
      expect(serviceInstance.isRunning).toBe(true);
      serviceInstance.stop();
      expect(serviceInstance.isRunning).toBe(false);
    });

    it('toggleMonitoring() should flip isRunning status', () => {
      const initialStatus = serviceInstance.isRunning;
      serviceInstance.toggleMonitoring();
      expect(serviceInstance.isRunning).toBe(!initialStatus);
      serviceInstance.toggleMonitoring();
      expect(serviceInstance.isRunning).toBe(initialStatus);
    });
  });
});
