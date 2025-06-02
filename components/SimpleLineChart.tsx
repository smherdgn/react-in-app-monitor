
import React from 'react';
import { TimeChartDataItem } from '../types';

interface SimpleLineChartProps {
  data: TimeChartDataItem[];
  title: string;
  color?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, title, color = "currentColor" }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">{title}: No data available.</div>;
  }
  
  const sortedData = [...data].sort((a,b) => a.time - b.time);

  const chartHeight = 200;
  const chartWidth = 350;
  const padding = 30; // for labels

  const maxCount = Math.max(...sortedData.map(item => item.count), 0);
  const minTime = sortedData[0]?.time ?? Date.now();
  const maxTime = sortedData[sortedData.length - 1]?.time ?? Date.now();

  if (maxCount === 0 && sortedData.every(item => item.count === 0)) {
    return <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">{title}: All counts are zero.</div>;
  }

  const timeRange = maxTime - minTime;

  const getX = (time: number) => {
    if (timeRange === 0) return padding; // single point
    return ((time - minTime) / timeRange) * (chartWidth - 2 * padding) + padding;
  };

  const getY = (count: number) => {
    if (maxCount === 0) return chartHeight - padding; // all zero
    return chartHeight - padding - (count / maxCount) * (chartHeight - 2 * padding);
  };

  const points = sortedData.map(item => `${getX(item.time)},${getY(item.count)}`).join(' ');

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
      <h3 className="text-md font-semibold mb-2 text-text-primary-light dark:text-text-primary-dark">{title}</h3>
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Y axis */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} className="stroke-current text-border-light dark:text-border-dark" />
        <text x={padding - 10} y={padding} textAnchor="end" fontSize="10" className="fill-current text-text-secondary-light dark:text-text-secondary-dark">{maxCount}</text>
        <text x={padding - 10} y={chartHeight - padding} textAnchor="end" fontSize="10" className="fill-current text-text-secondary-light dark:text-text-secondary-dark">0</text>

        {/* X axis */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} className="stroke-current text-border-light dark:text-border-dark" />
        <text x={padding} y={chartHeight - padding + 15} textAnchor="start" fontSize="10" className="fill-current text-text-secondary-light dark:text-text-secondary-dark">{new Date(minTime).toLocaleTimeString()}</text>
        <text x={chartWidth - padding} y={chartHeight - padding + 15} textAnchor="end" fontSize="10" className="fill-current text-text-secondary-light dark:text-text-secondary-dark">{new Date(maxTime).toLocaleTimeString()}</text>

        {sortedData.length > 0 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            className="transition-all duration-300 ease-in-out"
          />
        )}

        {sortedData.map((item, index) => (
          <circle
            key={index}
            cx={getX(item.time)}
            cy={getY(item.count)}
            r="3"
            fill={color}
            className="transition-all duration-300 ease-in-out"
          />
        ))}
      </svg>
    </div>
  );
};
