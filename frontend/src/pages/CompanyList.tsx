import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Building2,
  Plus,
  X,
  ShieldCheck,
  ShieldAlert,
  Send,
  Bot,
  IndianRupee,
  CheckCircle,
  CheckCircle2,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { RiskAssessmentDrawer } from '../components/RiskAssessmentDrawer';
import { CollectionReminderModal } from '../components/CollectionReminderModal';
import { useAuth } from '../context/AuthContext';
import type { Company } from '../types/company';

export interface EnrichedCompanyLoan {
  id: number;
  loan_number: string;
  interest_rate: number | string;
  start_date: string;
  principal_amount: number | string;
  emis_paid?: number;
  total_emis?: number;
}

export interface EnrichedCompany extends Company {
  total_borrowed?: number | string;
  total_payable?: number | string;
  monthly_installment?: number | string;
  emis_paid?: number | string;
  emis_pending?: number | string;
  total_emis?: number | string;
  active_loans_count?: number;
  remaining_balance?: number | string;
  total_amount_paid?: number | string;
  loans?: EnrichedCompanyLoan[];
}

interface CompanyFormData {
  id?: number;
  company_name: string;
  registration_number: string;
  tax_identifier: string;
  bank_account_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  status: string;
}

interface CompanyListProps {
  onAskAI?: (recordType: string, recordId: string | number) => void;
}

