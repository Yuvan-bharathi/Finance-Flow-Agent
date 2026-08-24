import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Building2,
  Plus,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  Eye,
  X,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Send,
  Bot,
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { RiskAssessmentDrawer } from '../components/RiskAssessmentDrawer';
import { CollectionReminderModal } from '../components/CollectionReminderModal';
import { useAuth } from '../context/AuthContext';

export const CompanyList = ({ onAskAI }) => {
  const { user } = useAuth();
  const userRole = (user?.role_name || user?.role || '').toLowerCase();
  const isViewer = userRole === 'viewer';
  const canCreateCompany = ['owner', 'super_admin', 'admin', 'manager'].includes(userRole);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetailsLoading, setCompanyDetailsLoading] = useState(false);
  
  // Multi-Agent Modal & Drawer states
  const [riskCompany, setRiskCompany] = useState(null);
  const [collectionCompany, setCollectionCompany] = useState(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bankAcc, setBankAcc] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/companies');
      setCompanies(res.data.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSelectCompany = async (company) => {
    setSelectedCompany(company);
    try {
      setCompanyDetailsLoading(true);
      const res = await api.get(`/companies/${company.id}`);
      if (res.data.data) {
        setSelectedCompany(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching full company details:', err);
    } finally {
      setCompanyDetailsLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    if (!canCreateCompany) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Adding new corporate borrower profiles requires Admin or Risk Manager permissions.' }
      }));
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/companies', {
        company_name: companyName,
        registration_number: regNumber,
        tax_identifier: taxId,
        bank_account_number: bankAcc,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone
      });
      setShowAddModal(false);
      setCompanyName('');
      setRegNumber('');
      setTaxId('');
      setBankAcc('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      fetchCompanies();
    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: err.response?.data?.message || 'Access denied: You do not have permission to create companies.' }
        }));
      } else {
        alert(err.response?.data?.message || 'Failed to create company');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupees = (amount) => {
    if (!amount || isNaN(amount)) return '₹0.00';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 color="#4f46e5" size={26} />
            Borrowing Companies Master Data
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Corporate borrower profiles, real-time EMI tracking, credit risk health (Agent 2), and automated collections (Agent 3).
          </p>
        </div>

        <button
          onClick={() => {
            if (!canCreateCompany) {
              window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
                detail: { status: 403, message: 'Adding new corporate borrower profiles requires Admin or Risk Manager permissions.' }
              }));
              return;
            }
            setShowAddModal(true);
          }}
          disabled={!canCreateCompany}
          title={!canCreateCompany ? 'Adding borrower profiles requires Admin or Manager permissions' : 'Add Borrower Company'}
          style={{
            background: !canCreateCompany ? '#cbd5e1' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: !canCreateCompany ? '#94a3b8' : '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: !canCreateCompany ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: !canCreateCompany ? 0.75 : 1
          }}
        >
          <Plus size={18} />
          <span>{canCreateCompany ? 'Add Borrower Company' : 'Add Borrower (Locked)'}</span>
        </button>
      </div>

      {/* Companies Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '940px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Company Name</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Amount Borrowed</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Monthly Installment (EMI)</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>EMI Progress</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Remaining Balance</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>AI Agents & Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading companies...</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No borrowing companies registered yet.</td></tr>
              ) : (
                companies.map(c => {
                  const totalEmis = parseInt(c.total_emis || 0, 10);
                  const emisPaid = parseInt(c.emis_paid || 0, 10);
                  const emisPending = parseInt(c.emis_pending || 0, 10);
                  const percentPaid = totalEmis > 0 ? Math.round((emisPaid / totalEmis) * 100) : 0;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCompany(c)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.company_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ID #{c.id} • {c.registration_number || c.tax_identifier || 'Reg Verified'}
                        </div>
                      </td>

                      {/* Borrowed Principal Amount */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {formatRupees(c.total_borrowed)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          Payable: {formatRupees(c.total_payable)}
                        </div>
                      </td>

                      {/* Monthly Installment */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#4f46e5' }}>
                          {formatRupees(c.monthly_installment)} / mo
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {c.active_loans_count || 1} Active Loan(s)
                        </div>
                      </td>

                      {/* EMI Status Progress */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>
                            {emisPaid} Paid
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: emisPending > 0 ? '#d97706' : '#64748b', background: emisPending > 0 ? '#fef3c7' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {emisPending} Left
                          </span>
                        </div>
                        <div style={{ width: '120px', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentPaid}%`, height: '100%', background: percentPaid === 100 ? '#10b981' : '#4f46e5', borderRadius: '4px' }} />
                        </div>
                      </td>

                      {/* Remaining Balance */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: parseFloat(c.remaining_balance || 0) > 0 ? '#dc2626' : '#059669' }}>
                          {formatRupees(c.remaining_balance)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#059669', fontWeight: '600' }}>
                          Paid: {formatRupees(c.total_amount_paid)}
                        </div>
                      </td>

                      {/* Company Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          
                          {/* Agent 2: Assess Risk Button */}
                          <button
                            onClick={() => setRiskCompany(c)}
                            style={{
                              background: '#e0e7ff',
                              border: '1px solid #c7d2fe',
                              color: '#3730a3',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ShieldAlert size={14} />
                            <span>Risk (Agent 2)</span>
                          </button>

                          {/* Agent 3: Collection Reminder Button */}
                          <button
                            onClick={() => setCollectionCompany(c)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#991b1b',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Send size={14} />
                            <span>Collection</span>
                          </button>

                          {/* Ask AI / Investigate Company Button */}
                          <button
                            onClick={() => {
                              if (onAskAI) onAskAI('company', c.id);
                            }}
                            title="Ask AI to investigate this company"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(124,58,237,0.25)'
                            }}
                          >
                            <Bot size={14} />
                            <span>Ask AI</span>
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

      {/* Selected Company Slide-Over Drawer with Complete Borrowing & EMI Breakdown */}
      {selectedCompany && (
        <div
          onClick={() => setSelectedCompany(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'flex-end',
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '560px',
              maxWidth: '100vw',
              background: '#ffffff',
              height: '100%',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default'
            }}
            className="drawer-panel animate-fade-in"
          >
            
            {/* Drawer Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{selectedCompany.company_name}</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Borrower Profile ID #{selectedCompany.id} • Status: <strong style={{ color: '#059669', textTransform: 'uppercase' }}>{selectedCompany.status}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. Loan Borrowing & EMI Financial Summary Card */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                border: '1.5px solid #bfdbfe',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dbeafe', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IndianRupee size={18} color="#1d4ed8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e3a8a' }}>Borrowing & EMI Breakdown</div>
                      <div style={{ fontSize: '0.725rem', color: '#3b82f6' }}>Active credit facilities & installment status</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '9999px' }}>
                    {selectedCompany.active_loans_count || (selectedCompany.loans?.length || 1)} Loan Facility
                  </span>
                </div>

                {/* Primary Borrowing Numbers Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Amount Borrowed (Principal)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      {formatRupees(selectedCompany.total_borrowed)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                      Total Repayable: <strong style={{ color: '#334155' }}>{formatRupees(selectedCompany.total_payable)}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.725rem', color: '#4f46e5', fontWeight: '700', textTransform: 'uppercase' }}>Monthly Installment (EMI)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4f46e5', marginTop: '2px' }}>
                      {formatRupees(selectedCompany.monthly_installment)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6366f1', marginTop: '2px', fontWeight: '600' }}>
                      Monthly Scheduled Due
                    </div>
                  </div>
                </div>

                {/* EMI Progress Counts Banner */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Installment Progress:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '0.775rem', fontWeight: '800', color: '#059669', background: '#d1fae5', padding: '3px 8px', borderRadius: '6px' }}>
                        ✓ {selectedCompany.emis_paid || 0} EMIs Paid
                      </span>
                      <span style={{ fontSize: '0.775rem', fontWeight: '800', color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px' }}>
                        ⏳ {selectedCompany.emis_pending || 0} Yet to Pay
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  {(() => {
                    const total = parseInt(selectedCompany.total_emis || 0, 10);
                    const paid = parseInt(selectedCompany.emis_paid || 0, 10);
                    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                    return (
                      <div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #4f46e5, #10b981)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', marginTop: '4px' }}>
                          <span>{pct}% Total Repaid ({formatRupees(selectedCompany.total_amount_paid)})</span>
                          <span>Remaining Balance: <strong style={{ color: '#dc2626' }}>{formatRupees(selectedCompany.remaining_balance)}</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Individual Loan Contracts Details (if returned) */}
                {selectedCompany.loans && selectedCompany.loans.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #dbeafe', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase' }}>
                      Loan Facility Contracts
                    </div>
                    {selectedCompany.loans.map(loan => (
                      <div key={loan.id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ color: '#4f46e5' }}>{loan.loan_number}</strong>
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>Rate: {loan.interest_rate}% p.a. • Start: {loan.start_date}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{formatRupees(loan.principal_amount)}</div>
                          <div style={{ fontSize: '0.725rem', color: '#059669', fontWeight: '700' }}>
                            {loan.emis_paid || 0} / {loan.total_emis || 0} EMIs Paid
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* 2. Bank Account Verification Card */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#14532d' }}>Registered Bank Account Verified</div>
                  <code style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: '700' }}>{selectedCompany.bank_account_number || 'Unlinked Account'}</code>
                </div>
              </div>

              {/* 3. Master Profile Information Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong style={{ color: '#475569' }}>Registration Number:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.registration_number || 'N/A'}</span></div>
                <div><strong style={{ color: '#475569' }}>Tax Identifier (GST/PAN):</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.tax_identifier || 'N/A'}</span></div>
                <div><strong style={{ color: '#475569' }}>Contact Person:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.contact_name || 'N/A'}</span></div>
                <div><strong style={{ color: '#475569' }}>Contact Email:</strong> <span style={{ color: '#2563eb', fontWeight: '600' }}>{selectedCompany.contact_email}</span></div>
                <div><strong style={{ color: '#475569' }}>Contact Phone:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.contact_phone || 'N/A'}</span></div>
                {selectedCompany.address && (
                  <div><strong style={{ color: '#475569' }}>Registered Address:</strong> <span style={{ color: '#0f172a', fontWeight: '500' }}>{selectedCompany.address}</span></div>
                )}
              </div>

              {/* 4. Multi-Agent Action Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => { const c = selectedCompany; setSelectedCompany(null); setRiskCompany(c); }}
                  style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <ShieldAlert size={14} />
                  <span>Risk Health</span>
                </button>

                <button
                  onClick={() => { const c = selectedCompany; setSelectedCompany(null); setCollectionCompany(c); }}
                  style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Send size={14} />
                  <span>Send Notice</span>
                </button>

                <button
                  onClick={() => {
                    const cid = selectedCompany.id;
                    setSelectedCompany(null);
                    if (onAskAI) onAskAI('company', cid);
                  }}
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Bot size={14} />
                  <span>Ask AI</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Agent 2 Risk Assessment Drawer */}
      {riskCompany && (
        <RiskAssessmentDrawer
          company={riskCompany}
          onClose={() => setRiskCompany(null)}
          onOpenCollectionModal={(c) => setCollectionCompany(c)}
        />
      )}

      {/* Agent 3 Collection Reminder Modal */}
      {collectionCompany && (
        <CollectionReminderModal
          company={collectionCompany}
          onClose={() => setCollectionCompany(null)}
        />
      )}

      {/* Add Company Modal */}
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Add Borrowing Company</h3>

            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Company Name *</label>
                <input required type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Financials Pvt Ltd" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Registration No.</label>
                  <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Tax Identifier (GST/PAN)</label>
                  <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Registered Bank Account Number</label>
                <input type="text" value={bankAcc} onChange={e => setBankAcc(e.target.value)} placeholder="e.g. 556677889900" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Person</label>
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Email</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Phone</label>
                <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="e.g. +91 9876543210" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>Save Company</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
