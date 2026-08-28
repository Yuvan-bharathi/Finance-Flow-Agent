import type { CSSProperties } from 'react';

interface PriorityBadgeProps {
  priority?: string;
}

/**
 * Reusable Priority Badge Component
 *
 * Called by:
 * - RecentCasesTable.tsx
 */
export const PriorityBadge = ({ priority = 'medium' }: PriorityBadgeProps) => {
  const norm = (priority || '').toLowerCase();
  const label = priority.toUpperCase();
  let colorStyle: CSSProperties = { color: '#6b7280', fontWeight: '700', fontSize: '0.75rem' };

  if (norm === 'high' || norm === 'critical') {
    colorStyle = { color: '#ef4444', fontWeight: '800', fontSize: '0.75rem' };
  } else if (norm === 'medium') {
    colorStyle = { color: '#f59e0b', fontWeight: '700', fontSize: '0.75rem' };
  } else if (norm === 'low') {
    colorStyle = { color: '#3b82f6', fontWeight: '700', fontSize: '0.75rem' };
  }

  return <span style={colorStyle}>{label}</span>;
};
