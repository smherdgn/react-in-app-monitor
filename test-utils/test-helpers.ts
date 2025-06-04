/// <reference types="react" />
/// <reference types="react-dom" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act as reactAct } from 'react';

// Declare require for jest.requireActual
declare var require: any;

// Basic test runner and assertion library (VERY simplified)
type TestFn = () => void | Promise<void>;
interface TestSuite {
  description: string;
  tests: { description: string; fn: TestFn }[];
  beforeAlls: TestFn[];
  afterAlls: TestFn[];
  beforeEachs: TestFn[];
  afterEachs: TestFn[];
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(description: string, fn: () => void): void {
  const newSuite: TestSuite = {
    description,
    tests: [],
    beforeAlls: [],
    afterAlls: [],
    beforeEachs: [],
    afterEachs: [],
  };
  suites.push(newSuite);
  currentSuite = newSuite;
  fn();
  currentSuite = null;
}

export function it(description: string, fn: TestFn): void {
  if (!currentSuite) {
    throw new Error("it() must be called within a describe() block");
  }
  currentSuite.tests.push({ description, fn });
}
export const test = it; // Alias for convenience

export function beforeEach(fn: TestFn): void {
  if (currentSuite) currentSuite.beforeEachs.push(fn);
}
export function afterEach(fn: TestFn): void {
  if (currentSuite) currentSuite.afterEachs.push(fn);
}
export function beforeAll(fn: TestFn): void {
  if (currentSuite) currentSuite.beforeAlls.push(fn);
}
export function afterAll(fn: TestFn): void {
  if (currentSuite) currentSuite.afterAlls.push(fn);
}

// Simple expect and matchers
const matchers = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
  },
  toEqual: (expected: any) => {
    // Basic deep comparison, can be improved for edge cases (functions, Dates, RegExp)
    const stringifiedActual = JSON.stringify(actual, (_, v) => typeof v === 'function' ? v.toString() : v);
    const stringifiedExpected = JSON.stringify(expected, (_, v) => typeof v === 'function' ? v.toString() : v);
    if (stringifiedActual !== stringifiedExpected) {
      throw new Error(`Expected ${stringifiedActual} to equal ${stringifiedExpected}`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined) throw new Error(`Expected value to be defined, but it was undefined`);
  },
  toBeNull: () => {
    if (actual !== null) throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
  },
  toBeTruthy: () => {
    if (!actual) throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
  },
  toBeFalsy: () => {
    if (actual) throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
  },
  toHaveBeenCalled: () => {
    if (!actual || typeof actual.mock !== 'object' || !Array.isArray(actual.mock.calls)) {
      throw new Error('Not a mock function or mock.calls not found');
    }
    if (actual.mock.calls.length === 0) throw new Error('Expected function to have been called.');
  },
  toHaveBeenCalledTimes: (times: number) => {
    if (!actual || typeof actual.mock !== 'object' || !Array.isArray(actual.mock.calls)) {
      throw new Error('Not a mock function or mock.calls not found');
    }
    if (actual.mock.calls.length !== times) throw new Error(`Expected function to have been called ${times} times, but it was called ${actual.mock.calls.length} times.`);
  },
  toHaveBeenCalledWith: (...args: any[]) => {
    if (!actual || typeof actual.mock !== 'object' || !Array.isArray(actual.mock.calls)) {
      throw new Error('Not a mock function or mock.calls not found');
    }
    const matchingCall = actual.mock.calls.find((callArgs: any[]) =>
      args.length === callArgs.length && args.every((arg, i) => JSON.stringify(arg) === JSON.stringify(callArgs[i]))
    );
    if (!matchingCall) throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, but it was not. Calls: ${JSON.stringify(actual.mock.calls)}`);
  },
  toThrow: (expectedError?: string | RegExp | ErrorConstructor | { message: string | RegExp }) => {
    let thrown = false;
    let thrownError: any;
    if (typeof actual !== 'function') {
        throw new Error("Actual value must be a function for toThrow matcher.");
    }
    try {
      actual(); // Execute the function
    } catch (e) {
      thrown = true;
      thrownError = e;
    }
    if (!thrown) throw new Error("Function did not throw.");
    if (expectedError) {
      if (typeof expectedError === 'string' && thrownError.message !== expectedError) {
        throw new Error(`Expected error message "${expectedError}", but got "${thrownError.message}".`);
      }
      if (expectedError instanceof RegExp && !expectedError.test(thrownError.message)) {
        throw new Error(`Expected error message to match ${expectedError}, but got "${thrownError.message}".`);
      }
      if (typeof expectedError === 'function' && !(thrownError instanceof expectedError)) { // ErrorConstructor
        throw new Error(`Expected error to be instance of ${expectedError.name}, but got ${thrownError.constructor.name}.`);
      }
      if (typeof expectedError === 'object' && 'message' in expectedError) {
        if (typeof expectedError.message === 'string' && thrownError.message !== expectedError.message) {
          throw new Error(`Expected error message "${expectedError.message}", but got "${thrownError.message}".`);
        }
        if (expectedError.message instanceof RegExp && !expectedError.message.test(thrownError.message)) {
          throw new Error(`Expected error message to match ${expectedError.message}, but got "${thrownError.message}".`);
        }
      }
    }
  },
  toMatchObject: (expected: object) => {
    const check = (obj: any, subset: any): boolean => {
      return Object.keys(subset).every(key => {
        const objVal = obj[key];
        const subVal = subset[key];
        
        // Handle asymmetric matchers
        if (subVal && typeof subVal === 'object' && (subVal as any)._asymmetricMatcher) {
            const matcherName = (subVal as any)._asymmetricMatcher;
            if (matcherName === 'anything') {
                return obj.hasOwnProperty(key);
            }
            if (matcherName === 'stringContaining') {
                return typeof objVal === 'string' && objVal.includes((subVal as any).substring);
            }
            if (matcherName === 'objectContaining') { // Recursive check for objectContaining
                return typeof objVal === 'object' && objVal !== null && check(objVal, (subVal as any).subset);
            }
            if (matcherName === 'any') {
                return objVal !== undefined && objVal !== null && objVal.constructor === (subVal as any).constructor;
            }
            // If other asymmetric matchers are added, handle them here
        }

        if (typeof subVal === 'object' && subVal !== null && typeof objVal === 'object' && objVal !== null) {
          return check(objVal, subVal);
        }
        return JSON.stringify(objVal) === JSON.stringify(subVal);
      });
    };
    if (!check(actual, expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to match object ${JSON.stringify(expected)}`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (!(actual > expected)) throw new Error(`Expected ${actual} to be greater than ${expected}`);
  },
  toBeGreaterThanOrEqual: (expected: number) => {
    if (!(actual >= expected)) throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
  },
  toContain: (expected: any) => {
    if (typeof actual === 'string' && typeof expected === 'string') {
      if (!actual.includes(expected)) throw new Error(`Expected "${actual}" to contain "${expected}"`);
    } else if (Array.isArray(actual)) {
      if (!actual.some(item => JSON.stringify(item) === JSON.stringify(expected))) {
        throw new Error(`Expected array ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    } else {
      throw new Error('toContain matcher only supports strings and arrays.');
    }
  },
});


// Enhanced expect function with 'not' and promise support
export const expect = (actual: any): any => {
  const baseMatchers = matchers(actual);
  const negatedMatchers: any = {};

  for (const key in baseMatchers) {
    if (typeof (baseMatchers as any)[key] === 'function') {
      (negatedMatchers as any)[key] = (...args: any[]) => {
        let didThrow = false;
        try {
          (baseMatchers as any)[key](...args);
        } catch (e) {
          didThrow = true;
        }
        if (!didThrow) {
          throw new Error(`Expected assertion for ${key} to fail (due to .not), but it passed.`);
        }
      };
    }
  }

  return {
    ...baseMatchers,
    not: negatedMatchers,
    rejects: {
      toThrow: async (expectedError?: string | RegExp | ErrorConstructor | { message: string | RegExp }) => {
        let thrown = false;
        let thrownError: any;
        try {
          await actual; // actual should be a promise
        } catch (e) {
          thrown = true;
          thrownError = e;
        }
        if (!thrown) throw new Error("Promise did not reject.");
        // Reuse the toThrow logic for error checking
        const errorCheckerFn = () => { throw thrownError; };
        matchers(errorCheckerFn).toThrow(expectedError);
      }
    },
  };
};

// Add static asymmetric matchers directly to expect
(expect as any).anything = () => ({ _asymmetricMatcher: 'anything' } as const);
(expect as any).stringContaining = (substring: string) => ({ _asymmetricMatcher: 'stringContaining', substring } as const);
(expect as any).objectContaining = (subset: object) => ({ _asymmetricMatcher: 'objectContaining', subset } as const);
(expect as any).any = (constructor: any) => ({ _asymmetricMatcher: 'any', constructor } as const);


// Jest-like mock function
export interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Parameters<T>[];
    instances: any[]; // Typically for constructor mocks
    results: { type: 'return' | 'throw'; value: any }[];
    lastCall?: Parameters<T>;
    mockClear: () => void;
    mockReturnValue: (value: ReturnType<T>) => MockFunction<T>;
    mockReturnValueOnce: (value: ReturnType<T>) => MockFunction<T>;
    mockImplementation: (fn: (...args: Parameters<T>) => ReturnType<T>) => MockFunction<T>;
    mockImplementationOnce: (fn: (...args: Parameters<T>) => ReturnType<T>) => MockFunction<T>;
    mockResolvedValue: (value: Awaited<ReturnType<T>>) => MockFunction<T>;
    mockResolvedValueOnce: (value: Awaited<ReturnType<T>>) => MockFunction<T>;
    mockRejectedValue: (value: any) => MockFunction<T>;
    mockRejectedValueOnce: (value: any) => MockFunction<T>;
    // For spies
    mockRestore?: () => void;
  };
}

export const mockFn = <T extends (...args: any[]) => any = (...args: any[]) => any>(
  initialImplementation?: (...args: Parameters<T>) => ReturnType<T>
): MockFunction<T> => {
  let implementation = initialImplementation || (() => undefined as any);
  const onceImplementations: ((...args: Parameters<T>) => ReturnType<T>)[] = [];
  const onceReturnValues: ReturnType<T>[] = [];
  const onceResolvedValues: Awaited<ReturnType<T>>[] = [];
  const onceRejectedValues: any[] = [];

  const mock: MockFunction<T> = (...args: Parameters<T>): ReturnType<T> => {
    mock.mock.calls.push(args);
    mock.mock.lastCall = args;

    if (onceRejectedValues.length > 0) {
      const e = onceRejectedValues.shift();
      mock.mock.results.push({ type: 'throw', value: e });
      return Promise.reject(e) as ReturnType<T>;
    }
    if (onceResolvedValues.length > 0) {
      const val = onceResolvedValues.shift();
      mock.mock.results.push({ type: 'return', value: val });
      return Promise.resolve(val) as ReturnType<T>;
    }
    if (onceReturnValues.length > 0) {
      const val = onceReturnValues.shift() as ReturnType<T>;
      mock.mock.results.push({ type: 'return', value: val });
      return val;
    }
    if (onceImplementations.length > 0) {
      const impl = onceImplementations.shift()!;
      const result = impl(...args);
      mock.mock.results.push({ type: 'return', value: result });
      return result;
    }

    try {
      const result = implementation(...args);
      mock.mock.results.push({ type: 'return', value: result });
      return result;
    } catch (e) {
      mock.mock.results.push({ type: 'throw', value: e });
      throw e;
    }
  };

  const mockObject: MockFunction<T>['mock'] = {
    calls: [],
    instances: [], 
    results: [],
    mockClear: () => {
      mockObject.calls = [];
      mockObject.instances = [];
      mockObject.results = [];
      mockObject.lastCall = undefined;
      onceImplementations.length = 0;
      onceReturnValues.length = 0;
      onceResolvedValues.length = 0;
      onceRejectedValues.length = 0;
    },
    mockReturnValue: (value) => {
      implementation = () => value;
      return mock;
    },
    mockReturnValueOnce: (value) => {
      onceReturnValues.push(value);
      return mock;
    },
    mockImplementation: (fn) => {
      implementation = fn;
      return mock;
    },
    mockImplementationOnce: (fn) => {
      onceImplementations.push(fn);
      return mock;
    },
    mockResolvedValue: (value) => {
      implementation = () => Promise.resolve(value) as any;
      return mock;
    },
    mockResolvedValueOnce: (value) => {
      onceResolvedValues.push(value);
      return mock;
    },
    mockRejectedValue: (value) => {
      implementation = () => Promise.reject(value) as any;
      return mock;
    },
    mockRejectedValueOnce: (value) => {
      onceRejectedValues.push(value);
      return mock;
    },
  };
  mock.mock = mockObject;

  return mock;
};


// Mock browser APIs
export const mockLocalStorage = () => {
  let store: Record<string, string> = {};
  const mock = {
    getItem: mockFn((key: string): string | null => store[key] || null),
    setItem: mockFn((key: string, value: string) => { store[key] = String(value); }),
    removeItem: mockFn((key: string) => { delete store[key]; }),
    clear: mockFn(() => { store = {}; }),
    key: mockFn((index: number): string | null => Object.keys(store)[index] || null),
    get length() { return Object.keys(store).length; }
  };
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: mock, configurable: true, writable: true });
  } else {
    (globalThis as any).localStorage = mock;
  }
  return mock;
};

export const mockPerformance = () => {
  let now = 0;
  const mock = {
    now: mockFn(() => {
      now += Math.random() * 10 + 1; // Simulate time passing
      return now;
    }),
  };
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'performance', { value: mock, configurable: true, writable: true });
  } else {
    (globalThis as any).performance = mock;
  }
  return mock;
};

export const mockIndexedDB = () => {
  const mock = {
    open: mockFn(),
    deleteDatabase: mockFn(),
    cmp: mockFn((a: any, b: any): number => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }),
    _databases: {} as Record<string, any>,
    _currentVersion: 0,
  };
  const mockDomStringList = {
    length: 0,
    item: (index: number): string | null => null,
    contains: (str: string): boolean => false,
    [Symbol.iterator]: function* () {
      // Make it iterable if needed, for now, empty
    }
  };

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'indexedDB', { value: mock, configurable: true, writable: true });
    if (!(window as any).IDBKeyRange) (window as any).IDBKeyRange = { only: mockFn(), lowerBound: mockFn(), upperBound: mockFn(), bound: mockFn() };
    if (!(window as any).IDBOpenDBRequest) (window as any).IDBOpenDBRequest = class IDBOpenDBRequest extends EventTarget {};
    if (!(window as any).IDBTransaction) (window as any).IDBTransaction = class IDBTransaction extends EventTarget {};
    if (!(window as any).IDBDatabase) (window as any).IDBDatabase = class IDBDatabase extends EventTarget {
        objectStoreNames: DOMStringList = mockDomStringList as unknown as DOMStringList; // Assign mock
    }; 
    if (!(window as any).IDBVersionChangeEvent) (window as any).IDBVersionChangeEvent = class IDBVersionChangeEvent extends Event {
      oldVersion: number;
      newVersion: number | null;
      constructor(type: string, eventInitDict?: IDBVersionChangeEventInit) {
        super(type);
        this.oldVersion = eventInitDict?.oldVersion || 0;
        this.newVersion = eventInitDict?.newVersion || null;
      }
    };
    if (!(window as any).DOMException) (window as any).DOMException = class DOMException extends Error {
        constructor(message?: string, name?: string) {
            super(message);
            this.name = name || "DOMException";
        }
    };


  } else { // Node.js context
    (globalThis as any).indexedDB = mock;
    if (!(globalThis as any).IDBKeyRange) (globalThis as any).IDBKeyRange = { only: mockFn(), lowerBound: mockFn(), upperBound: mockFn(), bound: mockFn() };
    if (!(globalThis as any).IDBOpenDBRequest) (globalThis as any).IDBOpenDBRequest = class IDBOpenDBRequest extends EventTarget {};
    if (!(globalThis as any).IDBTransaction) (globalThis as any).IDBTransaction = class IDBTransaction extends EventTarget {};
    if (!(globalThis as any).IDBDatabase) (globalThis as any).IDBDatabase = class IDBDatabase extends EventTarget {
        objectStoreNames: DOMStringList = mockDomStringList as unknown as DOMStringList; // Assign mock
    };
    if (!(globalThis as any).IDBVersionChangeEvent) (globalThis as any).IDBVersionChangeEvent = class IDBVersionChangeEvent extends Event {
        constructor(type: string, eventInitDict?: IDBVersionChangeEventInit) { super(type); }
    };
    if (!(globalThis as any).DOMException) (globalThis as any).DOMException = class DOMException extends Error {
        constructor(message?: string, name?: string) { super(message); this.name = name || "DOMException"; }
    };
    if (!(globalThis as any).EventTarget) (globalThis as any).EventTarget = class EventTarget { addEventListener() {} removeEventListener() {} dispatchEvent() {return true;} };
    if (!(globalThis as any).Event) (globalThis as any).Event = class Event { constructor(type: string) { (this as any).type = type; } };

  }
  return mock;
};

// Define MockRequestInit to include destination
interface MockRequestInit extends RequestInit {
    destination?: RequestDestination;
}

export const mockWindow = () => {
  const mockConsole = {
      log: mockFn(console.log),
      warn: mockFn(console.warn),
      error: mockFn(console.error),
      info: mockFn(console.info),
      debug: mockFn(console.debug),
      trace: mockFn(console.trace),
      dir: mockFn(console.dir),
      group: mockFn(console.group),
      groupCollapsed: mockFn(console.groupCollapsed),
      groupEnd: mockFn(console.groupEnd),
      table: mockFn(console.table),
      assert: mockFn(console.assert),
      count: mockFn(console.count),
      countReset: mockFn(console.countReset),
      time: mockFn(console.time),
      timeEnd: mockFn(console.timeEnd),
      timeLog: mockFn(console.timeLog),
      clear: mockFn(console.clear),
  };
  
  class MockURLInternal {
    href: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
    protocol: string;
    hostname: string;
    port: string;
    host: string;
    searchParams: URLSearchParams; // Will use the potentially mocked URLSearchParams

    constructor(url: string, base?: string | URL | MockURLInternal) {
      let fullUrl = url;
      let baseOrigin = '';
      let basePath = '/';

      if (base) {
        const baseStr = (typeof base === 'string') ? base : (base as any).href;
        const tempBaseUrl = new URLCtor(baseStr); 
        baseOrigin = tempBaseUrl.origin;
        basePath = tempBaseUrl.pathname;
        if (url.startsWith('/')) {
          fullUrl = baseOrigin + url;
        } else if (!url.match(/^[a-zA-Z]+:\/\//)) { 
           fullUrl = baseOrigin + (basePath.endsWith('/') ? basePath : basePath + '/') + url;
        }
      } else if (!url.match(/^[a-zA-Z]+:\/\//) && url.startsWith('/') && typeof window !== 'undefined' && window.location) {
         fullUrl = window.location.origin + url; 
      } else if (!url.match(/^[a-zA-Z]+:\/\//) && typeof window !== 'undefined' && window.location) {
         fullUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + url; 
      }


      const hashIndex = fullUrl.indexOf('#');
      this.hash = hashIndex !== -1 ? fullUrl.substring(hashIndex) : '';
      const searchUrl = hashIndex !== -1 ? fullUrl.substring(0, hashIndex) : fullUrl;

      const queryIndex = searchUrl.indexOf('?');
      this.search = queryIndex !== -1 ? searchUrl.substring(queryIndex) : '';
      
      const pathSegment = (queryIndex !== -1 ? searchUrl.substring(0, queryIndex) : searchUrl);
      
      const originMatch = pathSegment.match(/^([a-zA-Z]+:)\/\/([^/?#]+)/);
      this.protocol = originMatch ? originMatch[1] : (baseOrigin.split(':')[0] + ':' || (typeof window !== 'undefined' && window.location ? window.location.protocol : 'http:'));
      const authority = originMatch ? originMatch[2] : (baseOrigin.split('//')[1] || (typeof window !== 'undefined' && window.location ? window.location.host : 'localhost'));
      
      this.origin = this.protocol + '//' + authority;

      const authorityParts = authority.split(':');
      this.hostname = authorityParts[0];
      this.port = authorityParts[1] || '';
      this.host = this.hostname + (this.port ? ':' + this.port : '');
      
      this.pathname = originMatch ? pathSegment.substring(this.origin.length) : pathSegment;
      if (!this.pathname.startsWith('/')) this.pathname = '/' + this.pathname;

      this.href = this.origin + this.pathname + this.search + this.hash;
      this.searchParams = new URLSearchParamsCtor(this.search); 
    }
    toString() { return this.href; }
    toJSON() { return this.href; }
  }

  class MockURLSearchParamsInternal { 
    _params: Record<string, string[]> = {}; 
    constructor(init?: string[][] | Record<string, string> | string | URLSearchParams) {
      if (typeof init === 'string') {
        const queryString = init.startsWith('?') ? init.substring(1) : init;
        queryString.split('&').forEach(pair => {
          if (!pair) return;
          const parts = pair.split('=');
          const key = decodeURIComponent(parts[0]);
          const value = decodeURIComponent(parts[1] || '');
          this.append(key, value);
        });
      } 
    }
    append(name: string, value: string) {
      if (!this._params[name]) this._params[name] = [];
      this._params[name].push(value);
    }
    get(name: string) { return this._params[name] ? this._params[name][0] : null; }
    getAll(name: string) { return this._params[name] || []; }
    set(name: string, value: string) { this._params[name] = [value]; }
    delete(name: string) { delete this._params[name]; }
    has(name: string) { return this._params.hasOwnProperty(name); }
    toString() {
      return Object.entries(this._params)
        .flatMap(([k, values]) => values.map(v => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`))
        .join('&');
    }
    forEach(callbackfn: (value: string, key: string, parent: this) => void, thisArg?: any): void {
        for (const key in this._params) {
            for (const value of this._params[key]) {
                callbackfn.call(thisArg, value, key, this);
            }
        }
    }
    [Symbol.iterator](): IterableIterator<[string, string]> {
        const entries: [string, string][] = [];
        for (const key in this._params) {
            for (const value of this._params[key]) {
                entries.push([key, value]);
            }
        }
        return entries[Symbol.iterator]();
    }
    keys(): IterableIterator<string> {
        return Object.keys(this._params)[Symbol.iterator]();
    }
    values(): IterableIterator<string> {
        const allValues: string[] = [];
        for (const key in this._params) {
            allValues.push(...this._params[key]);
        }
        return allValues[Symbol.iterator]();
    }
    sort(): void { /* no-op for mock */ }

  }
  
  const URLCtor = (typeof globalThis !== 'undefined' && (globalThis as any).URL) ? (globalThis as any).URL : MockURLInternal;
  const URLSearchParamsCtor = (typeof globalThis !== 'undefined' && (globalThis as any).URLSearchParams) ? (globalThis as any).URLSearchParams : MockURLSearchParamsInternal;


  const mockWin = {
    location: {
      href: 'http://localhost/',
      pathname: '/',
      search: '',
      hash: '',
      assign: mockFn(),
      replace: mockFn(),
      reload: mockFn(),
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: ''
    },
    history: {
      pushState: mockFn(),
      replaceState: mockFn(),
      go: mockFn(),
      back: mockFn(),
      forward: mockFn(),
      length: 0,
      scrollRestoration: 'auto' as ScrollRestoration,
      state: null,
    },
    addEventListener: mockFn(),
    removeEventListener: mockFn(),
    dispatchEvent: mockFn((event: Event) => true),
    fetch: mockFn(async () => new Response(null, { status: 200 })),
    localStorage: mockLocalStorage(), 
    indexedDB: mockIndexedDB(), 
    performance: mockPerformance(),
    console: mockConsole,
    CustomEvent: class CustomEvent<T = any> extends Event {
      detail: T;
      constructor(type: string, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail as T;
      }
    },
    Response: class MockResponse {
      _body: any;
      _status: number;
      _headers: Headers;
      _ok: boolean;
      _bodyUsed: boolean = false; 
      _type: ResponseType = 'default';
      _url: string = '';
      _redirected: boolean = false;
      _statusText: string = '';


      constructor(body?: BodyInit | null, init?: ResponseInit) {
        this._body = body;
        this._status = init?.status || 200;
        this._headers = new Headers(init?.headers); 
        this._ok = this._status >= 200 && this._status < 300;
        this._statusText = init?.statusText || (this._ok ? 'OK' : 'Error');
      }
      get status() { return this._status; }
      get ok() { return this._ok; }
      get headers() { return this._headers; }
      get bodyUsed() { return this._bodyUsed; } 
      get type() { return this._type; }
      get url() { return this._url; }
      get redirected() { return this._redirected; }
      get statusText() { return this._statusText; }
      
      get body(): ReadableStream<Uint8Array> | null {
        if (this._bodyUsed) throw new TypeError("Body already used");
        if (this._body === null || this._body === undefined) return null;
        const encoder = new TextEncoder();
        const data = typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
        const uint8Array = encoder.encode(data);
        let readCalled = false;
        return new ReadableStream({
          pull(controller) {
            if (readCalled) {
              controller.close();
              return;
            }
            controller.enqueue(uint8Array);
            readCalled = true;
          }
        }) as ReadableStream<Uint8Array>;
      }

      async text() {
        if (this._bodyUsed) throw new TypeError("Body already used");
        this._bodyUsed = true;
        if (this._body === null || this._body === undefined) return "";
        return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
      }
      async json() {
        if (this._bodyUsed) throw new TypeError("Body already used");
        this._bodyUsed = true;
        const textBody = await this.text();
        return JSON.parse(textBody);
      }
      clone() {
        const cloned = new MockResponse(this._body, { status: this._status, headers: new Headers(this._headers), statusText: this._statusText });
        (cloned as any)._type = this._type;
        (cloned as any)._url = this._url;
        (cloned as any)._redirected = this._redirected;
        return cloned as unknown as Response;
      }
      async arrayBuffer(): Promise<ArrayBuffer> { 
        if (this._bodyUsed) throw new TypeError("Body already used");
        this._bodyUsed = true;
        const text = await this.text();
        return new TextEncoder().encode(text).buffer;
       }
      async blob(): Promise<Blob> {
        if (this._bodyUsed) throw new TypeError("Body already used");
        this._bodyUsed = true;
        const text = await this.text();
        return new Blob([text]);
      }
      async formData(): Promise<FormData> { 
        if (this._bodyUsed) throw new TypeError("Body already used");
        this._bodyUsed = true;
        // This is a very simplified formData mock. Real implementation is complex.
        const fd = new FormData();
        const text = await this.text();
        try {
            const params = new URLSearchParamsCtor(text);
            params.forEach((value, key) => fd.append(key, value));
        } catch (e) {
            console.warn("MockResponse.formData could not parse body as URLSearchParams", e);
        }
        return fd;
      }
    },
    Request: class MockRequest {
      url: string;
      method: string;
      headers: Headers;
      _body: any;
      _bodyUsed: boolean = false;
      signal: AbortSignal;
      cache: RequestCache = 'default';
      credentials?: RequestCredentials = 'same-origin';
      integrity?: string = '';
      keepalive?: boolean = false;
      mode?: RequestMode = 'cors';
      redirect?: RequestRedirect = 'follow';
      referrer?: string = 'about:client';
      referrerPolicy?: ReferrerPolicy = 'strict-origin-when-cross-origin';
      destination: RequestDestination = 'document'; // Default value
      
      constructor(input: RequestInfo | URL | MockURLInternal, init?: MockRequestInit) {
        if (typeof input === 'string') {
          this.url = input;
        } else if ('href' in input && typeof (input as any).href === 'string') { // Duck typing for URL-like
          this.url = (input as any).href;
        } else { // input is Request
          const reqInput = input as Request;
          this.url = reqInput.url;
          this.method = reqInput.method;
          this.headers = new Headers(reqInput.headers); // Clone headers
          this._body = (input as any)._body !== undefined ? (input as any)._body : (input as any).body;
          this._bodyUsed = (input as any)._bodyUsed !== undefined ? (input as any)._bodyUsed : (input as any).bodyUsed;
          this.signal = reqInput.signal;
          this.cache = reqInput.cache;
          this.credentials = reqInput.credentials;
          this.integrity = reqInput.integrity;
          this.keepalive = reqInput.keepalive;
          this.mode = reqInput.mode;
          this.redirect = reqInput.redirect;
          this.referrer = reqInput.referrer;
          this.referrerPolicy = reqInput.referrerPolicy;
          this.destination = (input as any).destination || 'document'; // Use destination from input if available
        }

        this.method = init?.method || this.method || 'GET';
        this.headers = new Headers(init?.headers || this.headers); 
        this._body = init?.body || this._body;
        this.signal = init?.signal || this.signal || new AbortController().signal;
        if(init?.destination) this.destination = init.destination;
      }
      get bodyUsed() { return this._bodyUsed; }
      
      get body(): ReadableStream<Uint8Array> | null {
         if (this._bodyUsed && this.method !== 'GET' && this.method !== 'HEAD') throw new TypeError("Body already used");
         if (this._body === null || this._body === undefined) return null;
         const encoder = new TextEncoder();
         const data = typeof this._body === 'string' ? this._body : JSON.stringify(this._body); // Simplified
         const uint8Array = encoder.encode(data);
         let readCalled = false;
         return new ReadableStream({
           pull(controller) {
             if (readCalled) {
               controller.close();
               return;
             }
             controller.enqueue(uint8Array);
             readCalled = true;
           }
         }) as ReadableStream<Uint8Array>;
      }

      async text() {
        if (this._bodyUsed && this.method !== 'GET' && this.method !== 'HEAD') throw new TypeError("Body already used");
        this._bodyUsed = true;
        if (this._body === null || this._body === undefined) return "";
        return typeof this._body === 'string' ? this._body : JSON.stringify(this._body); // Simplified
      }
      clone() {
        const cloned = new MockRequest(this.url, { 
            method: this.method, 
            headers: new Headers(this.headers), 
            body: this._body, 
            signal: this.signal,
            cache: this.cache,
            credentials: this.credentials,
            integrity: this.integrity,
            keepalive: this.keepalive,
            mode: this.mode,
            redirect: this.redirect,
            referrer: this.referrer,
            referrerPolicy: this.referrerPolicy,
            destination: this.destination, // Pass destination for clone
        });
        (cloned as any)._bodyUsed = this._bodyUsed; 
        return cloned as unknown as Request;
      }
      async arrayBuffer(): Promise<ArrayBuffer> { 
        if (this._bodyUsed && this.method !== 'GET' && this.method !== 'HEAD') throw new TypeError("Body already used");
        this._bodyUsed = true;
        const text = await this.text();
        return new TextEncoder().encode(text).buffer;
      }
      async blob(): Promise<Blob> { 
        if (this._bodyUsed && this.method !== 'GET' && this.method !== 'HEAD') throw new TypeError("Body already used");
        this._bodyUsed = true;
        const text = await this.text();
        return new Blob([text]);
      }
      async formData(): Promise<FormData> {
        if (this._bodyUsed && this.method !== 'GET' && this.method !== 'HEAD') throw new TypeError("Body already used");
        this._bodyUsed = true;
        const fd = new FormData();
        const text = await this.text();
         try {
            const params = new URLSearchParamsCtor(text);
            params.forEach((value, key) => fd.append(key, value));
        } catch (e) {
            console.warn("MockRequest.formData could not parse body as URLSearchParams", e);
        }
        return fd;
       }
      async json(): Promise<any> {
        const textBody = await this.text(); // text() handles bodyUsed
        return JSON.parse(textBody);
      }
    },
    XMLHttpRequest: class MockXMLHttpRequest {
      method = '';
      url = '';
      status = 200;
      responseText = 'OK';
      readyState = 0;
      onreadystatechange: ((this: any, ev: any) => any) | null = null;
      _listeners: Record<string, Function[]> = {};
      open(method: string, url: string) {
        this.method = method;
        this.url = url;
        this.readyState = 1;
      }
      addEventListener(type: string, cb: Function) {
        if (!this._listeners[type]) this._listeners[type] = [];
        this._listeners[type].push(cb);
      }
      removeEventListener(type: string, cb: Function) {
        if (this._listeners[type]) {
          this._listeners[type] = this._listeners[type].filter((f) => f !== cb);
        }
      }
      dispatchEvent(event: any) {
        (this._listeners[event.type] || []).forEach((cb) => cb.call(this, event));
        const handler = (this as any)['on' + event.type];
        if (typeof handler === 'function') handler.call(this, event);
        return true;
      }
      send = mockFn(function (this: any, _body?: any) {
        this.readyState = 4;
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange'));
        }
        this.dispatchEvent(new Event('loadend'));
      });
      setRequestHeader(_h: string, _v: string) {}
      getResponseHeader(header: string) {
        if (header.toLowerCase() === 'content-type') return 'text/plain';
        return null;
      }
    },
    URL: URLCtor,
    URLSearchParams: URLSearchParamsCtor,
    document: (typeof globalThis !== 'undefined' && (globalThis as any).document) ? (globalThis as any).document : {
      createElement: mockFn((tagName: string) => ({
        tagName,
        style: {},
        appendChild: mockFn(),
        removeChild: mockFn(),
        setAttribute: mockFn(),
        removeAttribute: mockFn(),
        click: mockFn(), 
        href: '',
        download: '',
      })),
      body: {
        appendChild: mockFn(),
        removeChild: mockFn(),
        style: {}, 
        classList: { add: mockFn(), remove: mockFn(), contains: mockFn(() => false), toggle: mockFn() } as any, // Add classList
      },
      documentElement: {
        classList: { add: mockFn(), remove: mockFn(), contains: mockFn(() => false), toggle: mockFn() } as any, 
        style: {}, 
        scrollHeight: 1024,
        clientHeight: 768,
        scrollTop: 0, // Add scrollTop
        scrollLeft: 0, // Add scrollLeft
      },
      getElementById: mockFn((id: string) => null),
      addEventListener: mockFn(),
      removeEventListener: mockFn(),
    } as any, 
    EventTarget: (typeof globalThis !== 'undefined' && (globalThis as any).EventTarget) ? (globalThis as any).EventTarget : class EventTarget { addEventListener() { } removeEventListener() { } dispatchEvent() { return true; } },
    Event: (typeof globalThis !== 'undefined' && (globalThis as any).Event) ? (globalThis as any).Event : class Event { type: string; constructor(type: string) { this.type = type; } },

  };

  if (typeof window !== 'undefined') {
    Object.assign(window, mockWin);
  } else { 
    (globalThis as any).window = mockWin;
    Object.keys(mockWin).forEach(key => {
        if (!(globalThis as any)[key]) { 
            (globalThis as any)[key] = (mockWin as any)[key];
        }
    });
     if (!(globalThis as any).document) (globalThis as any).document = mockWin.document;
     if (!(globalThis as any).localStorage) (globalThis as any).localStorage = mockWin.localStorage;
     if (!(globalThis as any).indexedDB) (globalThis as any).indexedDB = mockWin.indexedDB;
     if (!(globalThis as any).performance) (globalThis as any).performance = mockWin.performance;
     if (!(globalThis as any).fetch) (globalThis as any).fetch = mockWin.fetch;
     if (!(globalThis as any).Response) (globalThis as any).Response = mockWin.Response;
     if (!(globalThis as any).Request) (globalThis as any).Request = mockWin.Request;
     if (!(globalThis as any).URL) (globalThis as any).URL = mockWin.URL;
     if (!(globalThis as any).URLSearchParams) (globalThis as any).URLSearchParams = mockWin.URLSearchParams;
     if (!(globalThis as any).CustomEvent) (globalThis as any).CustomEvent = mockWin.CustomEvent;
     if (!(globalThis as any).history) (globalThis as any).history = mockWin.history;
     if (!(globalThis as any).location) (globalThis as any).location = mockWin.location;
     // Update global console with mocked versions
     Object.assign(console, mockConsole);

  }
  return mockWin;
};


