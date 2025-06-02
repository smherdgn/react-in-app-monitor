
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
  let dateToLocaleTimeStringMock: MockFunction<any>;


  beforeEach(() => {
    originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
    dateToLocaleTimeStringMock = mockFn((locales?: string, options?: any) => {
        const d = new Date( (this as any).valueOf()); // this refers to the Date instance
        return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    });
    Date.prototype.toLocaleTimeString = dateToLocaleTimeStringMock as any;
  });

  afterEach(() => {
    Date.prototype.toLocaleTimeString = originalDateToLocaleTimeString;
    dateToLocaleTimeStringMock.mock.mockClear();
  });

  it('should render title and "No data available" message when no data is provided', () => {
    const output = SimpleLineChart({ data: [], title: 'Test Line Chart Empty' }) as React.ReactElement;
    
    expect(output).toBeDefined();
    if (output && typeof output === 'object' && output.props) {
        expect((output.props as { children: React.ReactNode }).children).toContain('Test Line Chart Empty: No data available.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });
  
  it('should render "All counts are zero" if all data counts are zero', () => {
    const zeroData: TimeChartDataItem[] = [{time: now, count: 0}, {time: now + 1000, count: 0}];
    const output = SimpleLineChart({ data: zeroData, title: 'Zero Counts Chart' }) as React.ReactElement;
    if (output && typeof output === 'object' && output.props) {
        expect((output.props as { children: React.ReactNode }).children).toContain('Zero Counts Chart: All counts are zero.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });

  it('should render title and SVG chart when data is provided', () => {
    const output = SimpleLineChart({ data: mockData, title: 'Test Line Chart With Data' }) as React.ReactElement;

    expect(output).toBeDefined();
    const childrenArray = React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[];
    const titleElement = childrenArray[0];
    const svgElement = childrenArray[1];

    expect(titleElement.props.children).toBe('Test Line Chart With Data'); 
    expect(svgElement.type).toBe('svg'); 
  });

  it('should correctly generate polyline points and render circles', () => {
    const output = SimpleLineChart({ data: mockData, title: 'Test Line Chart Scaling' }) as React.ReactElement;
    const svgElement = (React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[])[1];
    
    const svgChildren = React.Children.toArray((svgElement.props as { children: React.ReactNode }).children) as React.ReactElement[];
    const polyline = svgChildren.find((child: React.ReactElement) => child && child.type === 'polyline');
    const circles = svgChildren.filter((child: React.ReactElement) => child && child.type === 'circle');

    expect(polyline).toBeDefined();
    if(polyline) {
      expect((polyline.props as any).points).toBeDefined();
      expect(typeof (polyline.props as any).points).toBe('string');
    }
    expect(circles.length).toBe(mockData.length);
  });
  
  it('should render axis labels with mocked time', () => {
    dateToLocaleTimeStringMock.mock.mockImplementation(function(this: Date){
      if (this.valueOf() === mockData[0].time) return '10:00:00';
      if (this.valueOf() === mockData[mockData.length - 1].time) return '10:00:20';
      return '??:??:??';
    });

    const output = SimpleLineChart({ data: mockData, title: 'Axis Labels Test' }) as React.ReactElement;
    const svgElement = (React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[])[1];
    
    const textElements = (React.Children.toArray((svgElement.props as { children: React.ReactNode }).children) as React.ReactElement[]).filter(child => child && child.type === 'text');
    
    const minTimeLabel = textElements.find(t => (t.props as { children: React.ReactNode }).children === '10:00:00');
    const maxTimeLabel = textElements.find(t => (t.props as { children: React.ReactNode }).children === '10:00:20');
    const maxCountLabel = textElements.find(t => (t.props as { children: React.ReactNode }).children === 10); // Max count from mockData is a number
    const zeroCountLabel = textElements.find(t => (t.props as { children: React.ReactNode }).children === 0); // Zero count is a number

    expect(minTimeLabel).toBeDefined();
    expect(maxTimeLabel).toBeDefined();
    expect(maxCountLabel).toBeDefined();
    expect(zeroCountLabel).toBeDefined();
  });
});
