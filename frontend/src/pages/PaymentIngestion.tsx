import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  CreditCard, Plus, CheckCircle, AlertCircle, Eye, Zap, Search, Play,
  RefreshCw, AlertTriangle, ShieldCheck, Bot, ScanSearch, ShieldAlert, X,
  MessageSquare, ChevronLeft, ChevronRight, Filter, Calendar,
} from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { ActionCenterDrawer, type EnrichedCase } from '../components/ActionCenterDrawer';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { getCases, analyzeCase } from '../services/reconciliationService';
import { analyzeBulk, analyzeAllPending } from '../services/agentService';
import { useAuth } from '../context/AuthContext';
import { useDateFilter, type DatePreset } from '../context/DateFilterContext';
import { swrCache } from '../services/cacheService';
import { connectSocket } from '../services/socketService';
import type { ReconciliationCase } from '../types/reconciliation';

export interface PaymentRecord {
  id: number;
  transaction_id: string;
  amount: number | string;
  payment_date?: string;
  created_at?: string;
  sender_name?: string;
  sender_account?: string;
  reference?: string;
  case_id?: number;
  case_status?: string;
  status?: string;
  isLive?: boolean;
  anomaly_detected?: boolean;
  anomaly_severity?: string;
  anomaly_score?: number;
  anomaly_types?: string[];
  safe_to_allocate?: boolean;
  requires_manual_review?: boolean;
  anomaly_explanation?: string;
  anomaly_recommendation?: string;
  anomaly_breakdown?: string | Record<string, number>;
}

interface PaymentIngestionProps {
  onAskAI?: (recordType: string, recordId: string | number, extra?: Record<string, unknown>) => void;
}