// Basic Jest object mock
type SpyableObject = { [key: string]: any };
type MethodKeys<T> = { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never }[keyof T];

export const jest = {
  fn: mockFn,
  spyOn: <T extends SpyableObject, M extends MethodKeys<T>>(
    object: T, 
    method: M, 
    accessType?: 'get' | 'set' // accessType is not fully handled in this simplified spy
  ): MockFunction<T[M]> => {
    const original = object[method];
    if (typeof original !== 'function') {
        // Allow spying on getters/setters if accessType is provided
        if (accessType) {
             const descriptor = Object.getOwnPropertyDescriptor(object, method);
             if (!descriptor || (accessType === 'get' && !descriptor.get) || (accessType === 'set' && !descriptor.set)) {
                throw new Error(`Cannot spyOn non-function property ${String(method)} without a corresponding getter/setter for access type '${accessType}'`);
             }
             // simplified: just create a mock function and overwrite, actual getter/setter behavior is lost for now
             const spy = mockFn() as MockFunction<any>;
             Object.defineProperty(object, method, {
                get: accessType === 'get' ? spy : descriptor.get,
                set: accessType === 'set' ? spy : descriptor.set,
                configurable: true,
             });
             (spy.mock as any).mockRestore = () => { Object.defineProperty(object, method, descriptor); };
             return spy as MockFunction<T[M]>;
        }
        throw new Error(`Cannot spyOn non-function property ${String(method)}`);
    }
    const spy = mockFn((...args: Parameters<T[M]>) => original.apply(object, args)) as MockFunction<T[M]>;
    object[method] = spy as any; // Cast to any to assign mock to original property
    (spy.mock as any).mockRestore = () => { object[method] = original; };
    return spy;
  },
  useFakeTimers: () => {
    if (typeof globalThis !== 'undefined') {
        (globalThis as any)._originalSetTimeout = globalThis.setTimeout;
        (globalThis as any)._originalClearTimeout = globalThis.clearTimeout;
        (globalThis as any)._originalSetInterval = globalThis.setInterval;
        (globalThis as any)._originalClearInterval = globalThis.clearInterval;

        (globalThis as any)._pendingTimers = [];
        let timerIdCounter = 1;

        (globalThis as any).setTimeout = ((cb: Function, ms: number, ...args: any[]) => {
            const id = timerIdCounter++;
            (globalThis as any)._pendingTimers.push({ id, cb, ms, args, type: 'timeout', scheduledTime: Date.now() });
            return id as any;
        }) as any;
        (globalThis as any).clearTimeout = ((id: number) => {
            (globalThis as any)._pendingTimers = (globalThis as any)._pendingTimers.filter((t: any) => t.id !== id);
        }) as any;
    }
  },
  advanceTimersByTime: (ms: number) => {
     if (typeof globalThis !== 'undefined' && (globalThis as any)._pendingTimers) {
        const now = Date.now(); 
        const timersToRun = (globalThis as any)._pendingTimers.filter((t: any) => (now - t.scheduledTime) + ms >= t.ms);
        (globalThis as any)._pendingTimers = (globalThis as any)._pendingTimers.filter((t: any) => !timersToRun.includes(t));
        timersToRun.forEach((t: any) => t.cb(...t.args));
     }
  },
  clearAllMocks: () => {
    // This is a simplified clearAllMocks. True Jest clears internal mock state.
    // Here, we'd need to iterate over all created mocks if we tracked them,
    // or rely on test authors to clear individual mocks in afterEach.
    // For now, this is a no-op placeholder for this basic helper.
  },
  useRealTimers: () => {
     if (typeof globalThis !== 'undefined') {
        if ((globalThis as any)._originalSetTimeout) globalThis.setTimeout = (globalThis as any)._originalSetTimeout;
        if ((globalThis as any)._originalClearTimeout) globalThis.clearTimeout = (globalThis as any)._originalClearTimeout;
        if ((globalThis as any)._originalSetInterval) globalThis.setInterval = (globalThis as any)._originalSetInterval;
        if ((globalThis as any)._originalClearInterval) globalThis.clearInterval = (globalThis as any)._originalClearInterval;
        (globalThis as any)._pendingTimers = [];
     }
  },
  requireActual: (moduleName: string) => {
    if (typeof require === "function") {
      return require(moduleName);
    }
    // Guard against 'module' not being defined for other environments
    if (typeof module !== 'undefined' && module.require) {
        return module.require(moduleName);
    }
    throw new Error("`require` or `module.require` is not defined. `requireActual` can only be used in a Node.js-like environment or where `require` is polyfilled.");
  },
  mock: (moduleName: string, factory?: () => any, options?: any) => { /* No-op for now, tests need to mock manually or use spyOn */ }
};

