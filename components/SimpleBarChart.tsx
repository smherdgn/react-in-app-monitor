
import React from 'react';
import { ChartDataItem } from '../types';

interface SimpleBarChartProps {
  data: ChartDataItem[];
  title: string;
  color?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, title, color = "currentColor" }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">{title}: No data available.</div>;
  }

  const chartHeight = 200;
  const chartWidth = 350;
  const barPadding = 5;
  const barWidth = (chartWidth - (data.length -1) * barPadding) / data.length;
  const maxValue = Math.max(...data.map(item => item.value), 0);

  if (maxValue === 0 && data.every(item => item.value === 0)) {
     return <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">{title}: All values are zero.</div>;
  }
  
  const scale = maxValue > 0 ? chartHeight / maxValue : 1;

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
      <h3 className="text-md font-semibold mb-2 text-text-primary-light dark:text-text-primary-dark">{title}</h3>
      <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}>
        {data.map((item, index) => {
          const barHeight = Math.max(0, item.value * scale); // Ensure barHeight is not negative
          const x = index * (barWidth + barPadding);
          const y = chartHeight - barHeight;
          return (
            <g key={item.name}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                className="transition-all duration-300 ease-in-out"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="10"
                className="fill-current text-text-secondary-light dark:text-text-secondary-dark"
              >
                {item.name.length > 10 ? item.name.substring(0,7)+'...' : item.name}
              </text>
               <text
                x={x + barWidth / 2}
                y={y - 5 > 0 ? y - 5 : 10} // Position value above bar or at top if bar is too small/negative
                textAnchor="middle"
                fontSize="10"
                className="fill-current text-text-primary-light dark:text-text-primary-dark"
              >
                {item.value.toFixed(0)}ms
              </text>
            </g>
          );
        })}
        {/* Basic Y-axis line */}
        <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="currentColor" className="stroke-current text-border-light dark:text-border-dark" />
        {/* Basic X-axis line */}
        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="currentColor" className="stroke-current text-border-light dark:text-border-dark" />
      </svg>
    </div>
  );
};
