
import React from 'react';
import { TimeChartDataItem } from '../types';

interface SimpleLineChartProps {
  data: TimeChartDataItem[];
  title: string;
  color?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, title, color = "currentColor" }) => {
  const containerStyle: React.CSSProperties = {
    padding: '1rem',
    backgroundColor: 'var(--surface-elevated-light)',
    borderRadius: '0.5rem',
    boxShadow: 'var(--shadow-md)',
  };
  const darkContainerStyle: React.CSSProperties = {
     backgroundColor: 'var(--surface-elevated-dark)',
  };
  const titleStyle: React.CSSProperties = {
    fontSize: '1rem', // md
    fontWeight: 600, // semibold
    marginBottom: '0.5rem',
    color: 'var(--text-primary-light)',
  };
  const darkTitleStyle: React.CSSProperties = {
     color: 'var(--text-primary-dark)',
  };
  const noDataStyle: React.CSSProperties = {
    padding: '1rem',
    textAlign: 'center',
    color: 'var(--text-secondary-light)',
  };
  const darkNoDataStyle: React.CSSProperties = {
     color: 'var(--text-secondary-dark)',
  };

  if (!data || data.length === 0) {
    return <div style={Object.assign({}, noDataStyle, document.documentElement.classList.contains('dark') ? darkNoDataStyle : {})}>{title}: No data available.</div>;
  }
  
  const sortedData = [...data].sort((a,b) => a.time - b.time);

  const chartHeight = 200;
  const chartWidth = 350; // Base width
  const padding = 30; 

  const maxCount = Math.max(...sortedData.map(item => item.count), 0);
  const minTime = sortedData[0]?.time ?? Date.now();
  const maxTime = sortedData[sortedData.length - 1]?.time ?? Date.now();

  if (maxCount === 0 && sortedData.every(item => item.count === 0)) {
    return <div style={Object.assign({}, noDataStyle, document.documentElement.classList.contains('dark') ? darkNoDataStyle : {})}>{title}: All counts are zero.</div>;
  }

  const timeRange = maxTime - minTime;

  const getX = (time: number) => {
    if (timeRange === 0) return padding; 
    return ((time - minTime) / timeRange) * (chartWidth - 2 * padding) + padding;
  };

  const getY = (count: number) => {
    if (maxCount === 0) return chartHeight - padding; 
    return chartHeight - padding - (count / maxCount) * (chartHeight - 2 * padding);
  };

  const points = sortedData.map(item => `${getX(item.time)},${getY(item.count)}`).join(' ');
  const isDark = document.documentElement.classList.contains('dark');
  const axisLabelColor = isDark ? 'var(--text-secondary-dark)' : 'var(--text-secondary-light)';
  const axisLineColor = isDark ? 'var(--border-dark)' : 'var(--border-light)';


  return (
    <div style={Object.assign({}, containerStyle, isDark ? darkContainerStyle : {})}>
      <h3 style={Object.assign({}, titleStyle, isDark ? darkTitleStyle : {})}>{title}</h3>
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke={axisLineColor} />
        <text x={padding - 10} y={padding + 5} textAnchor="end" fontSize="10" fill={axisLabelColor}>{maxCount}</text>
        <text x={padding - 10} y={chartHeight - padding} textAnchor="end" fontSize="10" fill={axisLabelColor}>0</text>

        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke={axisLineColor} />
        <text x={padding} y={chartHeight - padding + 15} textAnchor="start" fontSize="10" fill={axisLabelColor}>{new Date(minTime).toLocaleTimeString()}</text>
        <text x={chartWidth - padding} y={chartHeight - padding + 15} textAnchor="end" fontSize="10" fill={axisLabelColor}>{new Date(maxTime).toLocaleTimeString()}</text>

        {sortedData.length > 0 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            style={{ transition: 'all 0.3s ease-in-out' }}
          />
        )}

        {sortedData.map((item, index) => (
          <circle
            key={index}
            cx={getX(item.time)}
            cy={getY(item.count)}
            r="3"
            fill={color}
            style={{ transition: 'all 0.3s ease-in-out' }}
          />
        ))}
      </svg>
    </div>
  );
};