export const PaymentIngestion = ({ onAskAI }: PaymentIngestionProps) => {
  const { user } = useAuth();
  const { startDate, endDate, activePreset, setPreset } = useDateFilter();
  const isViewer = ((user as unknown as Record<string, string>)?.role_name || user?.role || '').toLowerCase() === 'viewer';
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cases, setCases] = useState<EnrichedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCase, setSelectedCase] = useState<EnrichedCase | null>(null);
  const [selectedAnomalyPayment, setSelectedAnomalyPayment] = useState<PaymentRecord | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Multi-select & Batch Execution
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [processingCaseId, setProcessingCaseId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState<'selected' | 'all_new'>('selected');

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
          () => api.get('/payments', { params: { startDate, endDate } }).then(res => (res.data?.data || []) as PaymentRecord[]),
          { ttlMs: 30000, onBackgroundUpdate: (fresh) => setPayments((fresh as PaymentRecord[]) || []) }
        ),
        getCases(),
      ]);

      setPayments((payData as PaymentRecord[]) || []);
      setCases((casesData || []) as EnrichedCase[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPaymentsAndCases(payments.length === 0);

    const socket = connectSocket();
    if (socket) {
      const handlePaymentIngested = (payload: { payment?: PaymentRecord; case?: EnrichedCase } & PaymentRecord) => {
        const newPayment: PaymentRecord = payload.payment || payload;
        const newCase: EnrichedCase | undefined = payload.case;

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

        setTimeout(() => {
          setPayments(prev => prev.map(p => (p.id === newPayment.id ? { ...p, isLive: false } : p)));
        }, 4000);

        swrCache.invalidate('payments');
      };

      const handleAnomalyDetected = (payload?: { payment_id?: number; case_id?: number; severity?: string; anomaly_score?: number; anomaly_types?: string[] }) => {
        if (!payload) return;
        setPayments(prev => prev.map(p => {
          if (p.id === payload.payment_id || p.case_id === payload.case_id) {
            return {
              ...p,
              anomaly_detected: true,
              anomaly_severity: payload.severity,
              anomaly_score: payload.anomaly_score,
              anomaly_types: payload.anomaly_types,
            };
          }
          return p;
        }));
        swrCache.invalidate('anomalies');
      };

      socket.on('PAYMENT_INGESTED', handlePaymentIngested);
      socket.on('PAYMENT_RECEIVED', handlePaymentIngested);
      socket.on('ANOMALY_DETECTED', handleAnomalyDetected);

      return () => {
        socket.off('PAYMENT_INGESTED', handlePaymentIngested);
        socket.off('PAYMENT_RECEIVED', handlePaymentIngested);
        socket.off('ANOMALY_DETECTED', handleAnomalyDetected);
      };
    }
  }, [startDate, endDate]);

  const unanalyzedCases = cases.filter(c => {
    const s = (c.status || '').toLowerCase();
    return (s === 'new' || s === 'open') && !c.has_recommendation;
  });
  const newCases = unanalyzedCases;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchedCase = cases.find(c => c.payment_id === p.id);
      const rawStatus = (p.case_status || matchedCase?.status || p.status || 'new').toLowerCase();
      const hasRecommendation = matchedCase?.has_recommendation || matchedCase?.recommendation_id;
      const normStatus = hasRecommendation ? 'pending_review' : (rawStatus === 'pending' ? 'new' : rawStatus);

      if (statusFilter === 'PENDING_REVIEW' && normStatus !== 'pending_review') return false;
      if (statusFilter === 'NEW' && normStatus !== 'new' && normStatus !== 'open') return false;
      if (statusFilter === 'RESOLVED' && normStatus !== 'resolved' && normStatus !== 'approved' && normStatus !== 'completed') return false;
      if (statusFilter === 'ANOMALY' && !p.anomaly_detected && !p.anomaly_severity && !(p.anomaly_score && p.anomaly_score >= 20)) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const txn = (p.transaction_id || '').toLowerCase();
        const sender = (p.sender_name || '').toLowerCase();
        const acct = (p.sender_account || '').toLowerCase();
        const caseStr = String(p.case_id || matchedCase?.id || p.id || '');
        if (!txn.includes(q) && !sender.includes(q) && !acct.includes(q) && !caseStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, cases, statusFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, activePreset]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = cases.map(c => c.id);
      setSelectedCaseIds(allIds);
    } else {
      setSelectedCaseIds([]);
    }
  };

  const handleSelectRow = (caseId: number, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    if (selectedCaseIds.includes(caseId)) {
      setSelectedCaseIds(prev => prev.filter(id => id !== caseId));
    } else {
      setSelectedCaseIds(prev => [...prev, caseId]);
    }
  };

  const handleSingleAnalyze = async (caseId: number, e?: React.MouseEvent) => {
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
    } catch (err: unknown) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to analyze Case #${caseId}`;
      setErrorMsg(msg);
    } finally {
      setProcessingCaseId(null);
    }
  };

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
        const result = (await analyzeBulk(selectedCaseIds)) as { casesProcessed?: number };
        setSuccessMsg(`⚡ Bulk AI Execution complete! Processed ${result?.casesProcessed || selectedCaseIds.length} selected cases.`);
        setSelectedCaseIds([]);
      } else {
        const result = (await analyzeAllPending()) as { casesProcessed?: number };
        setSuccessMsg(`⚡ Bulk AI Execution complete! Processed all ${result?.casesProcessed || newCases.length} pending new cases.`);
        setSelectedCaseIds([]);
      }

      await fetchPaymentsAndCases();
    } catch (err: unknown) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Bulk AI analysis failed.';
      setErrorMsg(msg);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
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
        source: 'api',
      });

      setSuccessMsg(`Payment '${transactionId}' ingested successfully! Opened Reconciliation Case #${response.data?.data?.case?.id || ''}.`);
      setTransactionId('');
      setAmount('');
      setSenderName('');
      setSenderAccount('');
      setReference('');
      void fetchPaymentsAndCases();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ingestion failed';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
        reference: reference || undefined,
      });
      const data = res.data?.data || {};
      setSuccessMsg(`🏦 [Dummy Bank API] Payment deposit ingested successfully! Case #${data.case?.id || ''} created in state NEW.`);
      setTransactionId('');
      setAmount('');
      setSenderName('');
      setSenderAccount('');
      setReference('');
      void fetchPaymentsAndCases();
    } catch (err: unknown) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to simulate bank deposit.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr?: string, createdAtStr?: string) => {
    const raw = createdAtStr || dateStr;
    if (raw) {
      let str = String(raw).trim();
      if (!str.endsWith('Z') && !str.includes('+')) {
        if (str.includes(' ')) {
          str = str.replace(' ', 'T') + 'Z';
        } else if (str.length === 10) {
          str = str + 'T00:00:00Z';
        }
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      }
      return raw;
    }
    return 'N/A';
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
            <CustomDatePicker
              label="Payment Date"
              value={paymentDate}
              onChange={(val) => setPaymentDate(val)}
              required
              placeholder="Select payment date"
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
              onClick={() => void handleSimulateBankDeposit()}
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
                transition: 'all 0.2s ease',
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
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              }}
            >
              <Plus size={16} />
              <span>{submitting ? 'Ingesting...' : 'Ingest Payment & Open Case'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Deposits Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Historical Ingested Deposits</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '2px 9px', borderRadius: '9999px' }}>
                {filteredPayments.length} of {payments.length} Deposits
              </span>
            </h3>
          </div>

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
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
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
                  gap: '6px',
                }}
              >
                <Play size={14} />
                <span>Analyze All Unprocessed ({unanalyzedCases.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '14px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Txn ID, Sender Name, Account or Case..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.825rem',
                background: '#ffffff',
                color: '#0f172a',
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginRight: '2px' }}>
              <Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />Date:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: '2026', label: 'FY 2026' },
              { id: '2025', label: 'FY 2025' },
              { id: 'this_month', label: 'This Month' },
              { id: '30d', label: '30 Days' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id as DatePreset)}
                style={{
                  background: activePreset === p.id ? '#4f46e5' : '#ffffff',
                  color: activePreset === p.id ? '#ffffff' : '#475569',
                  border: `1px solid ${activePreset === p.id ? '#4f46e5' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              <Filter size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses ({payments.length})</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="NEW">New / Unprocessed</option>
              <option value="RESOLVED">Resolved / Approved</option>
              <option value="ANOMALY">Anomaly Flagged</option>
            </select>
          </div>
        </div>

        {/* Table */}
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
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Case &amp; Txn ID</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Sender &amp; Account</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Deposit Amount</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Received Date &amp; Time</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Case Status</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Agent 7 Anomaly</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5' }} />
                    <div>Loading ingested payment records...</div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No payment deposits matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const matchedCase = cases.find(c => c.payment_id === p.id);
                  const caseId = p.case_id || matchedCase?.id;
                  const rawStatus = (p.case_status || matchedCase?.status || p.status || 'new').toLowerCase();
                  const hasRecommendation = matchedCase?.has_recommendation || matchedCase?.recommendation_id;
                  const normStatus = hasRecommendation ? 'pending_review' : (rawStatus === 'pending' ? 'new' : rawStatus);
                  const isSelected = Boolean(caseId && selectedCaseIds.includes(caseId));
                  const isProcessingThis = processingCaseId === caseId;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => matchedCase && setSelectedCase(matchedCase)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: matchedCase ? 'pointer' : 'default',
                        background: isSelected ? '#f5f3ff' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
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

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Case #{caseId || p.id}</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
                          TXN ID: {p.transaction_id}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{p.sender_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {p.sender_account ? `Acct: ${p.sender_account}` : p.reference || 'N/A'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>
                        ₹{parseFloat(String(p.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#334155', fontWeight: '600', fontSize: '0.8rem' }}>
                        {formatDateTime(p.payment_date, p.created_at || (matchedCase && matchedCase.created_at))}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={normStatus} />
                      </td>

                      <td style={{ padding: '12px 16px' }} onClick={(e) => { e.stopPropagation(); if (p.anomaly_severity || p.anomaly_score != null) setSelectedAnomalyPayment(p); }}>
                        {(() => {
                          const severity = p.anomaly_severity || (p.anomaly_score != null ? (p.anomaly_score >= 90 ? 'CRITICAL' : p.anomaly_score >= 70 ? 'HIGH' : p.anomaly_score >= 40 ? 'MEDIUM' : p.anomaly_score >= 20 ? 'LOW' : 'CLEAR') : null);
                          if (!severity) {
                            return (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <ScanSearch size={12} /> Pending scan
                              </span>
                            );
                          }
                          const cfg = {
                            CLEAR: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'CLEAR', icon: <ShieldCheck size={12} /> },
                            LOW: { bg: '#fefce8', color: '#d97706', border: '#fde68a', label: 'LOW', icon: <AlertCircle size={12} /> },
                            MEDIUM: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'MEDIUM', icon: <AlertTriangle size={12} /> },
                            HIGH: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'HIGH', icon: <ShieldAlert size={12} /> },
                            CRITICAL: { bg: '#450a0a', color: '#ef4444', border: '#dc2626', label: 'CRITICAL', icon: <ShieldAlert size={12} /> },
                          }[severity] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1', label: severity, icon: <ScanSearch size={12} /> };

                          return (
                            <button
                              type="button"
                              style={{
                                background: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Click to view Agent 7 Anomaly breakdown"
                            >
                              {cfg.icon}
                              <span>{cfg.label}</span>
                              {p.anomaly_score != null && <span style={{ opacity: 0.8, fontSize: '0.65rem' }}>({Math.round(p.anomaly_score)})</span>}
                            </button>
                          );
                        })()}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          {caseId && (normStatus === 'new' || normStatus === 'open' || normStatus === 'ai_failed') && !hasRecommendation && (
                            <button
                              onClick={(e) => void handleSingleAnalyze(caseId, e)}
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
                                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
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
                                gap: '4px',
                              }}
                            >
                              <Eye size={12} /> View Case
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAskAI?.('payment', p.id, { caseId });
                            }}
                            title={`Ask AI to investigate Payment #${p.id}${caseId ? ` (Case #${caseId})` : ''}`}
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                              color: '#ffffff',
                              border: 'none',
                              width: '32px',
                              height: '30px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
                              transition: 'transform 0.15s ease',
                            }}
                          >
                            <Bot size={15} />
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

        {/* Pagination */}
        {filteredPayments.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#fafbfc' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
              Showing <span style={{ fontWeight: '700', color: '#0f172a' }}>{(currentPage - 1) * pageSize + 1}</span> to <span style={{ fontWeight: '700', color: '#0f172a' }}>{Math.min(currentPage * pageSize, filteredPayments.length)}</span> of <span style={{ fontWeight: '700', color: '#0f172a' }}>{filteredPayments.length}</span> deposits
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Center Drawer */}
      {selectedCase && (
        <ActionCenterDrawer
          caseItem={selectedCase as ReconciliationCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={(optimisticData) => {
            if (optimisticData && optimisticData.id) {
              setCases(prev => prev.map(c => c.id === optimisticData.id ? { ...c, status: optimisticData.status as EnrichedCase['status'] } : c));
              setPayments(prev => prev.map(p => {
                const match = (p.case_id === optimisticData.id || (cases.find(c => c.id === optimisticData.id && c.payment_id === p.id)));
                if (match) {
                  return { ...p, case_status: optimisticData.status };
                }
                return p;
              }));
            }
            void fetchPaymentsAndCases(false);
          }}
        />
      )}

      {/* Confirmation Modal */}
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
            cursor: 'pointer',
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
              cursor: 'default',
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
                High-confidence exact bank matches (&ge; 85%) will be auto-scored with <strong>0 LLM tokens consumed</strong>. Remaining cases will run Groq tool-calling with concurrency limit of 5 worker runs.
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
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleExecuteBulk()}
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
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
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

      {/* Anomaly Details Modal */}
      {selectedAnomalyPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', width: '520px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '8px', display: 'flex' }}>
                  <ScanSearch size={20} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                    Agent 7 Anomaly Assessment
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>Case #{selectedAnomalyPayment.case_id || selectedAnomalyPayment.id}</span>
                    <span>· Payment #{selectedAnomalyPayment.id}</span>
                    {selectedAnomalyPayment.transaction_id && (
                      <span style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: '0.7rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px' }}>
                        TXN: {selectedAnomalyPayment.transaction_id}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedAnomalyPayment(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Deterministic Score</span>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', lineHeight: 1.1 }}>
                  {selectedAnomalyPayment.anomaly_score != null ? Math.round(selectedAnomalyPayment.anomaly_score) : 0}<span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '600' }}>/100</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', textAlign: 'right' }}>Severity</span>
                  <span style={{
                    background: selectedAnomalyPayment.anomaly_severity === 'HIGH' || selectedAnomalyPayment.anomaly_severity === 'CRITICAL' ? '#fef2f2' : selectedAnomalyPayment.anomaly_severity === 'MEDIUM' ? '#fff7ed' : selectedAnomalyPayment.anomaly_severity === 'LOW' ? '#fefce8' : '#f0fdf4',
                    color: selectedAnomalyPayment.anomaly_severity === 'HIGH' || selectedAnomalyPayment.anomaly_severity === 'CRITICAL' ? '#dc2626' : selectedAnomalyPayment.anomaly_severity === 'MEDIUM' ? '#ea580c' : selectedAnomalyPayment.anomaly_severity === 'LOW' ? '#d97706' : '#16a34a',
                    border: `1px solid ${selectedAnomalyPayment.anomaly_severity === 'HIGH' || selectedAnomalyPayment.anomaly_severity === 'CRITICAL' ? '#fecaca' : selectedAnomalyPayment.anomaly_severity === 'MEDIUM' ? '#fed7aa' : selectedAnomalyPayment.anomaly_severity === 'LOW' ? '#fde68a' : '#bbf7d0'}`,
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'inline-block',
                    marginTop: '2px',
                  }}>
                    {selectedAnomalyPayment.anomaly_severity || 'CLEAR'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{
                background: selectedAnomalyPayment.safe_to_allocate !== false ? '#ecfdf5' : '#fef2f2',
                color: selectedAnomalyPayment.safe_to_allocate !== false ? '#065f46' : '#991b1b',
                border: `1px solid ${selectedAnomalyPayment.safe_to_allocate !== false ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
              }}>
                {selectedAnomalyPayment.safe_to_allocate !== false ? '🟢 Safe for Waterfall Allocation' : '🔴 Allocation Blocked Pending Audit'}
              </span>
              <span style={{
                background: selectedAnomalyPayment.requires_manual_review ? '#fffbeb' : '#f0fdf4',
                color: selectedAnomalyPayment.requires_manual_review ? '#92400e' : '#166534',
                border: `1px solid ${selectedAnomalyPayment.requires_manual_review ? '#fde68a' : '#bbf7d0'}`,
                fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
              }}>
                {selectedAnomalyPayment.requires_manual_review ? '🟡 Human Operational Review Required' : '🟢 Automated Processing Approved'}
              </span>
            </div>

            {selectedAnomalyPayment.anomaly_explanation && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Auditable AI Explanation</p>
                <p style={{ margin: 0, fontSize: '0.83rem', color: '#1e293b', lineHeight: '1.6', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {selectedAnomalyPayment.anomaly_explanation}
                </p>
              </div>
            )}

            {selectedAnomalyPayment.anomaly_recommendation && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageSquare size={13} /> Actionable Operational Recommendation
                </p>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#1e40af', lineHeight: '1.5', fontWeight: '600' }}>
                  {selectedAnomalyPayment.anomaly_recommendation}
                </p>
              </div>
            )}

            {selectedAnomalyPayment.anomaly_breakdown && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Score Breakdown Checks</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(typeof selectedAnomalyPayment.anomaly_breakdown === 'string' ? JSON.parse(selectedAnomalyPayment.anomaly_breakdown) : selectedAnomalyPayment.anomaly_breakdown).map(([k, v]) => (
                    <span key={k} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#374151', fontSize: '0.7rem', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' }}>
                      ✓ {k.replace(/_/g, ' ')}: +{String(v)} pts
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setSelectedAnomalyPayment(null)}
                style={{ background: '#4f46e5', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', color: '#ffffff' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentIngestion;
