import React from 'react';

/**
 * AI Performance Semicircle Gauge Chart Component
 * Displays 92.4% Avg. Confidence Score gauge, Processed, Matched, Escalated counts, and trend indicators.
 * Communicates that AI assists reconciliation while humans retain final approval control.
 * 
 * Called by:
 * - Dashboard.jsx
 */
export const AIPerformanceCard = ({ aiPerformance = {} }) => {
  const avgConfidence = aiPerformance.avg_confidence || 92.4;
  const processed = aiPerformance.processed || 56;
  const matched = aiPerformance.matched || 48;
  const escalated = aiPerformance.escalated || 8;

  // SVG Gauge Arc Calculation
  const size = 180;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const arcLength = Math.PI * radius; // Half circumference for 180deg gauge
  const fillDash = (avgConfidence / 100) * arcLength;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      height: '320px'
    }}>
      
      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
        AI Performance
      </h3>

      {/* Semicircle Gauge Chart */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size / 2 + 10}px`, margin: '0 auto' }}>
        <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0,1 ${size - strokeWidth / 2},${size / 2}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled Gauge Arc */}
          <path
            d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0,1 ${size - strokeWidth / 2},${size / 2}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${fillDash} ${arcLength}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>

        {/* Center Gauge Value */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
            {avgConfidence}%
          </div>
          <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
            Avg. Confidence Score
          </div>
        </div>
      </div>

      {/* Processed / Matched / Escalated Footer Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #f1f5f9',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Processed</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{processed}</div>
          <div style={{ fontSize: '0.675rem', fontWeight: '700', color: '#059669', marginTop: '2px' }}>↑ 16.7%</div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Matched</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{matched}</div>
          <div style={{ fontSize: '0.675rem', fontWeight: '700', color: '#059669', marginTop: '2px' }}>↑ 14.3%</div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Escalated</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{escalated}</div>
          <div style={{ fontSize: '0.675rem', fontWeight: '700', color: '#dc2626', marginTop: '2px' }}>↓ 11.1%</div>
        </div>
      </div>

    </div>
  );
};
