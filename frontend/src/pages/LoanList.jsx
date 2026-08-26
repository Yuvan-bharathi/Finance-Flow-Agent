import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import {
  FileSpreadsheet, Plus, Calendar, DollarSign, Eye, Bot,
  RefreshCw, TrendingUp, ShieldCheck, CheckCircle2,
  Search, Mail, X, ShieldAlert, Landmark
} from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../services/socketService';

/**
 * Format currency in Indian Numbering System (₹ Lakhs / Crores / Thousands)
 */
const formatINR = (val, compact = false) => {
  const num = parseFloat(val) || 0;
  if (compact) {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
  }
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Normalizes UTC datetime strings from backend/MySQL and converts to Local Browser Time.
 */
const formatAuditTimestamp = (dateStr) => {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const LoanList = ({ onAskAI }) => {
  const { user } = useAuth();
  const userRole = (user?.role_name || user?.role || '').toLowerCase();
  const canCreateLoan = ['owner', 'super_admin', 'admin', 'manager'].includes(userRole);

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState('all'); // all | HEALTHY | WATCHLIST | CRITICAL | FULLY_RECOVERED
  const [toastMessage, setToastMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Loan Creation Form fields
  const [companyId, setCompanyId] = useState('');
  const [loanNumber, setLoanNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('10');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // ─── 1. Live EMI Calculator Preview in Create Modal ─────────────────────────
  const emiCalculation = useMemo(() => {
    const p = parseFloat(principalAmount) || 0;
    const r = parseFloat(interestRate) || 0;
    const n = parseInt(tenureMonths, 10) || 1;

    if (p <= 0 || n <= 0) {
      return { monthlyEmi: 0, totalInterest: 0, totalPayable: 0 };
    }

    const totalInterest = p * (r / 100) * (n / 12);
    const totalPayable = p + totalInterest;
    const monthlyEmi = totalPayable / n;

    return {
      monthlyEmi,
      totalInterest,
      totalPayable
    };
  }, [principalAmount, interestRate, tenureMonths]);

  // ─── 2. Fetch Loans and Company List ────────────────────────────────────────
  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans');
      setLoans(res.data.data || []);
      const compRes = await api.get('/companies');
      setCompanies(compRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch loans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();

    // ─── 3. Real-Time WebSocket Synchronization Layer ─────────────────────────
    const socket = connectSocket();
    const handleSyncEvent = () => {
      fetchLoans();
    };

    if (socket) {
      socket.on('PAYMENT_INGESTED', handleSyncEvent);
      socket.on('RECONCILIATION_COMPLETED', handleSyncEvent);
      socket.on('LOAN_PAYMENT_ALLOCATED', handleSyncEvent);
      socket.on('LOAN_STATUS_UPDATED', handleSyncEvent);
      socket.on('pipeline_completed', handleSyncEvent);
      socket.on('portfolio_recalculated', handleSyncEvent);
    }

    return () => {
      if (socket) {
        socket.off('PAYMENT_INGESTED', handleSyncEvent);
        socket.off('RECONCILIATION_COMPLETED', handleSyncEvent);
        socket.off('LOAN_PAYMENT_ALLOCATED', handleSyncEvent);
        socket.off('LOAN_STATUS_UPDATED', handleSyncEvent);
        socket.off('pipeline_completed', handleSyncEvent);
        socket.off('portfolio_recalculated', handleSyncEvent);
      }
    };
  }, [fetchLoans]);

  // ─── 4. Fetch Full Repayment Schedule for Selected Loan ─────────────────────
  const handleFetchLoanDetails = async (loanId) => {
    try {
      setLoadingSchedule(true);
      const res = await api.get(`/loans/${loanId}`);
      setSelectedLoan(res.data.data);
    } catch (err) {
      console.error('Failed to fetch schedule for loan:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // ─── 5. Human Action: Trigger Collection Notice (With Zero Overdue Gate) ────
  const handleTriggerCollection = async (loan) => {
    const overdueAmt = parseFloat(loan.overdue_amount || 0);

    // Business Rule Gate: Block Agent 3 if overdue is ₹0
    if (overdueAmt <= 0) {
      setToastMessage({
        type: 'info',
        text: `✓ ${loan.company_name} has no overdue installments. Facility is in good standing (₹0.00 Overdue).`
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [loan.id]: true }));
      await api.post(`/collection/generate/${loan.company_id}`);
      setToastMessage({
        type: 'success',
        text: `⚡ Agent 3 drafted collection notice for ${loan.company_name} (₹${overdueAmt.toLocaleString('en-IN')} overdue). Available in Notifications.`
      });
      setTimeout(() => setToastMessage(null), 7000);
    } catch (err) {
      console.error('Collection trigger error:', err);
      setToastMessage({
        type: 'error',
        text: `Notice generation notice: ${err.response?.data?.message || err.message}`
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setActionLoading(prev => ({ ...prev, [loan.id]: false }));
    }
  };

  // ─── 6. Create Loan Facility Handler ────────────────────────────────────────
  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!companyId || !loanNumber || !principalAmount || !startDate) return;
    if (!canCreateLoan) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Creating new loan facilities requires Admin or Risk Manager permissions.' }
      }));
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/loans', {
        company_id: parseInt(companyId, 10),
        loan_number: loanNumber,
        principal_amount: parseFloat(principalAmount),
        interest_rate: parseFloat(interestRate),
        tenure_months: parseInt(tenureMonths, 10),
        start_date: startDate
      });
      setShowAddModal(false);
      // Reset form
      setCompanyId('');
      setLoanNumber('');
      setPrincipalAmount('');
      fetchLoans();
      setSelectedLoan(res.data.data);
      setToastMessage({
        type: 'success',
        text: `🎉 Successfully created loan contract ${loanNumber} with ${tenureMonths} amortized installments.`
      });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: err.response?.data?.message || 'Access denied: You do not have permission to create loans.' }
        }));
      } else {
        alert(err.response?.data?.message || 'Loan creation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 7. Portfolio Metric KPI Calculations ───────────────────────────────────
  const portfolioKPIs = useMemo(() => {
    let totalPrincipal = 0;
    let totalScheduled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let healthyCount = 0;
    let watchlistCount = 0;
    let criticalCount = 0;
    let fullyRecoveredCount = 0;

    loans.forEach(l => {
      const principal = parseFloat(l.principal_amount || 0);
      const scheduled = parseFloat(l.total_scheduled_amount || l.total_payable || 0);
      const paid = parseFloat(l.total_paid_amount || 0);
      const rem = parseFloat(l.remaining_scheduled_balance || 0);

      totalPrincipal += principal;
      totalScheduled += scheduled;
      totalCollected += paid;
      totalOutstanding += rem;

      if (l.health_status === 'FULLY_RECOVERED' || rem <= 0) fullyRecoveredCount++;
      else if (l.health_status === 'CRITICAL') criticalCount++;
      else if (l.health_status === 'WATCHLIST') watchlistCount++;
      else healthyCount++;
    });

    const recoveryRate = totalScheduled > 0 ? ((totalCollected / totalScheduled) * 100).toFixed(1) : '0.0';

    return {
      totalPrincipal,
      totalScheduled,
      totalCollected,
      totalOutstanding,
      recoveryRate,
      healthyCount,
      watchlistCount,
      criticalCount,
      fullyRecoveredCount,
      totalLoans: loans.length
    };
  }, [loans]);

  // ─── 8. Filtered Loan Facilities ────────────────────────────────────────────
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      // Health Status Filter
      if (healthFilter !== 'all' && l.health_status !== healthFilter) {
        return false;
      }
      // Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const comp = (l.company_name || '').toLowerCase();
        const num = (l.loan_number || '').toLowerCase();
        const reg = (l.registration_number || '').toLowerCase();
        const acc = (l.bank_account_number || '').toLowerCase();
        return comp.includes(term) || num.includes(term) || reg.includes(term) || acc.includes(term);
      }
      return true;
    });
  }, [loans, healthFilter, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Header Toolbar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <FileSpreadsheet color="#059669" size={26} />
            Loan Facilities & Repayment Breakdown
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Portfolio credit exposures, automated amortized schedules, and repayment health monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchLoans}
            title="Refresh Portfolio"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => {
              if (!canCreateLoan) {
                window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
                  detail: { status: 403, message: 'Creating new loan facilities requires Admin or Risk Manager permissions.' }
                }));
                return;
              }
              setShowAddModal(true);
            }}
            disabled={!canCreateLoan}
            title={!canCreateLoan ? 'Creating loan facilities requires Admin or Manager permissions' : 'Create Loan Facility'}
            style={{
              background: !canCreateLoan ? '#cbd5e1' : 'linear-gradient(135deg, #059669, #10b981)',
              color: !canCreateLoan ? '#94a3b8' : '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: !canCreateLoan ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: canCreateLoan ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none'
            }}
          >
            <Plus size={18} />
            <span>{canCreateLoan ? 'Create Loan Facility' : 'Create Facility (Locked)'}</span>
          </button>
        </div>
      </div>

      {/* ── Toast Notification ─────────────────────────────────────────────── */}
      {toastMessage && (
        <div style={{
          background: toastMessage.type === 'success' ? '#ecfdf5' : toastMessage.type === 'error' ? '#fef2f2' : '#eff6ff',
          border: `1px solid ${toastMessage.type === 'success' ? '#86efac' : toastMessage.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          borderRadius: '12px',
          padding: '12px 18px',
          color: toastMessage.type === 'success' ? '#14532d' : toastMessage.type === 'error' ? '#991b1b' : '#1e3a8a',
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} color="#16a34a" /> : <ShieldAlert size={18} />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 1. Executive Portfolio KPI Cards ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        
        {/* Total Principal Disbursed */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Total Portfolio Principal</span>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px', color: '#059669' }}>
              <Landmark size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>
            {formatINR(portfolioKPIs.totalPrincipal, true)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across <strong>{portfolioKPIs.totalLoans}</strong> active borrowing facilities
          </div>
        </div>

        {/* Portfolio Recovery Rate */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Recovery Ratio</span>
            <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '8px', color: '#3b82f6' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#059669' }}>
              {portfolioKPIs.recoveryRate}%
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
              {formatINR(portfolioKPIs.totalCollected, true)} Collected
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${portfolioKPIs.recoveryRate}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Outstanding Scheduled Repayment */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Outstanding Scheduled</span>
            <div style={{ background: '#fef2f2', padding: '6px', borderRadius: '8px', color: '#dc2626' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#b91c1c', marginTop: '6px' }}>
            {formatINR(portfolioKPIs.totalOutstanding, true)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Expected total: <strong>{formatINR(portfolioKPIs.totalScheduled, true)}</strong>
          </div>
        </div>

        {/* Portfolio Health Breakdown */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Facility Health Status</span>
            <div style={{ background: '#f5f3ff', padding: '6px', borderRadius: '8px', color: '#7c3aed' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>
              🟢 {portfolioKPIs.healthyCount} Healthy
            </span>
            <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>
              ⚠️ {portfolioKPIs.watchlistCount} Watchlist
            </span>
            <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>
              🚨 {portfolioKPIs.criticalCount} Critical
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px' }}>
            Mutually exclusive overdue SLA rules
          </div>
        </div>

      </div>

      {/* ── 2. Search & Health Status Filter Tabs ───────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Facilities (${portfolioKPIs.totalLoans})` },
            { id: 'HEALTHY', label: `🟢 Healthy (${portfolioKPIs.healthyCount})` },
            { id: 'WATCHLIST', label: `⚠️ Watchlist (${portfolioKPIs.watchlistCount})` },
            { id: 'CRITICAL', label: `🚨 Critical / Overdue (${portfolioKPIs.criticalCount})` },
            { id: 'FULLY_RECOVERED', label: `✅ Fully Recovered (${portfolioKPIs.fullyRecoveredCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setHealthFilter(tab.id)}
              style={{
                background: healthFilter === tab.id ? '#0f172a' : '#f8fafc',
                color: healthFilter === tab.id ? '#ffffff' : '#64748b',
                border: `1px solid ${healthFilter === tab.id ? '#0f172a' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Instant Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: '0 1 340px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search company, reg #, or loan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Main Loan Facilities Table ───────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Loan Contracts ({filteredLoans.length})
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Showing real-time installment milestone amortization and repayment compliance.
            </p>
          </div>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Facility Ref & Borrower</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Principal & Terms</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Repayment Progress</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Outstanding & Next Due</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Health Status</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#059669', display: 'block' }} />
                    <div>Loading loan facilities & schedules...</div>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <ShieldAlert size={30} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>No matching loan facilities found</div>
                    <div style={{ fontSize: '0.78rem' }}>Try adjusting your search terms or filter selection.</div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map(l => {
                  const totalInst = l.total_installments || 1;
                  const paidInst = l.paid_installments || 0;
                  const pct = l.progress_percentage || 0;
                  const remaining = parseFloat(l.remaining_scheduled_balance || 0);
                  const overdueAmt = parseFloat(l.overdue_amount || 0);
                  const maxDaysOverdue = l.max_days_overdue || 0;

                  return (
                    <tr
                      key={l.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Facility Ref & Borrower */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#4f46e5', fontSize: '0.88rem' }}>
                          {l.loan_number}
                        </div>
                        <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                          {l.company_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '6px' }}>
                          <span>{l.registration_number || `ID #${l.company_id}`}</span>
                          {l.bank_account_number && <span>• Acct: {l.bank_account_number}</span>}
                        </div>
                      </td>

                      {/* Principal & Terms */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {formatINR(l.principal_amount)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                          @{parseFloat(l.interest_rate)}% p.a. • <strong>{totalInst} Months</strong>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Gross: {formatINR(l.total_scheduled_amount || l.total_payable)}
                        </div>
                      </td>

                      {/* Repayment Progress Bar */}
                      <td style={{ padding: '14px 20px', minWidth: '180px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                          <span>{paidInst} / {totalInst} Paid</span>
                          <span style={{ color: '#059669' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: pct === 100 ? '#10b981' : pct > 0 ? '#4f46e5' : '#cbd5e1',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                          {formatINR(l.total_paid_amount)} Recovered
                        </div>
                      </td>

                      {/* Outstanding & Next Due */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: '800', color: remaining > 0 ? '#b91c1c' : '#059669' }}>
                          {formatINR(remaining)}
                        </div>
                        {overdueAmt > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700', marginTop: '2px' }}>
                            🚨 {formatINR(overdueAmt)} Past Due
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          {l.next_due_date ? `Next Due: ${formatAuditTimestamp(l.next_due_date)}` : 'Completed'}
                        </div>
                      </td>

                      {/* Health Status Pill */}
                      <td style={{ padding: '14px 20px' }}>
                        {l.health_status === 'FULLY_RECOVERED' ? (
                          <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                            ✓ FULLY SETTLED
                          </span>
                        ) : l.health_status === 'CRITICAL' ? (
                          <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                            CRITICAL ({maxDaysOverdue}d overdue)
                          </span>
                        ) : l.health_status === 'WATCHLIST' ? (
                          <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                            WATCHLIST ({maxDaysOverdue}d)
                          </span>
                        ) : (
                          <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                            HEALTHY
                          </span>
                        )}
                      </td>

                      {/* Direct Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          
                          {/* View Schedule */}
                          <button
                            onClick={() => handleFetchLoanDetails(l.id)}
                            title="Inspect full monthly amortization breakdown"
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Calendar size={13} color="#4f46e5" />
                            <span>Schedule</span>
                          </button>

                          {/* Ask Copilot */}
                          <button
                            onClick={() => {
                              if (onAskAI) onAskAI('loan', l.id);
                            }}
                            title="Trigger Copilot audit on this facility"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(124,58,237,0.2)'
                            }}
                          >
                            <Bot size={13} />
                            <span>Copilot</span>
                          </button>

                          {/* Collection Notice (Agent 3) */}
                          <button
                            onClick={() => handleTriggerCollection(l)}
                            disabled={actionLoading[l.id]}
                            title={overdueAmt <= 0 ? 'No overdue balance (Account is healthy)' : 'Draft collection reminder email (Agent 3)'}
                            style={{
                              background: overdueAmt > 0 ? '#fff1f2' : '#f8fafc',
                              color: overdueAmt > 0 ? '#e11d48' : '#94a3b8',
                              border: `1px solid ${overdueAmt > 0 ? '#fecdd3' : '#e2e8f0'}`,
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
                            <Mail size={13} />
                            <span>{actionLoading[l.id] ? 'Drafting...' : 'Notice'}</span>
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

      {/* ── 4. Interactive Repayment Schedule Slide-Out Modal / Drawer ───────── */}
      {selectedLoan && (
        <div
          onClick={() => setSelectedLoan(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end',
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default',
              overflowY: 'auto'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Amortization Schedule: {selectedLoan.loan_number}
                  </h3>
                </div>
                <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '4px' }}>
                  Borrower: <strong>{selectedLoan.company_name}</strong> • Principal: <strong>{formatINR(selectedLoan.principal_amount)}</strong>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedLoan(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Facility Key Stats Banner */}
            <div style={{ padding: '16px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Gross Payable</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{formatINR(selectedLoan.total_payable)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Interest Rate</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5' }}>{parseFloat(selectedLoan.interest_rate)}% p.a.</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Tenure</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#059669' }}>{selectedLoan.schedules?.length || 10} Monthly Milestones</div>
              </div>
            </div>

            {/* Schedule Table */}
            <div style={{ padding: '20px 24px', flex: 1 }}>
              {loadingSchedule ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5', display: 'block' }} />
                  <div>Loading amortization milestones...</div>
                </div>
              ) : !selectedLoan.schedules || selectedLoan.schedules.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No installment milestones generated for this facility.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px', fontWeight: '800' }}>#</th>
                      <th style={{ padding: '10px 12px', fontWeight: '800' }}>Due Date</th>
                      <th style={{ padding: '10px 12px', fontWeight: '800' }}>Installment</th>
                      <th style={{ padding: '10px 12px', fontWeight: '800' }}>Paid</th>
                      <th style={{ padding: '10px 12px', fontWeight: '800' }}>Balance</th>
                      <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLoan.schedules.map(s => {
                      const isPaid = s.status === 'paid';
                      const isPartial = s.status === 'partially_paid' || (parseFloat(s.paid_amount || 0) > 0 && parseFloat(s.paid_amount || 0) < parseFloat(s.scheduled_amount));
                      const isOverdue = !isPaid && !isPartial && s.days_overdue > 0;
                      const remaining = parseFloat(s.remaining_amount || 0);

                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: '800', color: '#475569' }}>
                            {s.installment_number}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#0f172a' }}>
                            {formatAuditTimestamp(s.due_date)}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a' }}>
                            {formatINR(s.scheduled_amount)}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '700', color: isPaid ? '#059669' : isPartial ? '#d97706' : '#64748b' }}>
                            {formatINR(s.paid_amount || 0)}
                            {s.transaction_id && (
                              <div style={{ fontSize: '0.65rem', color: '#4f46e5' }}>TXN: {s.transaction_id}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '700', color: remaining > 0 ? '#b91c1c' : '#059669' }}>
                            {formatINR(remaining)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {isPaid ? (
                              <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800' }}>
                                PAID
                              </span>
                            ) : isPartial ? (
                              <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800' }}>
                                PARTIAL ({formatINR(s.paid_amount)})
                              </span>
                            ) : isOverdue ? (
                              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800' }}>
                                {s.days_overdue}d OVERDUE
                              </span>
                            ) : (
                              <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800' }}>
                                UPCOMING
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => {
                  if (onAskAI) onAskAI('loan', selectedLoan.id);
                  setSelectedLoan(null);
                }}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Bot size={15} />
                <span>Investigate with AI Copilot</span>
              </button>

              <button
                onClick={() => setSelectedLoan(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Close Breakdown
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 5. Create Loan Facility Modal with Live EMI Calculator ──────────── */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Create New Loan Facility
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Configure commercial borrowing contract and auto-generate amortized installments.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateLoan} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Borrower Company Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Borrowing Company *
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="">Select Borrower Company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.registration_number || `ID #${c.id}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Loan Reference Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Loan Reference Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. LN-2026-026"
                  value={loanNumber}
                  onChange={(e) => setLoanNumber(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Principal Amount & Interest Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Principal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Interest Rate (% p.a.) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Tenure Months & Start Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Tenure (Months) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    First Installment Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* ── Live EMI Amortization Preview Box ──────────────────────── */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: '800', textTransform: 'uppercase' }}>Monthly EMI</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#14532d', marginTop: '2px' }}>
                    {formatINR(emiCalculation.monthlyEmi)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: '800', textTransform: 'uppercase' }}>Total Interest</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
                    {formatINR(emiCalculation.totalInterest)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: '800', textTransform: 'uppercase' }}>Total Repayment</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#047857', marginTop: '2px' }}>
                    {formatINR(emiCalculation.totalPayable)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <Plus size={16} />
                  <span>{submitting ? 'Generating Schedule...' : 'Create & Generate Schedule'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default LoanList;
