
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
    const output = SimpleBarChart({ data: [], title: 'Test Chart Empty' });
    
    expect(output).toBeDefined();
    // output is a ReactElement here, its props.children is the content of the div
    if (output && typeof output === 'object' && 'props' in output) {
        expect((output as React.ReactElement).props.children).toContain('Test Chart Empty: No data available.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });
  
  it('should render "All values are zero" if all data values are zero', () => {
    const zeroData: ChartDataItem[] = [{name: 'A', value: 0}, {name: 'B', value: 0}];
    const output = SimpleBarChart({ data: zeroData, title: 'Zero Values Chart' });
    if (output && typeof output === 'object' && 'props' in output) {
        expect((output as React.ReactElement).props.children).toContain('Zero Values Chart: All values are zero.');
    } else {
        throw new Error("Output is not a React element with props");
    }
  });

  it('should render title and SVG chart when data is provided', () => {
    const output = SimpleBarChart({ data: mockData, title: 'Test Chart With Data' }) as React.ReactElement;

    expect(output).toBeDefined();
    expect(output.props.children[0].props.children).toBe('Test Chart With Data'); 
    expect(output.props.children[1].type).toBe('svg'); 
  });

  it('should correctly scale bars and render labels in SVG', () => {
    const output = SimpleBarChart({ data: mockData, title: 'Test Chart Scaling' }) as React.ReactElement;
    const svgElement = output.props.children[1] as React.ReactElement; // This is the <svg>
    
    expect(svgElement.props.children.length).toBe(mockData.length + 2); 

    const firstBarGroup = svgElement.props.children[0] as React.ReactElement; // This is the first <g>
    expect(firstBarGroup.key).toBe('A');
    const rect = firstBarGroup.props.children[0] as React.ReactElement;
    const nameLabel = firstBarGroup.props.children[1] as React.ReactElement;
    const valueLabel = firstBarGroup.props.children[2] as React.ReactElement;

    expect(rect.type).toBe('rect');
    expect(rect.props.height).toBe(10 * (200 / 20)); 
    expect(rect.props.y).toBe(200 - (10 * (200 / 20)));

    expect(nameLabel.props.children).toBe('A');
    expect(valueLabel.props.children).toBe('10ms');
  });

  it('should truncate long names for labels', () => {
    const longNameData: ChartDataItem[] = [{ name: 'VeryLongCategoryName', value: 5 }];
    const output = SimpleBarChart({ data: longNameData, title: 'Long Names' }) as React.ReactElement;
    const svgElement = output.props.children[1] as React.ReactElement;
    const barGroup = svgElement.props.children[0] as React.ReactElement;
    const nameLabel = barGroup.props.children[1] as React.ReactElement;
    expect(nameLabel.props.children).toBe('VeryLon...');
  });
  
  it('should handle single data item correctly', () => {
    const singleData: ChartDataItem[] = [{ name: 'Single', value: 25 }];
    const output = SimpleBarChart({ data: singleData, title: 'Single Item' }) as React.ReactElement;
    const svgElement = output.props.children[1] as React.ReactElement;
    expect(svgElement.props.children.length).toBe(singleData.length + 2);
    const barGroup = svgElement.props.children[0] as React.ReactElement;
    const rect = barGroup.props.children[0] as React.ReactElement;
    expect(rect.props.height).toBe(25 * (200 / 25)); 
  });
});
