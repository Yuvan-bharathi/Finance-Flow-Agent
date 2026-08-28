import type { CSSProperties } from 'react';

interface StatusBadgeProps {
  status?: string;
}

/**
 * Reusable Status Badge Component
 * Handles state machine statuses: new, ai_queued, ai_processing, pending_review, resolved, rejected, ai_failed
 */
export const StatusBadge = ({ status = 'new' }: StatusBadgeProps) => {
  const normStatus = (status || '').toLowerCase();

  let label = (status || '').toUpperCase();
  let inlineStyle: CSSProperties = {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
  };

  if (normStatus === 'new') {
    label = 'NEW';
    inlineStyle = { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  } else if (normStatus === 'ai_queued') {
    label = 'AI QUEUED';
    inlineStyle = { background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' };
  } else if (normStatus === 'ai_processing') {
    label = 'AI PROCESSING…';
    inlineStyle = { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' };
  } else if (normStatus === 'pending_review') {
    label = 'PENDING REVIEW';
    inlineStyle = { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  } else if (['resolved', 'approved', 'completed'].includes(normStatus)) {
    label = 'RESOLVED';
    inlineStyle = { background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' };
  } else if (normStatus === 'rejected') {
    label = 'REJECTED';
    inlineStyle = { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
  } else if (normStatus === 'ai_failed') {
    label = 'AI FAILED';
    inlineStyle = { background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' };
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '0.725rem',
      fontWeight: '700',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      ...inlineStyle,
    }}>
      {label}
    </span>
  );
};
