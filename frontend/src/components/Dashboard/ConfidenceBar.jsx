import React from 'react';

/**
 * Reusable AI Confidence Score Bar Component
 * Displays percentage text with a dynamic progress bar underneath matching rules:
 * - Green (90-100%)
 * - Blue (70-89%)
 * - Orange (50-69%)
 * - Red (<50%)
 * - '--' for Not Analyzed
 * 
 * Called by:
 * - RecentCasesTable.jsx
 * 
 * @param {number|null} confidence - Score value (0.0 to 100.0) or null.
 */
export const ConfidenceBar = ({ confidence = null }) => {
  if (confidence === null || confidence === undefined || isNaN(confidence)) {
    return <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>--</span>;
  }

  const score = parseFloat(confidence);
  let barColor = '#10b981'; // Green (>= 90%)
  if (score < 50) barColor = '#ef4444'; // Red
  else if (score < 70) barColor = '#f59e0b'; // Orange
  else if (score < 90) barColor = '#3b82f6'; // Blue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>
        {score.toFixed(1)}%
      </div>
      
      {/* Progress Track */}
      <div style={{
        height: '5px',
        width: '100%',
        background: '#e2e8f0',
        borderRadius: '999px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, score))}%`,
          background: barColor,
          borderRadius: '999px',
          transition: 'width 0.4s ease'
        }} />
      </div>
    </div>
  );
};
