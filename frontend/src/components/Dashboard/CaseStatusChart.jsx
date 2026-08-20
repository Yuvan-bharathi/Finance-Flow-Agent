import React from 'react';

/**
 * Case Status Overview Donut Chart Component
 * Dynamically renders SVG Donut Chart from live MySQL status distribution stats.
 * 
 * Called by:
 * - Dashboard.jsx
 * 
 * @param {Array} statusBreakdown - Array of status breakdown objects `[{ status: 'resolved', count: 6 }, ...]`.
 * @param {number} totalCases - Total count of cases from backend.
 * @param {boolean} loading - Loading state.
 */
export const CaseStatusChart = ({ statusBreakdown = [], totalCases = 0, loading = false }) => {
  // Map raw status strings to human labels and color tokens
  const statusConfig = {
    resolved: { label: 'Resolved', color: '#10b981' },
    approved: { label: 'Resolved', color: '#10b981' },
    pending_review: { label: 'Pending Review', color: '#3b82f6' },
    under_review: { label: 'Under Review', color: '#f59e0b' },
    ai_processing: { label: 'AI Processing', color: '#8b5cf6' },
    pending_info: { label: 'Pending Info', color: '#ec4899' },
    rejected: { label: 'Rejected', color: '#ef4444' },
    open: { label: 'Open', color: '#06b6d4' }
  };

  // Group and format categories dynamically from database rows
  const categoriesMap = {};
  statusBreakdown.forEach(item => {
    const rawKey = (item.status || 'open').toLowerCase();
    const config = statusConfig[rawKey] || { label: rawKey.toUpperCase(), color: '#64748b' };
    
    if (!categoriesMap[config.label]) {
      categoriesMap[config.label] = { label: config.label, count: 0, color: config.color };
    }
    categoriesMap[config.label].count += parseInt(item.count, 10);
  });

  const categories = Object.values(categoriesMap);
  const total = totalCases || categories.reduce((sum, c) => sum + c.count, 0) || 0;

  // SVG Donut Circle parameters
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute SVG stroke-dasharray offsets dynamically
  let strokeOffset = 0;
  const slices = categories.map(cat => {
    const percentVal = total > 0 ? (cat.count / total) * 100 : 0;
    const strokeDash = total > 0 ? (cat.count / total) * circumference : 0;
    const slice = {
      ...cat,
      percent: percentVal.toFixed(1) + '%',
      strokeDasharray: `${strokeDash} ${circumference}`,
      strokeDashoffset: -strokeOffset
    };
    strokeOffset += strokeDash;
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
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      height: '320px'
    }}>
      
      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
        Case Status Overview
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
        
        {/* SVG Donut Chart with Dynamic Center Label */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Base Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />

            {/* Dynamic Donut Slices */}
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
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            ))}
          </svg>

          {/* Donut Center Count */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {loading ? '--' : total}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
              Total Cases
            </div>
          </div>
        </div>

        {/* Dynamic Status Breakdown Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, paddingLeft: '20px' }}>
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Loading breakdown...</div>
          ) : categories.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No case breakdown available</div>
          ) : (
            categories.map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                  <span style={{ color: '#475569', fontWeight: '600' }}>{cat.label}</span>
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>{cat.count}</strong>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '4px' }}>
                    ({total > 0 ? ((cat.count / total) * 100).toFixed(1) : '0.0'}%)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
