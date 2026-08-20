import React, { useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ConfidenceBar } from './ConfidenceBar';
import { FilterBar } from './FilterBar';

/**
 * Large White Table Component: Recent Reconciliation Cases
 * Displays incoming bank payment cases, sender details, confidence progress bars, status badges, and Review actions.
 * 
 * Called by:
 * - Dashboard.jsx
 * 
 * @param {Array} cases - Array of reconciliation case objects.
 * @param {boolean} loading - True if API request is in progress.
 * @param {Function} onSelectCase - Callback function when user clicks 'Review' on a case.
 * @param {Function} onRefresh - Callback to re-fetch cases.
 */
export const RecentCasesTable = ({ cases = [], loading = false, onSelectCase, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const filteredCases = cases.filter(item => {
    if (statusFilter && (item.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (priorityFilter && (item.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
    }}>
      
      {/* Table Header Row & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            Recent Reconciliation Cases
          </h3>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366f1', background: '#e0e7ff', padding: '2px 8px', borderRadius: '10px' }}>
            {filteredCases.length} Cases
          </span>
        </div>

        <FilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          onApplyFilter={onRefresh}
        />
      </div>

      {/* Main Table Structure */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '14px 18px', fontWeight: '700' }}>Case & TXN ID</th>
              <th style={{ padding: '14px 18px', fontWeight: '700' }}>Sender & Narration</th>
              <th style={{ padding: '14px 18px', fontWeight: '700' }}>Deposit Amount</th>
              <th style={{ padding: '14px 18px', fontWeight: '700' }}>AI Confidence</th>
              <th style={{ padding: '14px 18px', fontWeight: '700' }}>Case Status</th>
              <th style={{ padding: '14px 18px', fontWeight: '700' }}>Priority</th>
              <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading reconciliation cases from server...
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No reconciliation cases match the selected filters.
                </td>
              </tr>
            ) : (
              filteredCases.map(item => {
                const rec = item.latest_recommendation;
                const score = rec ? parseFloat(rec.confidence_score) : null;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectCase && onSelectCase(item)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* CASE & TXN ID */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>Case #{item.id}</div>
                      <div style={{ fontSize: '0.725rem', color: '#2563eb', fontFamily: 'monospace' }}>
                        TXN ID: {item.transaction_id}
                      </div>
                    </td>

                    {/* SENDER & NARRATION */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ color: '#0f172a', fontWeight: '600' }}>{item.sender_name || 'Unknown Sender'}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{item.reference || 'No narration string'}</div>
                    </td>

                    {/* DEPOSIT AMOUNT */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>
                        ₹{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.payment_date}</div>
                    </td>

                    {/* AI CONFIDENCE */}
                    <td style={{ padding: '14px 18px' }}>
                      <ConfidenceBar confidence={score} />
                    </td>

                    {/* CASE STATUS */}
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={item.status} />
                    </td>

                    {/* PRIORITY */}
                    <td style={{ padding: '14px 18px' }}>
                      <PriorityBadge priority={item.priority || 'medium'} />
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectCase && onSelectCase(item); }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#4f46e5',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Eye size={14} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
