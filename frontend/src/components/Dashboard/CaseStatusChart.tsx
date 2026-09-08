import { useState, useEffect, useRef } from 'react';
import { AnimatedCounter } from '../common/AnimatedCounter';
import type { StatusBreakdown } from '../../types/reconciliation';

interface StatusCategory {
  id: string;
  label: string;
  count: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  percent: string;
  fullLen: number;
  visibleLen: number;
  offset: number;
}

interface CaseStatusChartProps {
  statusBreakdown?: StatusBreakdown[];
  totalCases?: number;
  loading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; gradientStart: string; gradientEnd: string }> = {
  new:            { label: 'New',            color: '#64748b', gradientStart: '#94a3b8', gradientEnd: '#475569' },
  open:           { label: 'Open',           color: '#06b6d4', gradientStart: '#22d3ee', gradientEnd: '#0891b2' },
  pending_review: { label: 'Pending Review', color: '#3b82f6', gradientStart: '#60a5fa', gradientEnd: '#2563eb' },
  resolved:       { label: 'Resolved',       color: '#10b981', gradientStart: '#34d399', gradientEnd: '#059669' },
  approved:       { label: 'Resolved',       color: '#10b981', gradientStart: '#34d399', gradientEnd: '#059669' },
  under_review:   { label: 'Under Review',   color: '#f59e0b', gradientStart: '#fbbf24', gradientEnd: '#d97706' },
  ai_processing:  { label: 'AI Processing',  color: '#8b5cf6', gradientStart: '#a78bfa', gradientEnd: '#7c3aed' },
  pending_info:   { label: 'Pending Info',   color: '#ec4899', gradientStart: '#f472b6', gradientEnd: '#db2777' },
  rejected:       { label: 'Rejected',       color: '#ef4444', gradientStart: '#f87171', gradientEnd: '#dc2626' },
};

const categoryOrder = ['New', 'Open', 'Pending Review', 'Under Review', 'Resolved', 'Rejected'];

/**
 * Enhanced Case Status Overview Donut Chart Component
 * Features enlarged SVG donut chart, two-line stacked label for "Pending Review",
 * continuous clockwise sweep animation, gradient arcs, and interactive slice highlighting.
 */
