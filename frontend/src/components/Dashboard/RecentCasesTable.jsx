import React, { useState } from 'react';
import { Eye, Zap, RefreshCw, CheckSquare, Square, AlertCircle, Play } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ConfidenceBar } from './ConfidenceBar';
import { FilterBar } from './FilterBar';
import { analyzeBulk, analyzeAllPending } from '../../services/agentService';
import { analyzeCase } from '../../services/reconciliationService';

/**
 * Large White Table Component: Recent Reconciliation Cases
 * Supports multi-select, bulk analysis triggers, NEW case indicators, and confirmation dialogs.
 */
export const RecentCasesTable = ({ cases = [], loading = false, onSelectCase, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  const filteredCases = cases.filter(item => {
    if (statusFilter && (item.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (priorityFilter && (item.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) return false;
    return true;
  });

  const newCasesCount = cases.filter(c => (c.status || '').toLowerCase() === 'new').length;

  const toggleSelectCase = (id, e) => {
    e.stopPropagation();
    setSelectedCaseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCaseIds.length === filteredCases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(filteredCases.map(c => c.id));
    }
  };

  const handleSingleAnalyze = async (caseId, e) => {
    e.stopPropagation();
    try {
      setAnalyzing(true);
      setActionErrorMsg('');
      setActionSuccessMsg('');
      await analyzeCase(caseId);
      setActionSuccessMsg(`AI Payment Reconciliation completed for Case #${caseId}!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionErrorMsg(err.response?.data?.message || 'AI Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedCaseIds.length === 0) return;
    if (selectedCaseIds.length > 20) {
      setActionErrorMsg('Cannot analyze more than 20 selected cases in a single batch.');
      return;
    }

    try {
      setAnalyzing(true);
      setActionErrorMsg('');
      setActionSuccessMsg('');
      const res = await analyzeBulk(selectedCaseIds);
      setActionSuccessMsg(`Batch analysis complete! Processed ${res.processed_count} case(s). Successful: ${res.successful_count}, Failed: ${res.failed_count}.`);
      setSelectedCaseIds([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionErrorMsg(err.response?.data?.message || 'Bulk AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmAnalyzeAllPending = async () => {
    setShowConfirmModal(false);
    try {
      setAnalyzing(true);
      setActionErrorMsg('');
      setActionSuccessMsg('');
      const res = await analyzeAllPending();
      setActionSuccessMsg(`All pending NEW cases processed! Processed ${res.processed_count} case(s). Successful: ${res.successful_count}, Failed: ${res.failed_count}.`);
      setSelectedCaseIds([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionErrorMsg(err.response?.data?.message || 'Analyze All NEW cases failed.');
    } finally {
      setAnalyzing(false);
    }
  };

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
      
      {/* Messages */}
      {actionSuccessMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 16px', borderRadius: '10px', fontSize: '0.825rem', fontWeight: '600' }}>
          ✅ {actionSuccessMsg}
        </div>
      )}

      {actionErrorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 16px', borderRadius: '10px', fontSize: '0.825rem', fontWeight: '600' }}>
          ⚠️ {actionErrorMsg}
        </div>
      )}

      {/* Table Header Row & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            Recent Reconciliation Cases
          </h3>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366f1', background: '#e0e7ff', padding: '2px 8px', borderRadius: '10px' }}>
            {filteredCases.length} Cases
          </span>
          {newCasesCount > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '10px' }}>
              {newCasesCount} NEW Waiting Analysis
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Bulk Action Buttons */}
          {selectedCaseIds.length > 0 && (
            <button
              onClick={handleAnalyzeSelected}
              disabled={analyzing}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            >
              <Zap size={14} className={analyzing ? 'animate-spin' : ''} />
              <span>Analyze Selected ({selectedCaseIds.length})</span>
            </button>
          )}

          {newCasesCount > 0 && (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={analyzing}
              style={{
                background: '#f8fafc',
                border: '1px solid #c7d2fe',
                color: '#4338ca',
                fontWeight: '700',
                fontSize: '0.8rem',
                padding: '8px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} />
              <span>Analyze All NEW ({newCasesCount})</span>
            </button>
          )}

          <FilterBar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            onApplyFilter={onRefresh}
          />
        </div>
      </div>

      {/* Main Table Structure */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '14px 12px', width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={filteredCases.length > 0 && selectedCaseIds.length === filteredCases.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
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
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading reconciliation cases from server...
                </td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No reconciliation cases match the selected filters.
                </td>
              </tr>
            ) : (
              filteredCases.map(item => {
                const rec = item.latest_recommendation;
                const score = rec ? parseFloat(rec.confidence_score) : null;
                const isSelected = selectedCaseIds.includes(item.id);
                const normStatus = (item.status || '').toLowerCase();

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectCase && onSelectCase(item)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f9ff' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Checkbox Column */}
                    <td style={{ padding: '14px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectCase(item.id, e)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

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
                      {normStatus === 'new' ? (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                          Not analyzed yet
                        </span>
                      ) : (
                        <ConfidenceBar confidence={score} />
                      )}
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
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {normStatus === 'new' && (
                          <button
                            onClick={(e) => handleSingleAnalyze(item.id, e)}
                            disabled={analyzing}
                            className="btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          >
                            <Zap size={12} />
                            <span>Analyze</span>
                          </button>
                        )}

                        {normStatus === 'ai_failed' && (
                          <button
                            onClick={(e) => handleSingleAnalyze(item.id, e)}
                            disabled={analyzing}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#dc2626',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RefreshCw size={12} />
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectCase && onSelectCase(item); }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#4f46e5',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} />
                          <span>Review</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for "Analyze All NEW" */}
      {showConfirmModal && (
        <div
          onClick={() => setShowConfirmModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              width: '440px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                Confirm Bulk AI Analysis
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
              You are about to analyze <strong>{newCasesCount} cases</strong> using AI.
              <br />
              This will execute zero-token pre-checks and consume AI requests for ambiguous cases (max 5 concurrent).
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAnalyzeAllPending}
                className="btn-primary"
                style={{ padding: '8px 20px' }}
              >
                Start Analysis
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