// Assign to global/window for tests that might try to access `jest.fn()` directly
if (typeof globalThis !== 'undefined') {
  (globalThis as any).jest = jest;
}


export async function runTests() {
  console.log("Starting test runner...");
  let failedTests = 0;
  let passedTests = 0;

  for (const suite of suites) {
    console.log(`\nDESCRIBE: ${suite.description}`);
    try {
        for (const beforeAllFn of suite.beforeAlls) await beforeAllFn();
        for (const test of suite.tests) {
        for (const beforeEachFn of suite.beforeEachs) await beforeEachFn();
        try {
            await test.fn();
            console.log(`  IT: ${test.description} ... PASSED`);
            passedTests++;
        } catch (e: any) {
            console.error(`  IT: ${test.description} ... FAILED`);
            console.error(`    ${e.message}`);
            if (e.stack) {
            const stackLines = e.stack.split('\n').slice(1, 5).join('\n    ');
            console.error(`    ${stackLines}`);
            }
            failedTests++;
        }
        for (const afterEachFn of suite.afterEachs) await afterEachFn();
        }
        for (const afterAllFn of suite.afterAlls) await afterAllFn();
    } catch (suiteError: any) {
        console.error(`ERROR in suite setup/teardown for "${suite.description}": ${suiteError.message}`);
        failedTests += suite.tests.length; // Assume all tests in suite failed if setup/teardown fails
    }
  }
  console.log(`\nTest runner finished. Passed: ${passedTests}, Failed: ${failedTests}`);
  if (failedTests > 0 && typeof process !== 'undefined' && (process as any).exit && (process as any).exitCode !== undefined) {
    (process as any).exitCode = 1; // Indicate failure for CI environments
  }
}


