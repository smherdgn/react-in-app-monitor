
import { getItem, setItem } from './localStorageHelper';
import { describe, it, expect, beforeEach, mockLocalStorage, mockFn, MockFunction } from '../test-utils/test-helpers';

describe('localStorageHelper', () => {
  let mockStorage: ReturnType<typeof mockLocalStorage>; 

  beforeEach(() => {
    mockStorage = mockLocalStorage(); 
    // Ensure console.warn is a fresh mock for each test
    if ((console.warn as MockFunction<any>).mock && (console.warn as MockFunction<any>).mock.mockClear) {
      ((console.warn as MockFunction<any>).mock.mockClear as any)();
    } else {
      (globalThis as any).console.warn = mockFn();
    }
  });

  describe('setItem', () => {
    it('should call localStorage.setItem with the key and stringified value', () => {
      setItem('testKey', { a: 1 });
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockStorage.setItem).toHaveBeenCalledWith('testKey', '{"a":1}');
    });

    it('should handle string values', () => {
      setItem('stringKey', 'hello');
      expect(mockStorage.setItem).toHaveBeenCalledWith('stringKey', '"hello"');
    });

    it('should handle number values', () => {
      setItem('numberKey', 123);
      expect(mockStorage.setItem).toHaveBeenCalledWith('numberKey', '123');
    });

    it('should not throw if localStorage.setItem throws, and should warn', () => {
      ((mockStorage.setItem as MockFunction<any>).mock.mockImplementationOnce as any)(() => { throw new Error("Quota exceeded"); });
      
      expect(() => setItem('errorKey', 'value')).not.toThrow();
      expect(console.warn).toHaveBeenCalledTimes(1);
      const consoleArgs = ((console.warn as MockFunction<any>).mock.calls as any)[0];
      expect(consoleArgs[0]).toContain('Error setting localStorage key "errorKey"');
    });
  });

  describe('getItem', () => {
    it('should call localStorage.getItem with the key', () => {
      getItem('testKey', null);
      expect(mockStorage.getItem).toHaveBeenCalledTimes(1);
      expect(mockStorage.getItem).toHaveBeenCalledWith('testKey');
    });

    it('should return the parsed value if item exists', () => {
      ((mockStorage.getItem as MockFunction<any>).mock.mockReturnValueOnce as any)('{"a":1}');
      const value = getItem<{ a: number }>('testKey', { a: 0 });
      expect(value).toEqual({ a: 1 });
    });

    it('should return the default value if item does not exist', () => {
      ((mockStorage.getItem as MockFunction<any>).mock.mockReturnValueOnce as any)(null);
      const defaultValue = { b: 2 };
      const value = getItem('testKey', defaultValue);
      expect(value).toEqual(defaultValue);
    });

    it('should return string value correctly', () => {
      ((mockStorage.getItem as MockFunction<any>).mock.mockReturnValueOnce as any)('"hello"');
      const value = getItem<string>('testKey', '');
      expect(value).toBe('hello');
    });

    it('should return number value correctly', () => {
      ((mockStorage.getItem as MockFunction<any>).mock.mockReturnValueOnce as any)('123');
      const value = getItem<number>('testKey', 0);
      expect(value).toBe(123);
    });

    it('should return default value if JSON.parse throws, and should warn', () => {
      ((mockStorage.getItem as MockFunction<any>).mock.mockReturnValueOnce as any)('invalid-json');
      const defaultValue = { c: 3 };
      const value = getItem('testKey', defaultValue);

      expect(value).toEqual(defaultValue);
      expect(console.warn).toHaveBeenCalledTimes(1);
      const consoleArgs = ((console.warn as MockFunction<any>).mock.calls as any)[0];
      expect(consoleArgs[0]).toContain('Error reading localStorage key "testKey"');
    });

    it('should return default value if localStorage.getItem throws, and should warn', () => {
      ((mockStorage.getItem as MockFunction<any>).mock.mockImplementationOnce as any)(() => { throw new Error("Storage error"); });
      const defaultValue = { d: 4 };
      const value = getItem('testKey', defaultValue);

      expect(value).toEqual(defaultValue);
      expect(console.warn).toHaveBeenCalledTimes(1);
      const consoleArgs = ((console.warn as MockFunction<any>).mock.calls as any)[0];
      expect(consoleArgs[0]).toContain('Error reading localStorage key "testKey"');
    });
  });
});
