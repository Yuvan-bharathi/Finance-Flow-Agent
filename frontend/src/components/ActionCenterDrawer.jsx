import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Bot
} from 'lucide-react';
import { analyzeCase, approveRecommendation, rejectRecommendation, overrideRecommendation } from '../services/reconciliationService';
import { StatusBadge } from './Dashboard/StatusBadge';

/**
 * Slide-over Action Center AI Review Drawer
 * Displays deposit bank evidence, Groq AI candidate recommendation, dynamic confidence ring, reasoning breakdown,
 * and 1-click settlement approval controls matching bright enterprise SaaS theme.
 * 
 * Called by:
 * - Dashboard.jsx
 * - PaymentIngestion.jsx
 * 
 * @param {Object} caseItem - Selected reconciliation case object.
 * @param {Function} onClose - Drawer close callback.
 * @param {Function} onRefresh - Callback to refresh parent dashboard data.
 * @param {Function} onAskAI - Callback to launch AI Assistant with case context.
 */
export const ActionCenterDrawer = ({ caseItem, onClose, onRefresh, onAskAI }) => {
  const [activeCase, setActiveCase] = useState(caseItem);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  
  // Override form state
  const [overrideScheduleId, setOverrideScheduleId] = useState('');
  const [overrideAmount, setOverrideAmount] = useState(caseItem?.amount || '');
  const [overrideReasonText, setOverrideReasonText] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setActiveCase(caseItem);
  }, [caseItem]);

  // Handle Escape key press to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!caseItem) return null;

  const currentCase = activeCase || caseItem;
  const normStatus = (currentCase.status || '').toLowerCase();
  const rec = currentCase.latest_recommendation || (currentCase.recommendations && currentCase.recommendations[0]);
  const confidenceScore = rec ? parseFloat(rec.confidence_score) : null;

  // Trigger Groq AI Analysis for unanalyzed case
  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setErrorMsg('');
      const res = await analyzeCase(currentCase.id);
      setSuccessMsg('AI Payment Reconciliation Analysis completed successfully!');

      if (res) {
        const updated = {
          ...(res.case || currentCase),
          status: 'pending_review',
          latest_recommendation: res.recommendation || (res.case && res.case.latest_recommendation) || currentCase.latest_recommendation
        };
        setActiveCase(updated);
      }

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'AI Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  // 1-Click Approve AI Match
  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      await approveRecommendation(rec?.id, 'Approved by accountant via Action Center UI', currentCase?.id);
      setSuccessMsg('Payment successfully allocated to ledger! Installment marked PAID.');
      setTimeout(() => {
        if (onRefresh) onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Approval failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reject AI Match
  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    try {
      setSubmitting(true);
      setErrorMsg('');
      await rejectRecommendation(rec?.id, rejectReason, currentCase?.id);
      setSuccessMsg('Recommendation rejected. Case flagged for manual review.');
      setTimeout(() => {
        if (onRefresh) onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Accountant Manual Override
  const handleOverride = async (e) => {
    e.preventDefault();
    if (!overrideScheduleId || !overrideAmount || !overrideReasonText.trim()) {
      setErrorMsg('Target Schedule ID, Amount, and Override Rationale are required.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      await overrideRecommendation({
        caseId: caseItem.id,
        repayment_schedule_id: parseInt(overrideScheduleId, 10),
        allocated_amount: parseFloat(overrideAmount),
        override_reason: overrideReasonText
      });
      setSuccessMsg('Manual override completed! Ledger updated.');
      setTimeout(() => {
        if (onRefresh) onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Manual override failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer'
      }}
    >
      
      {/* Drawer Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '100vw',
          background: '#ffffff',
          height: '100%',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: 'default'
        }}
        className="animate-fade-in"
      >
        
        {/* Drawer Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Case #{caseItem.id} Details
              </h2>
              <StatusBadge status={caseItem.status} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace', marginTop: '4px' }}>
              TXN ID: {caseItem.transaction_id}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                if (onAskAI) onAskAI('reconciliation_case', caseItem.id);
              }}
              title="Ask AI Copilot to investigate and explain this case"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(124,58,237,0.25)'
              }}
            >
              <Bot size={14} />
              <span>Ask AI to Explain</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Success Banner */}
          {successMsg && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#059669', padding: '14px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '14px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Deposit Evidence Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Incoming Bank Deposit Evidence
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Deposit Amount</span>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
                  ₹{parseFloat(caseItem.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Payment Date</span>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                  {caseItem.payment_date}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.825rem' }}>
              <div>
                <strong style={{ color: '#475569' }}>Sender Name:</strong>{' '}
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{caseItem.sender_name || 'N/A'}</span>
              </div>
              <div>
                <strong style={{ color: '#475569' }}>Sender Account:</strong>{' '}
                <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#1e293b' }}>{caseItem.sender_account || 'N/A'}</code>
              </div>
              <div>
                <strong style={{ color: '#475569' }}>Bank Narration:</strong>{' '}
                <span style={{ color: '#6366f1', fontWeight: '600' }}>{caseItem.reference || 'None'}</span>
              </div>
            </div>
          </div>

          {/* 2. AI Candidate Match Recommendation Section */}
          {rec ? (
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%)',
              border: '1.5px solid #c084fc',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.08)'
            }}>
              
              {/* Recommendation Header & Confidence Score Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#7c3aed" />
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#4c1d95' }}>
                    Groq AI Candidate Match
                  </h3>
                </div>

                {/* Confidence Pill */}
                <div style={{
                  background: confidenceScore >= 90 ? '#d1fae5' : confidenceScore >= 70 ? '#dbeafe' : '#fef3c7',
                  border: `1px solid ${confidenceScore >= 90 ? '#a7f3d0' : confidenceScore >= 70 ? '#bfdbfe' : '#fcd34d'}`,
                  color: confidenceScore >= 90 ? '#059669' : confidenceScore >= 70 ? '#2563eb' : '#d97706',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: '800'
                }}>
                  {confidenceScore}% Confidence
                </div>
              </div>

              {/* Match Candidate Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                <div>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Matched Company ID:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>Company #{rec.recommended_company_id || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Matched Loan Facility ID:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>Loan #{rec.recommended_loan_id || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Target Installment Schedule ID:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>Schedule #{rec.recommended_schedule_id || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b21a8', fontWeight: '700' }}>Proposed Allocation Amount:</span>{' '}
                  <strong style={{ color: '#059669', fontSize: '0.95rem' }}>₹{parseFloat(rec.recommended_amount || caseItem.amount).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* AI Reasoning Summary */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  AI Evidence Reasoning Breakdown
                </div>
                <div style={{ fontSize: '0.825rem', color: '#334155', background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e9d5ff', lineHeight: 1.5 }}>
                  {rec.reasoning || 'AI agent matched bank deposit narration reference string directly with active loan schedule contract.'}
                </div>
              </div>

            </div>
          ) : (
            /* Unanalyzed / Processing / Failed Case States */
            <div style={{
              background: normStatus === 'ai_failed' ? '#fff5f5' : '#f8fafc',
              border: normStatus === 'ai_failed' ? '1.5px solid #fca5a5' : '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              {normStatus === 'ai_processing' || normStatus === 'ai_queued' ? (
                <>
                  <RefreshCw size={32} color="#2563eb" className="animate-spin" />
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e40af' }}>
                    AI Agent Execution in Progress…
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#3b82f6', maxWidth: '360px' }}>
                    Agent 1 is running deterministic pre-checks and investigating database records. Run lock active to prevent duplicate execution.
                  </p>
                </>
              ) : normStatus === 'ai_failed' ? (
                <>
                  <AlertTriangle size={32} color="#dc2626" />
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#991b1b' }}>
                    AI Analysis Encountered an Issue
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#b91c1c', maxWidth: '360px' }}>
                    The agent execution did not complete successfully. You can retry the AI analysis or manually override.
                  </p>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={analyzing}
                    className="btn-primary"
                    style={{ marginTop: '8px', width: '100%', justifyContent: 'center', background: '#dc2626' }}
                  >
                    <RefreshCw size={16} className={analyzing ? 'animate-spin' : ''} />
                    <span>{analyzing ? 'Retrying Agent…' : 'Retry AI Analysis'}</span>
                  </button>
                </>
              ) : (
                <>
                  <Sparkles size={32} color="#6366f1" />
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                    Payment Received — Awaiting AI Analysis
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '360px' }}>
                    Payment is registered in status <strong>NEW</strong>. Trigger Agent 1 to execute zero-token pre-checks and Groq LLM tool calling.
                  </p>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={analyzing}
                    className="btn-primary"
                    style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Running Agent 1 Analysis…</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Trigger Groq AI Payment Analysis</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 3. Action Settlement Controls */}
          {rec && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                Human-in-the-Loop Actions
              </div>

              {/* Status Notice Banners */}
              {(normStatus === 'approved' || normStatus === 'resolved') && (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={20} color="#059669" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#065f46' }}>Settlement Finalized & Allocated</div>
                    <div style={{ fontSize: '0.75rem', color: '#047857' }}>Payment is posted in the ledger. You can re-allocate or reverse below.</div>
                  </div>
                </div>
              )}

              {normStatus === 'rejected' && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <XCircle size={20} color="#dc2626" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#991b1b' }}>Case Status: REJECTED</div>
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>{currentCase.resolution_reason || 'Rejected by accountant.'} You can re-approve or apply an override.</div>
                  </div>
                </div>
              )}

              {!showRejectForm && !showOverrideForm && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(normStatus !== 'approved' && normStatus !== 'resolved') && (
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      style={{
                        flex: 2,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 18px',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <CheckCircle size={18} />
                      <span>Approve Match</span>
                    </button>
                  )}

                  {normStatus !== 'rejected' && (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {(normStatus === 'approved' || normStatus === 'resolved') ? 'Void / Reject' : 'Reject'}
                    </button>
                  )}

                  <button
                    onClick={() => setShowOverrideForm(true)}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Override
                  </button>
                </div>
              )}

              {/* Reject Form Input */}
              {showRejectForm && (
                <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fee2e2', padding: '14px', borderRadius: '12px', border: '1px solid #fca5a5' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626' }}>Reject Recommendation & Reverse Allocation</div>
                  <input
                    type="text"
                    required
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #fca5a5', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={submitting} style={{ flex: 1, background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Confirm Reject</button>
                    <button type="button" onClick={() => setShowRejectForm(false)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              )}

              {/* Override Form Input */}
              {showOverrideForm && (
                <form onSubmit={handleOverride} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f1f5f9', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>Manual Accountant Override</div>
                  <input
                    type="number"
                    required
                    placeholder="Target Schedule ID (e.g. 1)"
                    value={overrideScheduleId}
                    onChange={(e) => setOverrideScheduleId(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="Allocated Amount"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Override rationale text..."
                    value={overrideReasonText}
                    onChange={(e) => setOverrideReasonText(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={submitting} style={{ flex: 1, background: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Apply Override</button>
                    <button type="button" onClick={() => setShowOverrideForm(false)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
