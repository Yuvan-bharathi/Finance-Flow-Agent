import { useState, useEffect } from 'react';
import { AnimatedCounter } from '../common/AnimatedCounter';
import type { StatusBreakdown } from '../../types/reconciliation';

interface StatusCategory {
  label: string;
  count: number;
  color: string;
  percent: string;
  strokeDasharray: string;
  strokeDashoffset: number;
}

interface CaseStatusChartProps {
  statusBreakdown?: StatusBreakdown[];
  totalCases?: number;
  loading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  resolved:      { label: 'Resolved',      color: '#10b981' },
  approved:      { label: 'Resolved',      color: '#10b981' },
  pending_review:{ label: 'Pending Review',color: '#3b82f6' },
  under_review:  { label: 'Under Review',  color: '#f59e0b' },
  ai_processing: { label: 'AI Processing', color: '#8b5cf6' },
  pending_info:  { label: 'Pending Info',  color: '#ec4899' },
  rejected:      { label: 'Rejected',      color: '#ef4444' },
  open:          { label: 'Open',          color: '#06b6d4' },
};

/**
 * Case Status Overview Donut Chart Component
 * Dynamically renders SVG Donut Chart with on-load draw animation.
 */
export const CaseStatusChart = ({ statusBreakdown = [], totalCases = 0, loading = false }: CaseStatusChartProps) => {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(easeOut);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setAnimProgress(1);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
  }, [statusBreakdown]);

  const categoriesMap: Record<string, { label: string; count: number; color: string }> = {};
  statusBreakdown.forEach(item => {
    const rawKey = (item.status || 'open').toLowerCase();
    const config = statusConfig[rawKey] ?? { label: rawKey.toUpperCase(), color: '#64748b' };
    if (!categoriesMap[config.label]) {
      categoriesMap[config.label] = { label: config.label, count: 0, color: config.color };
    }
    categoriesMap[config.label].count += parseInt(String(item.count), 10);
  });

  const categories = Object.values(categoriesMap);
  const total = totalCases || categories.reduce((sum, c) => sum + c.count, 0) || 0;

  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let strokeOffset = 0;
  const slices: StatusCategory[] = categories.map(cat => {
    const percentVal = total > 0 ? (cat.count / total) * 100 : 0;
    const fullStrokeDash = total > 0 ? (cat.count / total) * circumference : 0;
    const currentStrokeDash = fullStrokeDash * animProgress;
    const slice: StatusCategory = {
      ...cat,
      percent: percentVal.toFixed(1) + '%',
      strokeDasharray: `${currentStrokeDash} ${circumference}`,
      strokeDashoffset: -strokeOffset,
    };
    strokeOffset += currentStrokeDash;
    return slice;
  });

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
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Case Status Overview</h3>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
        {/* SVG Donut Chart */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
            {slices.map((slice, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.05s linear' }}
              />
            ))}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {loading ? '--' : <AnimatedCounter value={total} duration={1200} />}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700', marginTop: '3px' }}>Total Cases</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, paddingLeft: '20px' }}>
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Loading breakdown...</div>
          ) : categories.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No case breakdown available</div>
          ) : (
            categories.map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  <span style={{ color: '#475569', fontWeight: '600' }}>{cat.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ color: '#0f172a' }}><AnimatedCounter value={cat.count} duration={1000} /></strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.725rem' }}>({slices.find(s => s.label === cat.label)?.percent})</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