// --- renderHook and act for testing React Hooks ---

export const act = async (callback: () => void | Promise<void>) => {
  await reactAct(async () => {
    await callback();
  });
};

export interface RenderHookResult<TResult, TProps> {
  result: { current: TResult };
  rerender: (newProps?: TProps) => void;
  unmount: () => void;
}

export function renderHook<TResult, TProps = {}>(
  callback: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
): RenderHookResult<TResult, TProps> {
  const container = document.createElement('div');
  // Ensure body exists for appending the container
  if (!document.body) {
    const body = document.createElement('body');
    if (document.documentElement) {
        document.documentElement.appendChild(body);
    } else {
        const html = document.createElement('html');
        html.appendChild(body);
        (document as any).appendChild(html); 
    }
  }
  document.body.appendChild(container);


  let currentProps = options?.initialProps || ({} as TProps);
  const hookResultRef: { current: TResult | undefined } = { current: undefined };

  const TestComponent: React.FC<{ renderProps: TProps }> = ({ renderProps }) => {
    hookResultRef.current = callback(renderProps);
    return null;
  };

  const root = ReactDOM.createRoot(container);

  act(() => {
    root.render(React.createElement(TestComponent, { renderProps: currentProps }));
  });

  return {
    result: {
      get current() {
        if (hookResultRef.current === undefined) {
          throw new Error("Hook result is not available. Ensure the hook renders correctly and updates are wrapped in act().");
        }
        return hookResultRef.current;
      },
    },
    rerender: (newProps?: TProps) => {
      act(() => {
        if (newProps !== undefined) {
          currentProps = newProps;
        }
        root.render(React.createElement(TestComponent, { renderProps: currentProps }));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

// Initialize mocks immediately for Node.js environment for `run-tests.ts`
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  mockWindow();
}
// Ensure require is available in global scope for Node.js environment if not already
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).require === 'undefined' && typeof require !== 'undefined') {
    (globalThis as any).require = require;
}
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).process === 'undefined' && typeof process !== 'undefined') {
    (globalThis as any).process = process;
}
// Add module if it's missing in globalThis for Node.js
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).module === 'undefined' && typeof module !== 'undefined') {
    (globalThis as any).module = module;
}
