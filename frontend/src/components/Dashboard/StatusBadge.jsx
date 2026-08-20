import React from 'react';

/**
 * Reusable Status Badge Component
 * 
 * Called by:
 * - RecentCasesTable.jsx
 * - ActionCenterDrawer.jsx
 * 
 * @param {string} status - Case status string ('resolved', 'pending_review', 'ai_processing', 'rejected', 'pending_info', 'under_review').
 */
export const StatusBadge = ({ status = 'pending_review' }) => {
  const normStatus = (status || '').toLowerCase();

  let label = status.toUpperCase();
  let styleClass = 'badge-pending';
  let inlineStyle = {
    background: '#fef3c7',
    color: '#d97706',
    border: '1px solid #fcd34d'
  };

  if (normStatus === 'resolved' || normStatus === 'approved' || normStatus === 'completed') {
    label = 'RESOLVED';
    inlineStyle = {
      background: '#d1fae5',
      color: '#059669',
      border: '1px solid #a7f3d0'
    };
  } else if (normStatus === 'pending_review') {
    label = 'PENDING_REVIEW';
    inlineStyle = {
      background: '#fef3c7',
      color: '#d97706',
      border: '1px solid #fcd34d'
    };
  } else if (normStatus === 'ai_processing') {
    label = 'AI_PROCESSING';
    inlineStyle = {
      background: '#dbeafe',
      color: '#2563eb',
      border: '1px solid #bfdbfe'
    };
  } else if (normStatus === 'rejected') {
    label = 'REJECTED';
    inlineStyle = {
      background: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fca5a5'
    };
  } else if (normStatus === 'pending_info') {
    label = 'PENDING_INFO';
    inlineStyle = {
      background: '#f3e8ff',
      color: '#7c3aed',
      border: '1px solid #e9d5ff'
    };
  } else if (normStatus === 'under_review') {
    label = 'UNDER_REVIEW';
    inlineStyle = {
      background: '#ffedd5',
      color: '#c2410c',
      border: '1px solid #fed7aa'
    };
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
      ...inlineStyle
    }}>
      {label}
    </span>
  );
};