export const CompanyList = ({ onAskAI }: CompanyListProps) => {
  const { user } = useAuth();
  const userRole = ((user as unknown as Record<string, string>)?.role_name || user?.role || '').toLowerCase();
  const canCreateCompany = ['owner', 'super_admin', 'admin', 'manager'].includes(userRole);
  const canEditCompany = ['owner', 'super_admin', 'admin', 'manager'].includes(userRole);
  const canDeleteCompany = ['owner', 'super_admin'].includes(userRole);

  const [companies, setCompanies] = useState<EnrichedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<EnrichedCompany | null>(null);

  // CRUD Edit & Delete States
  const [editingCompany, setEditingCompany] = useState<EnrichedCompany | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<EnrichedCompany | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Confirmation Dialog States
  const [pendingCreateData, setPendingCreateData] = useState<CompanyFormData | null>(null);
  const [pendingUpdateData, setPendingUpdateData] = useState<CompanyFormData | null>(null);

  // Multi-Agent Modal & Drawer states
  const [riskCompany, setRiskCompany] = useState<EnrichedCompany | null>(null);
  const [collectionCompany, setCollectionCompany] = useState<EnrichedCompany | null>(null);

  // Add Company Form states
  const [companyName, setCompanyName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bankAcc, setBankAcc] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Company Form state
  const [editForm, setEditForm] = useState<CompanyFormData>({
    company_name: '',
    registration_number: '',
    tax_identifier: '',
    bank_account_number: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    status: 'active',
  });

  const showToast = (type: 'success' | 'warning' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 6000);
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/companies');
      setCompanies((res.data?.data || []) as EnrichedCompany[]);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, []);

  const handleSelectCompany = async (company: EnrichedCompany) => {
    setSelectedCompany(company);
    try {
      const res = await api.get(`/companies/${company.id}`);
      if (res.data?.data) {
        setSelectedCompany(res.data.data as EnrichedCompany);
      }
    } catch (err) {
      console.error('Error fetching full company details:', err);
    }
  };

  // 1. Create Handlers
  const handleInitiateCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    if (!canCreateCompany) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Adding new corporate borrower profiles requires Admin or Risk Manager permissions.' },
      }));
      return;
    }

    setPendingCreateData({
      company_name: companyName,
      registration_number: regNumber,
      tax_identifier: taxId,
      bank_account_number: bankAcc,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      address: address,
      status: 'active',
    });
  };

  const handleConfirmCreate = async () => {
    if (!pendingCreateData) return;

    try {
      setSubmitting(true);
      await api.post('/companies', pendingCreateData);
      setPendingCreateData(null);
      setShowAddModal(false);
      setCompanyName('');
      setRegNumber('');
      setTaxId('');
      setBankAcc('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setAddress('');
      showToast('success', `✓ Successfully registered borrower company '${pendingCreateData.company_name}'.`);
      void fetchCompanies();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Access denied: You do not have permission to create companies.' },
        }));
      } else {
        showToast('error', `Failed to create company: ${(err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Edit Handlers
  const handleStartEdit = (company: EnrichedCompany) => {
    if (!canEditCompany) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Editing borrower profiles requires Admin or Risk Manager permissions.' },
      }));
      return;
    }
    setEditingCompany(company);
    setEditForm({
      id: company.id,
      company_name: company.company_name || '',
      registration_number: company.registration_number || '',
      tax_identifier: company.tax_identifier || '',
      bank_account_number: company.bank_account_number || '',
      contact_name: company.contact_name || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      address: company.address || '',
      status: company.status || 'active',
    });
  };

  const handleInitiateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editForm.company_name.trim()) return;
    setPendingUpdateData({ id: editingCompany.id, ...editForm });
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdateData || !pendingUpdateData.id) return;

    try {
      setSubmitting(true);
      await api.put(`/companies/${pendingUpdateData.id}`, pendingUpdateData);
      showToast('success', `✓ Updated profile for '${pendingUpdateData.company_name}' successfully.`);
      setPendingUpdateData(null);
      setEditingCompany(null);
      void fetchCompanies();
      if (selectedCompany && selectedCompany.id === pendingUpdateData.id) {
        setSelectedCompany(prev => (prev ? ({ ...prev, ...pendingUpdateData } as EnrichedCompany) : null));
      }
    } catch (err: unknown) {
      console.error('Update company error:', err);
      showToast('error', `Failed to update company: ${(err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Delete Handlers
  const handleDeletePrompt = (company: EnrichedCompany) => {
    if (!canDeleteCompany) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Company deletion is strictly restricted to Super Admin and Owner accounts.' },
      }));
      return;
    }
    setDeletingCompany(company);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;

    try {
      setDeleteLoading(true);
      const res = await api.delete(`/companies/${deletingCompany.id}`);
      const data = res.data?.data;

      if (data?.action === 'deactivated') {
        showToast('warning', `⚠️ ${res.data?.message || `Company '${deletingCompany.company_name}' has associated loan facilities and has been safely archived/deactivated.`}`);
      } else {
        showToast('success', `✓ ${res.data?.message || `Company '${deletingCompany.company_name}' was successfully deleted.`}`);
      }

      setDeletingCompany(null);
      if (selectedCompany && selectedCompany.id === deletingCompany.id) {
        setSelectedCompany(null);
      }
      void fetchCompanies();
    } catch (err: unknown) {
      console.error('Delete company error:', err);
      showToast('error', `Failed to delete company: ${(err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatRupees = (amount: number | string | undefined) => {
    const num = parseFloat(String(amount || 0));
    if (isNaN(num)) return '₹0.00';
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 120,
          background: toastMessage.type === 'success' ? '#065f46' : toastMessage.type === 'warning' ? '#92400e' : '#991b1b',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          fontWeight: '700',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} color="#4f46e5" />
            <span>Borrowing Companies Master Data</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Corporate borrower profiles, real-time EMI tracking, credit risk health (Agent 2), and automated collections (Agent 3).
          </p>
        </div>

        {canCreateCompany && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Add Borrower Company</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Company Name</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Amount Borrowed</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Monthly Installment (EMI)</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>EMI Progress</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Remaining Balance</th>
                <th style={{ padding: '14px 20px', fontWeight: '800' }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', textAlign: 'right', minWidth: '200px' }}>AI Agents &amp; Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5', display: 'block' }} />
                    <div>Loading company records &amp; amortization schedules...</div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <ShieldAlert size={30} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>No borrowing companies registered yet.</div>
                    <div style={{ fontSize: '0.78rem' }}>Click &quot;+ Add Borrower Company&quot; above to register your first corporate account.</div>
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const totalEmis = parseInt(String(c.total_emis || 0), 10);
                  const emisPaid = parseInt(String(c.emis_paid || 0), 10);
                  const emisPending = parseInt(String(c.emis_pending || 0), 10);
                  const percentPaid = totalEmis > 0 ? Math.round((emisPaid / totalEmis) * 100) : 0;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => void handleSelectCompany(c)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem' }}>
                          {c.company_name}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                          ID #{c.id} • {c.registration_number || 'REG-PENDING'}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {formatRupees(c.total_borrowed)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          Payable: {formatRupees(c.total_payable)}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#4f46e5' }}>
                          {formatRupees(c.monthly_installment)} / mo
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {c.active_loans_count || 0} Active Loan(s)
                        </div>
                      </td>

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

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: parseFloat(String(c.remaining_balance || 0)) > 0 ? '#dc2626' : '#059669' }}>
                          {formatRupees(c.remaining_balance)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#059669', fontWeight: '600' }}>
                          Paid: {formatRupees(c.total_amount_paid)}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <StatusBadge status={c.status} />
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setRiskCompany(c)}
                            title="Audit credit risk profile (Agent 2)"
                            style={{
                              background: '#e0e7ff',
                              border: '1px solid #c7d2fe',
                              color: '#3730a3',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldAlert size={13} />
                            <span>Risk</span>
                          </button>

                          <button
                            onClick={() => setCollectionCompany(c)}
                            title="Draft collection email (Agent 3)"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#991b1b',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Send size={13} />
                            <span>Notice</span>
                          </button>

                          {canEditCompany && (
                            <button
                              onClick={() => handleStartEdit(c)}
                              title="Edit company master details"
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#059669',
                                borderRadius: '8px',
                                width: '28px',
                                height: '28px',
                                padding: '0',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.1s ease, border-color 0.1s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.borderColor = '#10b981'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                              <Pencil size={14} color="#059669" />
                            </button>
                          )}

                          {canDeleteCompany && (
                            <button
                              onClick={() => handleDeletePrompt(c)}
                              title="Delete or deactivate company (Owner & Super Admin only)"
                              style={{
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                color: '#e11d48',
                                borderRadius: '8px',
                                width: '28px',
                                height: '28px',
                                padding: '0',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.1s ease, background 0.1s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = '#ffe4e6'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#fff1f2'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onAskAI?.('company', c.id);
                            }}
                            title="Ask AI Assistant to audit this company"
                            style={{
                              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              width: '28px',
                              height: '28px',
                              padding: '0',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
                              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
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
      </div>

      {/* Selected Company Drawer */}
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
            cursor: 'pointer',
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
              cursor: 'default',
            }}
            className="drawer-panel animate-fade-in"
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>{selectedCompany.company_name}</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Borrower Profile ID #{selectedCompany.id} • Status: <strong style={{ color: '#059669', textTransform: 'uppercase' }}>{selectedCompany.status}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {canEditCompany && (
                  <button
                    onClick={() => {
                      const c = selectedCompany;
                      setSelectedCompany(null);
                      handleStartEdit(c);
                    }}
                    title="Edit company"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#059669',
                      borderRadius: '8px',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Pencil size={15} color="#059669" />
                  </button>
                )}
                {canDeleteCompany && (
                  <button
                    onClick={() => {
                      const c = selectedCompany;
                      setSelectedCompany(null);
                      handleDeletePrompt(c);
                    }}
                    title="Delete company"
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      borderRadius: '8px',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button onClick={() => setSelectedCompany(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color="#64748b" />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                border: '1.5px solid #bfdbfe',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dbeafe', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IndianRupee size={18} color="#1d4ed8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e3a8a' }}>Borrowing &amp; EMI Breakdown</div>
                      <div style={{ fontSize: '0.725rem', color: '#3b82f6' }}>Active credit facilities &amp; installment status</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '9999px' }}>
                    {selectedCompany.active_loans_count || (selectedCompany.loans?.length || 1)} Loan Facility
                  </span>
                </div>

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

                  {(() => {
                    const total = parseInt(String(selectedCompany.total_emis || 0), 10);
                    const paid = parseInt(String(selectedCompany.emis_paid || 0), 10);
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

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#14532d' }}>Registered Bank Account Verified</div>
                  <code style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: '700' }}>{selectedCompany.bank_account_number || 'Unlinked Account'}</code>
                </div>
              </div>

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
                    onAskAI?.('company', cid);
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
          onOpenCollectionModal={(c) => setCollectionCompany(c as EnrichedCompany)}
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '520px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#4f46e5" />
                <span>Add Borrowing Company</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleInitiateCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Company Name *</label>
                <input required type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Financials Pvt Ltd" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Registration No.</label>
                  <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="e.g. REG-2026-ACM100" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Tax Identifier (GST/PAN)</label>
                  <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="e.g. TAX-IN-998822" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Registered Bank Account Number</label>
                <input type="text" value={bankAcc} onChange={e => setBankAcc(e.target.value)} placeholder="e.g. 556677889900" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Person</label>
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Rajesh Kumar" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Corporate Contact Email</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="e.g. finance@company.com" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Phone</label>
                <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="e.g. +91 9876543210" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Corporate Office Address</label>
                <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 102 Business Tower, Sector 5, Bengaluru" style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Save Company
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div
          onClick={() => setEditingCompany(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '540px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={18} color="#059669" />
                  <span>Edit Company Profile</span>
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Updating master records for ID #{editingCompany.id}
                </div>
              </div>
              <button onClick={() => setEditingCompany(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleInitiateUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Company Name *</label>
                <input
                  required
                  type="text"
                  value={editForm.company_name}
                  onChange={e => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Registration No.</label>
                  <input
                    type="text"
                    value={editForm.registration_number}
                    onChange={e => setEditForm(prev => ({ ...prev, registration_number: e.target.value }))}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Tax Identifier (GST/PAN)</label>
                  <input
                    type="text"
                    value={editForm.tax_identifier}
                    onChange={e => setEditForm(prev => ({ ...prev, tax_identifier: e.target.value }))}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Bank Account Number</label>
                  <input
                    type="text"
                    value={editForm.bank_account_number}
                    onChange={e => setEditForm(prev => ({ ...prev, bank_account_number: e.target.value }))}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Archived</option>
                    <option value="watchlist">Watchlist</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Person</label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={e => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Corporate Email</label>
                  <input
                    type="email"
                    value={editForm.contact_email}
                    onChange={e => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Contact Phone</label>
                <input
                  type="text"
                  value={editForm.contact_phone}
                  onChange={e => setEditForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Corporate Office Address</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '8px', marginTop: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  Update Company Profile
                </button>
                <button type="button" onClick={() => setEditingCompany(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Create */}
      {pendingCreateData && (
        <div
          onClick={() => setPendingCreateData(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', width: '460px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HelpCircle size={22} color="#2563eb" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Confirm New Borrower Registration
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Please review before saving to master records
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to register <strong>{pendingCreateData.company_name}</strong> in the borrowing master registry?
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontSize: '0.775rem', color: '#334155', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Registration No:</strong> {pendingCreateData.registration_number || 'N/A'}</div>
              <div><strong>Bank Account:</strong> {pendingCreateData.bank_account_number || 'N/A'}</div>
              <div><strong>Contact Person:</strong> {pendingCreateData.contact_name || 'N/A'} ({pendingCreateData.contact_email || 'No email'})</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => void handleConfirmCreate()}
                disabled={submitting}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Yes, Confirm &amp; Register</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPendingCreateData(null)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Update */}
      {pendingUpdateData && (
        <div
          onClick={() => setPendingUpdateData(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '16px', width: '460px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={22} color="#059669" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Confirm Profile Updates
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                  Saving changes for ID #{pendingUpdateData.id}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to commit these changes for <strong>{pendingUpdateData.company_name}</strong>?
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontSize: '0.775rem', color: '#334155', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: '700', color: '#059669' }}>{pendingUpdateData.status}</span></div>
              <div><strong>Contact Email:</strong> {pendingUpdateData.contact_email}</div>
              <div><strong>Bank Account:</strong> {pendingUpdateData.bank_account_number}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => void handleConfirmUpdate()}
                disabled={submitting}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    <span>Confirm &amp; Save Changes</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPendingUpdateData(null)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCompany && (
        <div
          onClick={() => setDeletingCompany(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '16px', width: '460px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', cursor: 'default' }}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Confirm Company Deletion
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700', marginTop: '2px' }}>
                  Super Admin / Owner Authorization Required
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to delete or deactivate <strong>{deletingCompany.company_name}</strong> (ID #{deletingCompany.id})?
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontSize: '0.775rem', color: '#64748b', marginBottom: '16px' }}>
              <strong style={{ color: '#334155' }}>Financial Integrity Rule:</strong> If active loans or historical repayment records exist, this facility will be safely deactivated/archived to preserve ledger schedules.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => void handleConfirmDelete()}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Deletion</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyList;
