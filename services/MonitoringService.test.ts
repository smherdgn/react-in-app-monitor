
import { MonitoringService as serviceInstance } from './MonitoringService'; 
import { LogEntry, LogEntryType, ApiCallLogData, PageViewLogData, ComponentRenderLogData, ErrorLogData, CustomEventLogData, ComponentEventType } from '../types';
import { DB_CONFIG } from '../constants';
import { describe, it, expect, beforeEach, afterEach, mockFn, mockWindow, mockIndexedDB, mockPerformance, mockLocalStorage, jest as customJest, MockFunction } from '../test-utils/test-helpers';

import * as idbUtils from '../utils/indexedDB';


describe('MonitoringService', () => {
  let mockWin: any;
  let mockPerf: any;
  let openMonitoringDBSpy: MockFunction<any>;
  let addLogEntryToDBSpy: MockFunction<any>;


  const resetServiceState = () => {
      const wasRunning = serviceInstance.isRunning;
      serviceInstance.stop(); 
      (serviceInstance as any).currentPath = (mockWin.location.pathname || '/') + (mockWin.location.search || '') + (mockWin.location.hash || '');
      if (wasRunning) {
          serviceInstance.start(); 
      }
      addLogEntryToDBSpy.mock.mockClear();
      ((mockWin.dispatchEvent as any) as MockFunction<any>).mock.mockClear();
  };


  beforeEach(async () => {
    mockWin = mockWindow();
    mockPerf = mockPerformance();
    mockLocalStorage(); 
    mockIndexedDB(); 
    
    openMonitoringDBSpy = customJest.spyOn(idbUtils, 'openMonitoringDB');
    openMonitoringDBSpy.mock.mockResolvedValue({
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

    addLogEntryToDBSpy = customJest.spyOn(idbUtils, 'addLogEntryToDB');
    addLogEntryToDBSpy.mock.mockResolvedValue(undefined);
    
    // Ensure window.fetch is the mock from mockWindow and is clear
    if (!(((window.fetch as any) as MockFunction<any>).mock)) {
        (window as any).fetch = mockFn(async () => new Response(null, {status: 200}));
    }
    (((window.fetch as any) as MockFunction<any>).mock as any).mockClear();
    
    if (!(((window.history.pushState as any) as MockFunction<any>).mock)) {
        (window.history.pushState as any) = mockFn();
    }
    (((window.history.pushState as any) as MockFunction<any>).mock as any).mockClear();
    
    (((window.addEventListener as any) as MockFunction<any>).mock as any).mockClear(); 

    (serviceInstance as any).isRunning = true; 
    resetServiceState(); 
  });

  afterEach(() => {
    serviceInstance.stop(); 
    openMonitoringDBSpy.mock.mockRestore?.();
    addLogEntryToDBSpy.mock.mockRestore?.();
  });

  const expectLogAdded = (type: LogEntryType, dataMatcher: object) => {
    expect(addLogEntryToDBSpy).toHaveBeenCalledTimes(1);
    const callArgs = addLogEntryToDBSpy.mock.calls[0];
    const logEntry = callArgs[1] as LogEntry; // Cast to LogEntry
    expect(logEntry.type).toBe(type);
    expect(logEntry.data).toMatchObject(dataMatcher);
    expect(logEntry.id).toBeDefined();
    expect(logEntry.timestamp).toBeDefined();
    
    expect((mockWin.dispatchEvent as MockFunction<any>)).toHaveBeenCalledTimes(1);
    expect((mockWin.dispatchEvent as MockFunction<any>)).toHaveBeenCalledWith((expect as any).any(CustomEvent));
    const dispatchedEvent = ((mockWin.dispatchEvent as MockFunction<any>).mock.calls[0] as any[])[0] as CustomEvent;
    expect(dispatchedEvent.type).toBe('monitoring_new_log');
  };
  
  it('constructor should setup listeners and log initial page view if window exists', () => {
    const addEventListenerCalls = (((window.addEventListener as any) as MockFunction<any>).mock.calls as any[]);
    expect(addEventListenerCalls.some(call => call[0] === 'error')).toBe(true);
    expect(addEventListenerCalls.some(call => call[0] === 'unhandledrejection')).toBe(true);
    expect(addEventListenerCalls.some(call => call[0] === 'popstate')).toBe(true);
    expect(addEventListenerCalls.some(call => call[0] === 'hashchange')).toBe(true);
  });


  describe('Logging Methods', () => {
    it('logPageView should add a PAGE_VIEW log', () => {
      const data: PageViewLogData = { path: '/test', referrer: '/prev' };
      serviceInstance.logPageView(data.path, data.referrer);
      expectLogAdded(LogEntryType.PAGE_VIEW, data);
    });

    it('logApiCall should add an API_CALL log', () => {
      const data: ApiCallLogData = { url: '/api/data', method: 'GET', duration: 100, statusCode: 200 };
      serviceInstance.logApiCall(data);
      expectLogAdded(LogEntryType.API_CALL, data);
    });

    it('logComponentRender should add a COMPONENT_RENDER log', () => {
      const data: ComponentRenderLogData = { componentName: 'TestComp', duration: 10, eventType: ComponentEventType.MOUNT };
      serviceInstance.logComponentRender(data);
      expectLogAdded(LogEntryType.COMPONENT_RENDER, data);
    });

    it('logError should add an ERROR log', () => {
      const data: ErrorLogData = { message: 'Test error', source: 'test' };
      serviceInstance.logError(data);
      expectLogAdded(LogEntryType.ERROR, data);
    });

    it('logCustomEvent should add a CUSTOM_EVENT log', () => {
      const data: CustomEventLogData = { eventName: 'TestEvent', details: { info: 'abc' } };
      serviceInstance.logCustomEvent(data.eventName, data.details);
      expectLogAdded(LogEntryType.CUSTOM_EVENT, data);
    });

    it('should not log if service is stopped', () => {
        serviceInstance.stop();
        addLogEntryToDBSpy.mock.mockClear(); 
        serviceInstance.logPageView('/stopped', '/prev');
        expect(addLogEntryToDBSpy).not.toHaveBeenCalled();
        serviceInstance.start(); 
    });
  });

  describe('Global Error Handlers', () => {
    it('should log global errors via window.onerror', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Global error occurred',
        error: new Error('Global error occurred'),
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });
      if(errorEvent.error) (errorEvent.error as any).stack = "Error: Global error occurred\n at test.js:10:5";

      const errorListenerCall = (((window.addEventListener as any) as MockFunction<any>).mock.calls as any[][]).filter((call: any[]) => call[0] === 'error').pop();
      expect(errorListenerCall).toBeDefined();
      const errorListener = errorListenerCall![1];
      errorListener(errorEvent);

      expectLogAdded(LogEntryType.ERROR, {
        message: 'Global error occurred',
        stack: "Error: Global error occurred\n at test.js:10:5",
        source: 'global_error:test.js:10:5',
      });
    });

    it('should log unhandled promise rejections', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Promise rejected')),
        reason: new Error('Promise rejected'),
      });
      if(rejectionEvent.reason) (rejectionEvent.reason as any).stack = "Error: Promise rejected\n at somePromise:1:1";
      
      const rejectionListenerCall = (((window.addEventListener as any) as MockFunction<any>).mock.calls as any[][]).filter((call: any[]) => call[0] === 'unhandledrejection').pop();
      expect(rejectionListenerCall).toBeDefined();
      const rejectionListener = rejectionListenerCall![1];
      rejectionListener(rejectionEvent);

      expectLogAdded(LogEntryType.ERROR, {
        message: 'Promise rejected',
        stack: "Error: Promise rejected\n at somePromise:1:1",
        source: 'unhandled_rejection',
      });
    });

     it('should handle non-Error promise rejections', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('Simple string rejection'),
        reason: 'Simple string rejection',
      });
      
      const rejectionListenerCall = (((window.addEventListener as any) as MockFunction<any>).mock.calls as any[][]).filter((call: any[]) => call[0] === 'unhandledrejection').pop();
      expect(rejectionListenerCall).toBeDefined();
      const rejectionListener = rejectionListenerCall![1];
      rejectionListener(rejectionEvent);

      expectLogAdded(LogEntryType.ERROR, {
        message: 'Simple string rejection',
        source: 'unhandled_rejection',
      });
    });
  });

  describe('Fetch Override', () => {
    it('should intercept fetch calls and log API_CALL data on success', async () => {
      const mockResponse = new (window as any).Response(JSON.stringify({ data: 'success' }), { status: 200, headers: {'Content-Type': 'application/json'} });
      (((window.fetch as any) as MockFunction<any>).mock as any).mockResolvedValueOnce(mockResponse);
      
      await window.fetch('/api/test-success', { method: 'POST', body: '{"key":"value"}' });

      expect(((window.fetch as any) as MockFunction<any>)).toHaveBeenCalledTimes(1); 
      const logEntry = addLogEntryToDBSpy.mock.calls[0][1] as LogEntry;
      expect(logEntry.type).toBe(LogEntryType.API_CALL);
      expect((logEntry.data as ApiCallLogData).url).toBe('/api/test-success');
      expect((logEntry.data as ApiCallLogData).method).toBe('POST');
      expect((logEntry.data as ApiCallLogData).statusCode).toBe(200);
      expect((logEntry.data as ApiCallLogData).requestBody).toBe('{"key":"value"}');
      expect((logEntry.data as ApiCallLogData).responseBody).toBe('{"data":"success"}');
      expect((logEntry.data as ApiCallLogData).duration).toBeGreaterThanOrEqual(0);
    });

    it('should intercept fetch calls and log API_CALL data on failure', async () => {
      const fetchError = new TypeError('Network error');
      (((window.fetch as any) as MockFunction<any>).mock as any).mockRejectedValueOnce(fetchError);

      try {
        await window.fetch('/api/test-fail');
      } catch (e) {
        expect(e).toBe(fetchError);
      }

      expect(((window.fetch as any) as MockFunction<any>)).toHaveBeenCalledTimes(1);
      const logEntry = addLogEntryToDBSpy.mock.calls[0][1] as LogEntry;
      expect(logEntry.type).toBe(LogEntryType.API_CALL);
      expect((logEntry.data as ApiCallLogData).url).toBe('/api/test-fail');
      expect((logEntry.data as ApiCallLogData).method).toBe('GET');
      expect((logEntry.data as ApiCallLogData).statusCode).toBe(0);
      expect((logEntry.data as ApiCallLogData).error).toBe('Network error');
      expect((logEntry.data as ApiCallLogData).duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should correctly handle Request object as input to fetch', async () => {
        const request = new Request('/api/request-obj', {method: 'PUT', body: 'req-body', headers: {'Content-Type': 'text/plain'}});
        const mockResponse = new (window as any).Response("OK", { status: 200, headers: {'Content-Type': 'text/plain'} });
        (((window.fetch as any) as MockFunction<any>).mock as any).mockResolvedValueOnce(mockResponse);

        await window.fetch(request);

        expect(((window.fetch as any) as MockFunction<any>)).toHaveBeenCalledTimes(1);
        expectLogAdded(LogEntryType.API_CALL, {
            url: 'http://localhost/api/request-obj', // mockWindow might prefix with origin
            method: 'PUT',
            statusCode: 200,
            requestBody: 'req-body',
            responseBody: 'OK',
        });
    });

    it('should correctly handle URL object as input to fetch', async () => {
        const url = new URL('http://localhost/api/url-obj');
        const mockResponse = new (window as any).Response("OK", { status: 200, headers: {'Content-Type': 'text/plain'} });
        (((window.fetch as any) as MockFunction<any>).mock as any).mockResolvedValueOnce(mockResponse);

        await window.fetch(url, {method: 'DELETE'});

        expect(((window.fetch as any) as MockFunction<any>)).toHaveBeenCalledTimes(1);
        expectLogAdded(LogEntryType.API_CALL, {
            url: 'http://localhost/api/url-obj',
            method: 'DELETE',
            statusCode: 200,
            responseBody: 'OK',
        });
    });

    it('should not log API call if service is stopped', async () => {
        serviceInstance.stop();
        addLogEntryToDBSpy.mock.mockClear(); 
        const mockResponse = new (window as any).Response("OK", { status: 200 });
        
        // Use originalFetch if service is stopped
        const originalFetch = (serviceInstance as any).originalFetch || window.fetch;
        if (((originalFetch as any) as MockFunction<any>).mock) { // Check if it's our mockFn
             (((originalFetch as any) as MockFunction<any>).mock as any).mockResolvedValueOnce(mockResponse);
        } else { // If it's a native fetch or something else, this part might not work as intended for spying
            console.warn("Original fetch is not a spyable mock in this test scenario when service is stopped.");
        }


        await window.fetch('/api/stopped-service'); // This will now call the overridden fetch, which checks isRunning
        expect(addLogEntryToDBSpy).not.toHaveBeenCalled();
        serviceInstance.start();
    });
  });

  describe('XMLHttpRequest Override', () => {
    it('should intercept XMLHttpRequest calls and log API_CALL data', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/xhr-test');
      xhr.send('foo=bar');

      expectLogAdded(LogEntryType.API_CALL, {
        url: '/api/xhr-test',
        method: 'POST',
        statusCode: 200,
        requestBody: 'foo=bar',
        responseBody: 'OK',
      });
    });
  });

  describe('Route Tracking', () => {
    beforeEach(() => {
        mockWin.location.pathname = '/initial-route';
        mockWin.location.search = '';
        mockWin.location.hash = '';
        (serviceInstance as any).currentPath = '/initial-route';
        addLogEntryToDBSpy.mock.mockClear();
        ((mockWin.dispatchEvent as any)as MockFunction<any>).mock.mockClear();
    });

    it('should log page view on history.pushState', () => {
      window.history.pushState({}, '', '/new-route');
      
      expect(((window.history.pushState as any) as MockFunction<any>)).toHaveBeenCalledTimes(1);
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/new-route', referrer: '/initial-route' });
    });

    it('should log page view on history.replaceState', () => {
      window.history.replaceState({}, '', '/replaced-route');
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/replaced-route', referrer: '/initial-route' });
    });

    it('should log page view on popstate event', () => {
      const previousPath = (serviceInstance as any).currentPath;
      mockWin.location.pathname = '/popped-route'; 
      
      const popstateListenerCall = (((window.addEventListener as any) as MockFunction<any>).mock.calls as any[][]).filter((call: any[]) => call[0] === 'popstate').pop();
      expect(popstateListenerCall).toBeDefined();
      const popstateListener = popstateListenerCall![1];
      popstateListener(new PopStateEvent('popstate'));
      
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/popped-route', referrer: previousPath });
    });
    
    it('should log page view on hashchange event', () => {
      const previousPath = (serviceInstance as any).currentPath;
      mockWin.location.pathname = '/initial-route'; 
      mockWin.location.hash = '#new-hash'; 
      
      const hashchangeListenerCall = (((window.addEventListener as any) as MockFunction<any>).mock.calls as any[][]).filter((call: any[]) => call[0] === 'hashchange').pop();
      expect(hashchangeListenerCall).toBeDefined();
      const hashchangeListener = hashchangeListenerCall![1];
      hashchangeListener(new HashChangeEvent('hashchange'));
      
      expectLogAdded(LogEntryType.PAGE_VIEW, { path: '/initial-route#new-hash', referrer: previousPath });
    });

    it('should not log if path does not change', () => {
        const currentPath = '/initial-route';
        window.history.pushState({}, '', currentPath); 
        expect(addLogEntryToDBSpy).not.toHaveBeenCalled();
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