export const CaseStatusChart = ({ statusBreakdown = [], totalCases = 0, loading: _loading = false }: CaseStatusChartProps) => {
  const [animProgress, setAnimProgress] = useState(0);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setAnimProgress(0);
    let startTimestamp: number | null = null;
    const duration = 1100;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Quintic ease out
      const easeOut = 1 - Math.pow(1 - progress, 4);
      setAnimProgress(easeOut);

      if (progress < 1) {
        animFrameRef.current = window.requestAnimationFrame(step);
      } else {
        setAnimProgress(1);
      }
    };

    animFrameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) window.cancelAnimationFrame(animFrameRef.current);
    };
  }, [statusBreakdown]);

  const categoriesMap: Record<string, { id: string; label: string; count: number; color: string; gradientStart: string; gradientEnd: string }> = {};
  statusBreakdown.forEach(item => {
    const rawKey = (item.status || 'open').toLowerCase();
    const config = statusConfig[rawKey] ?? {
      label: rawKey.charAt(0).toUpperCase() + rawKey.slice(1).replace('_', ' '),
      color: '#64748b',
      gradientStart: '#94a3b8',
      gradientEnd: '#475569',
    };
    if (!categoriesMap[config.label]) {
      categoriesMap[config.label] = {
        id: rawKey,
        label: config.label,
        count: 0,
        color: config.color,
        gradientStart: config.gradientStart,
        gradientEnd: config.gradientEnd,
      };
    }
    categoriesMap[config.label].count += parseInt(String(item.count), 10);
  });

  const categories = Object.values(categoriesMap).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a.label);
    const idxB = categoryOrder.indexOf(b.label);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const total = totalCases || categories.reduce((sum, c) => sum + c.count, 0) || 0;

  // Enlarged chart dimensions for prominent visual impact
  const size = 176;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Continuous Clockwise Sweep Math:
  const sweepLength = animProgress * circumference;
  let cumulativeOffset = 0;

  const slices: StatusCategory[] = categories.map(cat => {
    const percentVal = total > 0 ? (cat.count / total) * 100 : 0;
    const fullLen = total > 0 ? (cat.count / total) * circumference : 0;
    const gap = categories.length > 1 && fullLen > 8 ? 3.5 : 0;

    const start = cumulativeOffset;
    const end = start + fullLen;

    let currentVisibleLen = 0;
    if (sweepLength >= end) {
      currentVisibleLen = Math.max(0, fullLen - gap);
    } else if (sweepLength > start) {
      currentVisibleLen = Math.max(0, (sweepLength - start) - gap);
    } else {
      currentVisibleLen = 0;
    }

    cumulativeOffset += fullLen;

    return {
      ...cat,
      percent: percentVal.toFixed(1) + '%',
      fullLen,
      visibleLen: currentVisibleLen,
      offset: -start,
    };
  });

  const activeCategory = hoveredLabel ? slices.find(s => s.label === hoveredLabel) : null;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
      height: '340px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* Header with Active Category pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          Case Status Overview
        </h3>
        {activeCategory ? (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            color: activeCategory.color,
            background: `${activeCategory.color}15`,
            border: `1px solid ${activeCategory.color}35`,
            borderRadius: '20px',
            padding: '2px 8px',
            animation: 'fadeIn 0.15s ease',
            whiteSpace: 'nowrap',
          }}>
            {activeCategory.percent} of Total
          </span>
        ) : (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '600',
            color: '#64748b',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '2px 8px',
          }}>
            {categories.length} Categories
          </span>
        )}
      </div>

      {/* Main Chart + Legend Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flex: 1 }}>
        {/* Enlarged SVG Donut Chart */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{
              transform: 'rotate(-90deg)',
              overflow: 'visible',
            }}
          >
            {/* Gradients */}
            <defs>
              {slices.map((slice, i) => (
                <linearGradient key={`grad-${i}`} id={`pie-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={slice.gradientStart} />
                  <stop offset="100%" stopColor={slice.gradientEnd} />
                </linearGradient>
              ))}
              <filter id="sliceGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Render Each Status Slice */}
            {slices.map((slice, i) => {
              const isHovered = hoveredLabel === slice.label;
              const hasHover = hoveredLabel !== null;
              const currentWidth = isHovered ? strokeWidth + 4 : (hasHover ? strokeWidth - 2 : strokeWidth);
              const opacity = hasHover && !isHovered ? 0.35 : 1;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={`url(#pie-grad-${i})`}
                  strokeWidth={currentWidth}
                  strokeDasharray={`${slice.visibleLen} ${circumference}`}
                  strokeDashoffset={slice.offset}
                  filter={isHovered ? 'url(#sliceGlow)' : undefined}
                  style={{
                    cursor: 'pointer',
                    opacity,
                    transition: 'stroke-width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, filter 0.2s ease',
                  }}
                  onMouseEnter={() => setHoveredLabel(slice.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                />
              );
            })}
          </svg>

          {/* Dynamic Center Metric Display */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            {activeCategory ? (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.15s ease' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', color: activeCategory.color, lineHeight: 1 }}>
                  {activeCategory.count}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '700', marginTop: '3px', whiteSpace: 'nowrap' }}>
                  {activeCategory.label}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>
                  {_loading ? '--' : <AnimatedCounter value={total} duration={1100} />}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginTop: '3px', whiteSpace: 'nowrap' }}>
                  Total Cases
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend with Two-Line "Pending Review" */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          flex: 1,
          minWidth: 0,
        }}>
          {_loading ? (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Loading breakdown...</div>
          ) : categories.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>No case breakdown available</div>
          ) : (
            categories.map((cat, idx) => {
              const isHovered = hoveredLabel === cat.label;
              const slice = slices.find(s => s.label === cat.label);
              const isPendingReview = cat.label.toLowerCase() === 'pending review';

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredLabel(cat.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isPendingReview ? '3px 6px' : '4px 6px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isHovered ? `${cat.color}10` : 'transparent',
                    border: isHovered ? `1px solid ${cat.color}25` : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    gap: '6px',
                  }}
                >
                  {/* Status Dot & Label (two-line break for Pending Review) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: cat.color,
                        flexShrink: 0,
                        boxShadow: isHovered ? `0 0 6px ${cat.color}` : 'none',
                        transition: 'box-shadow 0.2s ease',
                      }}
                    />
                    <div style={{
                      color: isHovered ? '#0f172a' : '#334155',
                      fontWeight: isHovered ? '700' : '600',
                      fontSize: '0.76rem',
                      lineHeight: '1.15',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {isPendingReview ? (
                        <>
                          <span>Pending</span>
                          <span>Review</span>
                        </>
                      ) : (
                        <span style={{ whiteSpace: 'nowrap' }}>{cat.label}</span>
                      )}
                    </div>
                  </div>

                  {/* Count Pill & Percentage */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{
                      fontWeight: '800',
                      fontSize: '0.76rem',
                      color: isHovered ? cat.color : '#0f172a',
                      background: isHovered ? '#ffffff' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '1px 5px',
                      borderRadius: '5px',
                      minWidth: '20px',
                      textAlign: 'center',
                    }}>
                      {cat.count}
                    </span>
                    <span style={{
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      minWidth: '42px',
                      textAlign: 'right',
                    }}>
                      ({slice?.percent})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseStatusChart;
