
import React from 'react';
import { SimpleBarChart } from './SimpleBarChart';
import { ChartDataItem } from '../types';
import { describe, it, expect } from '../test-utils/test-helpers';

describe('SimpleBarChart', () => {
  const mockData: ChartDataItem[] = [
    { name: 'A', value: 10 },
    { name: 'B', value: 20 },
    { name: 'C', value: 15 },
  ];

  it('should render title and "No data available" message when no data is provided', () => {
    const output = SimpleBarChart({ data: [], title: 'Test Chart Empty' }) as React.ReactElement;
    
    expect(output).toBeDefined();
    if (output && typeof output === 'object' && output.props) {
        expect((output.props as { children: React.ReactNode }).children).toContain('Test Chart Empty: No data available.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });
  
  it('should render "All values are zero" if all data values are zero', () => {
    const zeroData: ChartDataItem[] = [{name: 'A', value: 0}, {name: 'B', value: 0}];
    const output = SimpleBarChart({ data: zeroData, title: 'Zero Values Chart' }) as React.ReactElement;
    if (output && typeof output === 'object' && output.props) {
        expect((output.props as { children: React.ReactNode }).children).toContain('Zero Values Chart: All values are zero.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });

  it('should render title and SVG chart when data is provided', () => {
    const output = SimpleBarChart({ data: mockData, title: 'Test Chart With Data' }) as React.ReactElement;

    expect(output).toBeDefined();
    const childrenArray = React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[];
    const titleElement = childrenArray[0];
    const svgElement = childrenArray[1];

    expect(titleElement.props.children).toBe('Test Chart With Data'); 
    expect(svgElement.type).toBe('svg'); 
  });

  it('should correctly scale bars and render labels in SVG', () => {
    const output = SimpleBarChart({ data: mockData, title: 'Test Chart Scaling' }) as React.ReactElement;
    const svgElement = (React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[])[1];
    
    const svgChildren = React.Children.toArray((svgElement.props as { children: React.ReactNode }).children) as React.ReactElement[];
    expect(svgChildren.length).toBe(mockData.length + 2); // +2 for axis lines

    const firstBarGroup = svgChildren[0];
    expect(firstBarGroup.key).toBe('A');

    const barGroupChildren = React.Children.toArray((firstBarGroup.props as { children: React.ReactNode }).children) as React.ReactElement[];
    const rect = barGroupChildren[0];
    const nameLabel = barGroupChildren[1];
    const valueLabel = barGroupChildren[2];

    expect(rect.type).toBe('rect');
    expect((rect.props as any).height).toBe(10 * (200 / 20)); 
    expect((rect.props as any).y).toBe(200 - (10 * (200 / 20)));

    expect(nameLabel.props.children).toBe('A');
    expect(valueLabel.props.children).toBe('10ms');
  });

  it('should truncate long names for labels', () => {
    const longNameData: ChartDataItem[] = [{ name: 'VeryLongCategoryName', value: 5 }];
    const output = SimpleBarChart({ data: longNameData, title: 'Long Names' }) as React.ReactElement;
    const svgElement = (React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[])[1];
    const barGroup = (React.Children.toArray((svgElement.props as { children: React.ReactNode }).children) as React.ReactElement[])[0];
    const nameLabel = (React.Children.toArray((barGroup.props as { children: React.ReactNode }).children) as React.ReactElement[])[1];
    expect(nameLabel.props.children).toBe('VeryLon...');
  });
  
  it('should handle single data item correctly', () => {
    const singleData: ChartDataItem[] = [{ name: 'Single', value: 25 }];
    const output = SimpleBarChart({ data: singleData, title: 'Single Item' }) as React.ReactElement;
    const svgElement = (React.Children.toArray((output.props as { children: React.ReactNode }).children) as React.ReactElement[])[1];
    const svgChildren = React.Children.toArray((svgElement.props as { children: React.ReactNode }).children) as React.ReactElement[];
    expect(svgChildren.length).toBe(singleData.length + 2); // +2 for axis lines
    const barGroup = svgChildren[0];
    const rect = (React.Children.toArray((barGroup.props as { children: React.ReactNode }).children) as React.ReactElement[])[0];
    expect((rect.props as any).height).toBe(25 * (200 / 25)); 
  });
});
