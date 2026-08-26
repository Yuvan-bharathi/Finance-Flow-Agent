import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CreditCard, Plus, CheckCircle, AlertCircle, Eye, Zap, Search, Play, RefreshCw, AlertTriangle, ShieldCheck, Bot } from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { ActionCenterDrawer } from '../components/ActionCenterDrawer';
import { getCases, analyzeCase } from '../services/reconciliationService';
import { analyzeBulk, analyzeAllPending } from '../services/agentService';
import { useAuth } from '../context/AuthContext';
import { useDateFilter } from '../context/DateFilterContext';
import { swrCache } from '../services/cacheService';
import { connectSocket } from '../services/socketService';

/**
 * Section 17 Payment Ingestion & Deposit Inspection Page (Real-Time & Date Filter Enhanced)
 * Features Case # Column, Exact Date+Time Timestamps, Checkbox Selection, Bulk Execution, and Live WebSocket Prepending.
 */
export const PaymentIngestion = ({ onAskAI }) => {
  const { user } = useAuth();
  const { startDate, endDate } = useDateFilter();
  const isViewer = (user?.role_name || user?.role || '').toLowerCase() === 'viewer';
  const [payments, setPayments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  // Multi-select & Batch Execution state
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [processingCaseId, setProcessingCaseId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState('selected'); // 'selected' | 'all_new'

  // Form fields
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [reference, setReference] = useState('');

  const fetchPaymentsAndCases = async (showSpinner = false) => {
    try {
      if (showSpinner && payments.length === 0) setLoading(true);
      const cacheKey = `payments:${startDate}:${endDate}`;

      const [payData, casesData] = await Promise.all([
        swrCache.fetchWithSwr(
          cacheKey,
          () => api.get('/payments', { params: { startDate, endDate } }).then(res => res.data?.data || []),
          { ttlMs: 30000, onBackgroundUpdate: (fresh) => setPayments(fresh || []) }
        ),
        getCases()
      ]);

      setPayments(payData || []);
      setCases(casesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndCases(payments.length === 0);

    // Attach real-time WebSocket listener for live deposits
    const socket = connectSocket();
    if (socket) {
      const handlePaymentIngested = (payload) => {
        const newPayment = payload.payment || payload;
        const newCase = payload.case;

        setPayments(prev => {
          if (prev.some(p => p.id === newPayment.id || p.transaction_id === newPayment.transaction_id)) {
            return prev;
          }
          return [{ ...newPayment, isLive: true }, ...prev];
        });

        if (newCase) {
          setCases(prev => {
            if (prev.some(c => c.id === newCase.id)) return prev;
            return [{ ...newCase, isLive: true }, ...prev];
          });
        }

        // Remove live badge highlight after 4s
        setTimeout(() => {
          setPayments(prev => prev.map(p => (p.id === newPayment.id ? { ...p, isLive: false } : p)));
        }, 4000);

        swrCache.invalidate('payments');
      };

      socket.on('PAYMENT_INGESTED', handlePaymentIngested);
      return () => {
        socket.off('PAYMENT_INGESTED', handlePaymentIngested);
      };
    }
  }, [startDate, endDate]);

  // Filter pending unanalyzed cases (both 'new' and 'open' without an existing match)
  const unanalyzedCases = cases.filter(c => {
    const s = (c.status || '').toLowerCase();
    return (s === 'new' || s === 'open') && !c.has_recommendation;
  });
  const newCases = unanalyzedCases;

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = cases.map(c => c.id);
      setSelectedCaseIds(allIds);
    } else {
      setSelectedCaseIds([]);
    }
  };

  const handleSelectRow = (caseId, e) => {
    e.stopPropagation();
    if (selectedCaseIds.includes(caseId)) {
      setSelectedCaseIds(prev => prev.filter(id => id !== caseId));
    } else {
      setSelectedCaseIds(prev => [...prev, caseId]);
    }
  };

  // Single-Case Inline AI Trigger
  const handleSingleAnalyze = async (caseId, e) => {
    if (e) e.stopPropagation();
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot trigger AI analysis.');
      return;
    }
    try {
      setProcessingCaseId(caseId);
      setErrorMsg('');
      setSuccessMsg('');
      await analyzeCase(caseId);
      setSuccessMsg(`⚡ Agent 1 Payment Reconciliation completed for Case #${caseId}!`);
      await fetchPaymentsAndCases();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || `Failed to analyze Case #${caseId}`);
    } finally {
      setProcessingCaseId(null);
    }
  };

  // Bulk Execution Trigger
  const handleExecuteBulk = async () => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot trigger bulk AI analysis.');
      return;
    }
    try {
      setBulkProcessing(true);
      setShowConfirmModal(false);
      setErrorMsg('');
      setSuccessMsg('');

      if (confirmType === 'selected') {
        const result = await analyzeBulk(selectedCaseIds);
        setSuccessMsg(`⚡ Bulk AI Execution complete! Processed ${result.casesProcessed || selectedCaseIds.length} selected cases.`);
        setSelectedCaseIds([]);
      } else {
        const result = await analyzeAllPending();
        setSuccessMsg(`⚡ Bulk AI Execution complete! Processed all ${result.casesProcessed || newCases.length} pending new cases.`);
        setSelectedCaseIds([]);
      }

      await fetchPaymentsAndCases();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Bulk AI analysis failed.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Form Submission
  const handleIngest = async (e) => {
    e.preventDefault();
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot ingest new payment deposits.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    if (!transactionId || !amount || !paymentDate) {
      setErrorMsg('Transaction ID, Amount, and Date are required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/payments/ingest', {
        transactionId,
        amount: parseFloat(amount),
        paymentDate,
        senderName,
        senderAccount,
        reference,
        source: 'api'
      });

      setSuccessMsg(`Payment '${transactionId}' ingested successfully! Opened Reconciliation Case #${response.data.data.case.id}.`);
      setTransactionId('');
      setAmount('');
      setSenderName('');
      setSenderAccount('');
      setReference('');
      fetchPaymentsAndCases();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Ingestion failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Mock Bank Simulator Trigger
  const handleSimulateBankDeposit = async () => {
    if (isViewer) {
      setErrorMsg('⛔ Access Restricted: Viewer role is read-only and cannot simulate bank statement feeds.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.post('/payments/mock-bank-deposit', {
        transactionId: transactionId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        paymentDate: paymentDate || undefined,
        senderName: senderName || undefined,
        senderAccount: senderAccount || undefined,
        reference: reference || undefined
      });
      const data = res.data.data || {};
      setSuccessMsg(`🏦 [Dummy Bank API] Payment deposit ingested successfully! Case #${data.case?.id} created in state NEW.`);
      setTransactionId('');
      setAmount('');
      setSenderName('');
      setSenderAccount('');
      setReference('');
      fetchPaymentsAndCases();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to simulate bank deposit.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format exact date + time timestamp
  const formatDateTime = (dateStr, createdAtStr) => {
    if (createdAtStr) {
      const d = new Date(createdAtStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
      return createdAtStr;
    }
    return dateStr || 'N/A';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard color="#0284c7" size={26} />
          Payment Manual Ingestion Engine (Section 17)
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
          Simulate bank statement feeds or ingest raw deposit transactions. Trigger single-case AI investigation or batch analyze selected cases.
        </p>
      </div>

      {/* Ingestion Form Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
          Ingest Raw Bank Deposit
        </h3>

        {successMsg && (
          <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#059669', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleIngest} className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Bank Transaction ID *</label>
            <input
              type="text"
              required
              placeholder="e.g. TXN-BANK-998877"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Deposit Amount (INR ₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 100000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Payment Date *</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Sender Name</label>
            <input
              type="text"
              placeholder="e.g. ABC Technologies Pvt Ltd"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Sender Bank Account</label>
            <input
              type="text"
              placeholder="e.g. 123456789012"
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Bank Narration / Reference</label>
            <input
              type="text"
              placeholder="e.g. LN-2026-001 AUG REPAYMENT"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleSimulateBankDeposit}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🏦 Simulate Dummy Bank Webhook Deposit</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              <Plus size={16} />
              <span>{submitting ? 'Ingesting...' : '+ Ingest Payment & Open Case'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Ingested Records Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        
        {/* Table Header Bar with Bulk Controls */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Historical Ingested Deposits</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '9999px' }}>
                {payments.length} Total Deposits
              </span>
            </h3>
          </div>

          {/* Bulk Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {selectedCaseIds.length > 0 && (
              <button
                onClick={() => { setConfirmType('selected'); setShowConfirmModal(true); }}
                disabled={bulkProcessing}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Zap size={14} />
                <span>Bulk Analyze Selected ({selectedCaseIds.length})</span>
              </button>
            )}

            {unanalyzedCases.length > 0 && (
              <button
                onClick={() => { setConfirmType('all_new'); setShowConfirmModal(true); }}
                disabled={bulkProcessing}
                style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  color: '#4f46e5',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Play size={14} />
                <span>Analyze All Unprocessed ({unanalyzedCases.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: '40px', padding: '16px 20px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={cases.length > 0 && selectedCaseIds.length === cases.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#4f46e5', width: '16px', height: '16px' }}
                  />
                </th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Case & Txn ID</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Sender & Account</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Deposit Amount</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Received Date & Time</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Case Status</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5' }} />
                    <div>Loading ingested payment records...</div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No payment deposits found. Use the ingestion form above to register transactions.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const matchedCase = cases.find(c => c.payment_id === p.id);
                  const caseId = p.case_id || matchedCase?.id;
                  const rawStatus = (p.case_status || matchedCase?.status || p.status || 'new').toLowerCase();
                  const normStatus = rawStatus === 'pending' ? 'new' : rawStatus;
                  const isSelected = caseId && selectedCaseIds.includes(caseId);
                  const isProcessingThis = processingCaseId === caseId;
                  const hasRecommendation = matchedCase?.has_recommendation || matchedCase?.recommendation_id;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => matchedCase && setSelectedCase(matchedCase)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: matchedCase ? 'pointer' : 'default',
                        background: isSelected ? '#f5f3ff' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 20px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {caseId ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(caseId, e)}
                            style={{ cursor: 'pointer', accentColor: '#4f46e5', width: '16px', height: '16px' }}
                          />
                        ) : null}
                      </td>

                      {/* Case & Txn ID */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Case #{caseId || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
                          TXN ID: {p.transaction_id}
                        </div>
                      </td>

                      {/* Sender & Account */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{p.sender_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {p.sender_account ? `Acct: ${p.sender_account}` : p.reference || 'N/A'}
                        </div>
                      </td>

                      {/* Deposit Amount */}
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>
                        ₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Exact Received Date & Time Timestamp */}
                      <td style={{ padding: '12px 16px', color: '#334155', fontWeight: '600', fontSize: '0.8rem' }}>
                        {formatDateTime(p.payment_date, p.created_at || (matchedCase && matchedCase.created_at))}
                      </td>

                      {/* Case Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={normStatus} />
                      </td>

                      {/* Actions Column */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          
                          {/* Single Case AI Analyze / Retry Trigger */}
                          {caseId && (normStatus === 'new' || normStatus === 'open' || normStatus === 'ai_failed') && !hasRecommendation && (
                            <button
                              onClick={(e) => handleSingleAnalyze(caseId, e)}
                              disabled={isProcessingThis || bulkProcessing}
                              style={{
                                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                              }}
                            >
                              {isProcessingThis ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Analyzing...</span>
                                </>
                              ) : normStatus === 'ai_failed' ? (
                                <>
                                  <RefreshCw size={12} />
                                  <span>Retry</span>
                                </>
                              ) : (
                                <>
                                  <Zap size={12} />
                                  <span>Analyze</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* View Case Drawer Button */}
                          {matchedCase && (
                            <button
                              onClick={() => setSelectedCase(matchedCase)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#475569',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={12} /> View Case
                            </button>
                          )}

                          {/* Ask AI / Investigate button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAskAI) onAskAI('payment', p.id);
                            }}
                            title="Ask AI to investigate this payment"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(124,58,237,0.25)'
                            }}
                          >
                            <Bot size={11} />
                            Ask AI
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
      </div>

      {/* Action Center Slide-Over Drawer */}
      {selectedCase && (
        <ActionCenterDrawer
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={(optimisticData) => {
            if (optimisticData && optimisticData.id) {
              setCases(prev => prev.map(c => c.id === optimisticData.id ? { ...c, status: optimisticData.status } : c));
              setPayments(prev => prev.map(p => {
                const match = (p.case_id === optimisticData.id || (cases.find(c => c.id === optimisticData.id && c.payment_id === p.id)));
                if (match) {
                  return { ...p, case_status: optimisticData.status };
                }
                return p;
              }));
            }
            fetchPaymentsAndCases(false);
          }}
        />
      )}

      {/* Confirmation Modal for Bulk Analysis */}
      {showConfirmModal && (
        <div
          onClick={() => setShowConfirmModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.2s ease-out',
              cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} color="#4f46e5" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Confirm Bulk AI Agent Analysis
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  {confirmType === 'selected' 
                    ? `Execute Agent 1 investigation on ${selectedCaseIds.length} selected cases?`
                    : `Execute Agent 1 investigation on all ${newCases.length} pending NEW cases?`}
                </p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '0.8rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#059669', marginBottom: '4px' }}>
                <ShieldCheck size={16} />
                <span>Deterministic Pre-Check Engine Active</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                High-confidence exact bank matches ($\ge 85\%$) will be auto-scored with <strong>0 LLM tokens consumed</strong>. Remaining cases will run Groq tool-calling with concurrency limit of 5 worker runs.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={bulkProcessing}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulk}
                disabled={bulkProcessing}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                {bulkProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Start Bulk Analysis</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
