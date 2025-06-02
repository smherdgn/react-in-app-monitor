
import React from 'react';
import { ChartDataItem } from '../types';

interface SimpleBarChartProps {
  data: ChartDataItem[];
  title: string;
  color?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, title, color = "currentColor" }) => {
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

  const chartHeight = 200;
  const chartWidth = 350; // Base width, SVG will scale via 100% width
  const barPadding = 5;
  const barWidth = (chartWidth - (data.length -1) * barPadding) / data.length;
  const maxValue = Math.max(...data.map(item => item.value), 0);

  if (maxValue === 0 && data.every(item => item.value === 0)) {
     return <div style={Object.assign({}, noDataStyle, document.documentElement.classList.contains('dark') ? darkNoDataStyle : {})}>{title}: All values are zero.</div>;
  }
  
  const scale = maxValue > 0 ? chartHeight / maxValue : 1;
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div style={Object.assign({}, containerStyle, isDark ? darkContainerStyle : {})}>
      <h3 style={Object.assign({}, titleStyle, isDark ? darkTitleStyle : {})}>{title}</h3>
      <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}>
        {data.map((item, index) => {
          const barHeight = Math.max(0, item.value * scale);
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
                style={{ transition: 'all 0.3s ease-in-out' }}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="10"
                fill={isDark ? 'var(--text-secondary-dark)' : 'var(--text-secondary-light)'}
              >
                {item.name.length > 10 ? item.name.substring(0,7)+'...' : item.name}
              </text>
               <text
                x={x + barWidth / 2}
                y={y - 5 > 0 ? y - 5 : 10}
                textAnchor="middle"
                fontSize="10"
                fill={isDark ? 'var(--text-primary-dark)' : 'var(--text-primary-light)'}
              >
                {item.value.toFixed(0)}ms
              </text>
            </g>
          );
        })}
        <line x1="0" y1="0" x2="0" y2={chartHeight} stroke={isDark ? 'var(--border-dark)' : 'var(--border-light)'} />
        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={isDark ? 'var(--border-dark)' : 'var(--border-light)'} />
      </svg>
    </div>
  );
};
