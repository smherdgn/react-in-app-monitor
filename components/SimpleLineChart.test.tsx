
import React from 'react';
import { SimpleLineChart } from './SimpleLineChart';
import { TimeChartDataItem } from '../types';
import { describe, it, expect, beforeEach, afterEach, mockFn, MockFunction } from '../test-utils/test-helpers';

describe('SimpleLineChart', () => {
  const now = Date.now();
  const mockData: TimeChartDataItem[] = [
    { time: now - 20000, count: 5 },
    { time: now - 10000, count: 10 },
    { time: now, count: 7 },
  ];
  
  let originalDateToLocaleTimeString: (locales?: string | string[] | undefined, options?: Intl.DateTimeFormatOptions | undefined) => string;

  beforeEach(() => {
    originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = mockFn((locales?: string, options?: any) => {
        // Simple mock for testing, doesn't actually use locales/options
        const d = new Date(this.valueOf());
        return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    }) as any;
  });

  afterEach(() => {
    Date.prototype.toLocaleTimeString = originalDateToLocaleTimeString;
    if ((Date.prototype.toLocaleTimeString as MockFunction<any>).mockClear) {
        (Date.prototype.toLocaleTimeString as MockFunction<any>).mockClear();
    }
  });

  it('should render title and "No data available" message when no data is provided', () => {
    const output = SimpleLineChart({ data: [], title: 'Test Line Chart Empty' });
    
    expect(output).toBeDefined();
    if (output && typeof output === 'object' && 'props' in output) {
        expect((output as React.ReactElement).props.children).toContain('Test Line Chart Empty: No data available.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });
  
  it('should render "All counts are zero" if all data counts are zero', () => {
    const zeroData: TimeChartDataItem[] = [{time: now, count: 0}, {time: now + 1000, count: 0}];
    const output = SimpleLineChart({ data: zeroData, title: 'Zero Counts Chart' });
    if (output && typeof output === 'object' && 'props' in output) {
        expect((output as React.ReactElement).props.children).toContain('Zero Counts Chart: All counts are zero.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });

  it('should render title and SVG chart when data is provided', () => {
    const output = SimpleLineChart({ data: mockData, title: 'Test Line Chart With Data' }) as React.ReactElement;

    expect(output).toBeDefined();
    expect(output.props.children[0].props.children).toBe('Test Line Chart With Data'); 
    expect(output.props.children[1].type).toBe('svg'); 
  });

  it('should correctly generate polyline points and render circles', () => {
    const output = SimpleLineChart({ data: mockData, title: 'Test Line Chart Scaling' }) as React.ReactElement;
    const svgElement = output.props.children[1] as React.ReactElement; // This is the <svg>
    
    const polyline = svgElement.props.children.find((child: React.ReactElement) => child && child.type === 'polyline');
    const circles = svgElement.props.children.filter((child: React.ReactElement) => child && child.type === 'circle');

    expect(polyline).toBeDefined();
    expect(polyline.props.points).toBeDefined();
    expect(typeof polyline.props.points).toBe('string');
    expect(circles.length).toBe(mockData.length);
  });
  
  it('should render axis labels with mocked time', () => {
    (Date.prototype.toLocaleTimeString as MockFunction<any>).mockImplementation(function(this: Date){
      if (this.valueOf() === mockData[0].time) return '10:00:00';
      if (this.valueOf() === mockData[mockData.length - 1].time) return '10:00:20';
      return '??:??:??';
    });

    const output = SimpleLineChart({ data: mockData, title: 'Axis Labels Test' }) as React.ReactElement;
    const svgElement = output.props.children[1] as React.ReactElement;
    
    const textElements = svgElement.props.children.filter((child: React.ReactElement) => child && child.type === 'text') as React.ReactElement[];
    
    const minTimeLabel = textElements.find(t => t.props.children === '10:00:00');
    const maxTimeLabel = textElements.find(t => t.props.children === '10:00:20');
    const maxCountLabel = textElements.find(t => t.props.children === '10'); // Max count from mockData
    const zeroCountLabel = textElements.find(t => t.props.children === '0');

    expect(minTimeLabel).toBeDefined();
    expect(maxTimeLabel).toBeDefined();
    expect(maxCountLabel).toBeDefined();
    expect(zeroCountLabel).toBeDefined();
  });
});
