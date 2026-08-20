import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CreditCard, Plus, CheckCircle, AlertCircle, Eye, Zap, Search } from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { ActionCenterDrawer } from '../components/ActionCenterDrawer';
import { getCases } from '../services/reconciliationService';

/**
 * Section 17 Payment Ingestion & Deposit Inspection Page
 * 
 * Called by:
 * - Dashboard.jsx
 */
export const PaymentIngestion = () => {
  const [payments, setPayments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  // Form fields
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [reference, setReference] = useState('');

  const fetchPaymentsAndCases = async () => {
    try {
      setLoading(true);
      const [payRes, casesData] = await Promise.all([
        api.get('/payments'),
        getCases()
      ]);
      setPayments(payRes.data.data || []);
      setCases(casesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndCases();
  }, []);

  // Handle deposit row click -> find matching reconciliation case and open ActionCenterDrawer!
  const handleSelectDeposit = (payment) => {
    // Find case matching payment.id
    const targetCase = cases.find(c => c.payment_id === payment.id) || {
      id: payment.id,
      payment_id: payment.id,
      transaction_id: payment.transaction_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      sender_name: payment.sender_name,
      sender_account: payment.sender_account,
      reference: payment.reference,
      status: payment.status,
      latest_recommendation: null
    };

    setSelectedCase(targetCase);
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!transactionId || !amount || !paymentDate) {
      setErrorMsg('Transaction ID, Amount, and Payment Date are required.');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard color="#0284c7" size={26} />
          Payment Manual Ingestion Engine (Section 17)
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
          Simulate bank statement feed or ingest raw deposit transactions with automated duplicate checking. Click any row to inspect case details.
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

        <form onSubmit={handleIngest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Bank Transaction ID *</label>
            <input
              type="text"
              required
              placeholder="e.g. TXN99001122"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px 14px', borderRadius: '10px', marginTop: '4px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Deposit Amount (₹) *</label>
            <input
              type="number"
              required
              step="0.01"
              placeholder="e.g. 100000"
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

          <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" disabled={submitting} className="btn-primary">
              <Plus size={18} />
              <span>Ingest Payment & Open Case</span>
            </button>
          </div>
        </form>
      </div>

      {/* Payment Deposit History Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>Historical Ingested Deposits</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>💡 Click any row to inspect details & run AI analysis</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>TXN ID</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Sender & Account</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Deposit Amount</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Date</th>
              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Payment Status</th>
              <th style={{ padding: '14px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading deposits...</td></tr>
            ) : payments.map(p => (
              <tr
                key={p.id}
                onClick={() => handleSelectDeposit(p)}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 20px', fontWeight: '700', color: '#2563eb', fontFamily: 'monospace' }}>{p.transaction_id}</td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ color: '#0f172a', fontWeight: '600' }}>{p.sender_name || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.sender_account || 'N/A'}</div>
                </td>
                <td style={{ padding: '14px 20px', fontWeight: '800', color: '#0f172a' }}>
                  ₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '14px 20px', color: '#64748b' }}>{p.payment_date}</td>
                <td style={{ padding: '14px 20px' }}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSelectDeposit(p); }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#4f46e5',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={14} />
                    <span>View Case</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Center Slide-Over Drawer */}
      {selectedCase && (
        <ActionCenterDrawer
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={fetchPaymentsAndCases}
        />
      )}

    </div>
  );
};
