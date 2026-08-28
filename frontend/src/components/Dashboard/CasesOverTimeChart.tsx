import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CaseOverTime } from '../../types/reconciliation';

interface DataPoint {
  day: string;
  value: number;
  x: number;
  y: number;
}

interface CasesOverTimeChartProps {
  casesOverTime?: CaseOverTime[];
  loading?: boolean;
}

const timeframes = ['Today', 'This Week', 'This Month', 'Last 30 Days', 'YTD'];

const defaultPoints: CaseOverTime[] = [
  { day: 'Aug 21', date: '2026-08-21', value: 4 },
  { day: 'Aug 22', date: '2026-08-22', value: 7 },
  { day: 'Aug 23', date: '2026-08-23', value: 5 },
  { day: 'Aug 24', date: '2026-08-24', value: 9 },
  { day: 'Aug 25', date: '2026-08-25', value: 6 },
  { day: 'Aug 26', date: '2026-08-26', value: 8 },
  { day: 'Aug 27', date: '2026-08-27', value: 14 },
];

/**
 * Dynamic Cases Over Time Curved Line Chart Component
 */
export const CasesOverTimeChart = ({ casesOverTime = [], loading: _loading = false }: CasesOverTimeChartProps) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('This Week');
  const [showDropdown, setShowDropdown] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  let points: CaseOverTime[] = defaultPoints;

  if (casesOverTime && casesOverTime.length >= 7) {
    points = casesOverTime;
  } else if (casesOverTime && casesOverTime.length > 0) {
    points = defaultPoints.map(dp => {
      const match = casesOverTime.find(c => c.date === dp.date || c.day?.toLowerCase() === dp.day?.toLowerCase());
      return match ? { ...dp, value: match.value } : dp;
    });
  }

  if (selectedTimeframe === 'Today') {
    points = [points[points.length - 1] ?? { day: 'Today', date: '', value: 14 }];
  } else if (selectedTimeframe === 'This Week') {
    points = points.slice(-7);
  }

  useEffect(() => {
    setAnimKey(prev => prev + 1);
  }, [selectedTimeframe, casesOverTime]);

  const width = 360;
  const height = 180;
  const padding = 24;

  const values = points.map(p => p.value || 0);
  const maxVal = Math.max(...values, 15);
  const minVal = 0;

  const coords: DataPoint[] = points.map((p, idx) => {
    const x = points.length === 1
      ? width / 2
      : padding + (idx * (width - 2 * padding)) / Math.max(points.length - 1, 1);
    const y = height - padding - ((p.value - minVal) / (maxVal - minVal)) * (height - 2 * padding);
    return { x, y, value: p.value, day: p.day };
  });

  const pathD = coords.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const p0 = a[i - 1];
    const cp1x = p0.x + (point.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (point.x - p0.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, '');

  const areaD = coords.length > 1
    ? `${pathD} L ${coords[coords.length - 1].x},${height - padding} L ${coords[0].x},${height - padding} Z`
    : '';

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
      height: '340px',
      position: 'relative',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* Header & Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Cases Over Time</h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {points.length > 1 ? `${points[0]?.day} → ${points[points.length - 1]?.day}` : 'Active ledger activity'}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              padding: '5px 10px', borderRadius: '8px',
              fontSize: '0.75rem', fontWeight: '700', color: '#475569', cursor: 'pointer',
            }}
          >
            <span>{selectedTimeframe}</span>
            <ChevronDown size={14} color="#94a3b8" />
          </button>
          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: '4px',
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              zIndex: 20, width: '120px', overflow: 'hidden',
            }}>
              {timeframes.map(tf => (
                <div
                  key={tf}
                  onClick={() => { setSelectedTimeframe(tf); setShowDropdown(false); }}
                  style={{
                    padding: '8px 12px', fontSize: '0.75rem',
                    fontWeight: selectedTimeframe === tf ? '800' : '600',
                    color: selectedTimeframe === tf ? '#4f46e5' : '#334155',
                    background: selectedTimeframe === tf ? '#f5f3ff' : 'transparent',
                    cursor: 'pointer',
                  }}
                >{tf}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div key={animKey} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, Math.round(maxVal / 2), maxVal].map((val, idx) => {
            const y = height - padding - (val / maxVal) * (height - 2 * padding);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                <text x={padding - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">{val}</text>
              </g>
            );
          })}

          {areaD && (
            <path d={areaD} fill="url(#purpleGradient)" style={{ animation: 'riseGradientArea 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards' }} />
          )}

          {coords.length > 1 && (
            <path
              d={pathD} fill="none" stroke="#6366f1" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="1000" strokeDashoffset="1000"
              style={{ animation: 'drawSmoothCurve 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            />
          )}

          {coords.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={point.x} cy={point.y} r="4.5"
                fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5"
                style={{ animation: `popInDot 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + idx * 0.08}s backwards` }}
              />
              <text x={point.x} y={height - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748b" fontFamily="sans-serif">
                {point.day}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
