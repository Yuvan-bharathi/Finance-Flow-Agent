import React from 'react';

/**
 * Reusable Priority Badge Component
 * 
 * Called by:
 * - RecentCasesTable.jsx
 * 
 * @param {string} priority - Priority string ('high', 'critical', 'medium', 'low').
 */
export const PriorityBadge = ({ priority = 'medium' }) => {
  const norm = (priority || '').toLowerCase();
  let label = priority.toUpperCase();
  let colorStyle = { color: '#6b7280', fontWeight: '700', fontSize: '0.75rem' };

  if (norm === 'high' || norm === 'critical') {
    colorStyle = { color: '#ef4444', fontWeight: '800', fontSize: '0.75rem' };
  } else if (norm === 'medium') {
    colorStyle = { color: '#f59e0b', fontWeight: '700', fontSize: '0.75rem' };
  } else if (norm === 'low') {
    colorStyle = { color: '#3b82f6', fontWeight: '700', fontSize: '0.75rem' };
  }

  return (
    <span style={colorStyle}>
      {label}
    </span>
  );
};
