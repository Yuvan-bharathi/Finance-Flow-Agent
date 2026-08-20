import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Cases Over Time Curved Line Chart Component
 * Renders a smooth SVG line chart with gradient fill and date labels.
 * 
 * Called by:
 * - Dashboard.jsx
 */
export const CasesOverTimeChart = () => {
  const points = [
    { day: 'May 20', value: 5 },
    { day: 'May 21', value: 15 },
    { day: 'May 22', value: 34 },
    { day: 'May 23', value: 10 },
    { day: 'May 24', value: 22 },
    { day: 'May 25', value: 26 },
    { day: 'May 26', value: 40 }
  ];

  const width = 360;
  const height = 180;
  const padding = 24;

  const maxVal = 50;
  const minVal = 0;

  // Convert points to SVG coordinates
  const coords = points.map((p, idx) => {
    const x = padding + (idx * (width - 2 * padding)) / (points.length - 1);
    const y = height - padding - ((p.value - minVal) / (maxVal - minVal)) * (height - 2 * padding);
    return { x, y, value: p.value, day: p.day };
  });

  // Construct smooth Bezier path
  const pathD = coords.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const p0 = a[i - 1];
    const cp1x = p0.x + (point.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (point.x - p0.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, '');

  // Closed path for area gradient fill
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height - padding} L ${coords[0].x},${height - padding} Z`;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      height: '320px'
    }}>
      
      {/* Card Header & Period Selector Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
          Cases Over Time
        </h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#475569',
          cursor: 'pointer'
        }}>
          <span>This Week</span>
          <ChevronDown size={14} color="#94a3b8" />
        </div>
      </div>

      {/* SVG Curved Chart */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0, 10, 20, 30, 40, 50].map((val, idx) => {
            const y = height - padding - (val / 50) * (height - 2 * padding);
            return (
              <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            );
          })}

          {/* Gradient Filled Area */}
          <path d={areaD} fill="url(#purpleGradient)" />

          {/* Smooth Purple/Blue Line */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />

          {/* Rounded Data Points */}
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="#6366f1"
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* X-Axis Date Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginTop: '6px' }}>
          {points.map((pt, i) => (
            <span key={i} style={{ fontSize: '0.675rem', color: '#94a3b8', fontWeight: '500' }}>
              {pt.day}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
};
