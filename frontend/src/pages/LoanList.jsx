import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileSpreadsheet, Plus, Calendar, DollarSign, ChevronRight, Eye } from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';

export const LoanList = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [companyId, setCompanyId] = useState('');
  const [loanNumber, setLoanNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('10');
  const [tenureMonths, setTenureMonths] = useState('10');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans');
      setLoans(res.data.data || []);
      const compRes = await api.get('/companies');
      setCompanies(compRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleFetchLoanDetails = async (loanId) => {
    try {
      const res = await api.get(`/loans/${loanId}`);
      setSelectedLoan(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!companyId || !loanNumber || !principalAmount || !startDate) return;

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
      fetchLoans();
      setSelectedLoan(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Loan creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet color="#059669" size={26} />
            Loan Facilities & Repayment Breakdown
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Active borrowing contracts and automated monthly installment payment schedules.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} />
          <span>Create Loan Facility</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedLoan ? '1fr 1fr' : '1fr', gap: '24px' }}>
        
        {/* Loans Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>
            Active Loan Contracts
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Loan Number</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Borrower Company</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Total Payable</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: '700', textAlign: 'right' }}>Schedule</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading loans...</td></tr>
              ) : loans.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '700', color: '#6366f1' }}>{l.loan_number}</td>
                  <td style={{ padding: '14px 20px', color: '#0f172a', fontWeight: '600' }}>{l.company_name}</td>
                  <td style={{ padding: '14px 20px', fontWeight: '800', color: '#059669' }}>
                    ₹{parseFloat(l.total_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <StatusBadge status={l.status} />
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button onClick={() => handleFetchLoanDetails(l.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Loan Schedule Details */}
        {selectedLoan && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>Schedule for {selectedLoan.loan_number}</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedLoan.company_name}</p>
              </div>
              <button onClick={() => setSelectedLoan(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '700' }}>Close</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {selectedLoan.schedule && selectedLoan.schedule.map(inst => (
                <div key={inst.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>Installment #{inst.installment_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Due: {inst.due_date}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#059669' }}>₹{parseFloat(inst.scheduled_amount).toLocaleString()}</div>
                    <StatusBadge status={inst.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Add Loan Modal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '480px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Create Loan Facility</h3>

            <form onSubmit={handleCreateLoan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Borrower Company *</label>
                <select required value={companyId} onChange={e => setCompanyId(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}>
                  <option value="">Select Borrower Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Loan Number *</label>
                <input required type="text" value={loanNumber} onChange={e => setLoanNumber(e.target.value)} placeholder="e.g. LN-2026-003" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Principal Amount (₹) *</label>
                  <input required type="number" value={principalAmount} onChange={e => setPrincipalAmount(e.target.value)} placeholder="e.g. 500000" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Interest Rate (%)</label>
                  <input type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Tenure (Months)</label>
                  <input type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Start Date *</label>
                  <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>Create Loan & Schedule</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
