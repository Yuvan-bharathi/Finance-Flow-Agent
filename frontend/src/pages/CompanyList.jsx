import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Plus, Phone, Mail, FileText, CheckCircle, Eye, X, CreditCard, ShieldCheck, ShieldAlert, Send, Bot } from 'lucide-react';
import { StatusBadge } from '../components/Dashboard/StatusBadge';
import { RiskAssessmentDrawer } from '../components/RiskAssessmentDrawer';
import { CollectionReminderModal } from '../components/CollectionReminderModal';

export const CompanyList = ({ onAskAI }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;

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
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Company creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 color="#7c3aed" size={26} />
            Borrowing Companies Master Directory
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Manage corporate borrower profiles, credit risk health (Agent 2), and automated collection notices (Agent 3).
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} />
          <span>Add Borrower Company</span>
        </button>
      </div>

      {/* Companies Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Company Name</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Reg & Tax ID</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Registered Bank Account</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Contact Person</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Active Loans</th>
              <th style={{ padding: '16px 20px', fontWeight: '700' }}>Status</th>
              <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>AI Agents & Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading companies...</td></tr>
            ) : companies.map(c => (
              <tr
                key={c.id}
                onClick={() => setSelectedCompany(c)}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.company_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID #{c.id}</div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ color: '#334155', fontWeight: '500' }}>{c.registration_number || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.tax_identifier || 'N/A'}</div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <code style={{ color: '#6366f1', fontWeight: '700', fontSize: '0.85rem' }}>{c.bank_account_number || 'Unlinked'}</code>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ color: '#0f172a', fontWeight: '500' }}>{c.contact_name || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.contact_email}</div>
                </td>
                <td style={{ padding: '16px 20px', fontWeight: '700', color: '#2563eb' }}>
                  {c.total_loans || 0} Facilities
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <StatusBadge status={c.status} />
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    
                    {/* Agent 2: Assess Risk Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setRiskCompany(c); }}
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
                      onClick={(e) => { e.stopPropagation(); setCollectionCompany(c); }}
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
                      <span>Collection (Agent 3)</span>
                    </button>

                    {/* Ask AI / Investigate Company Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Company Slide-Over Drawer */}
      {selectedCompany && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '520px',
            maxWidth: '100vw',
            background: '#ffffff',
            height: '100%',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column'
          }} className="animate-fade-in">
            
            {/* Drawer Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{selectedCompany.company_name}</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Borrower Profile ID #{selectedCompany.id}</div>
              </div>
              <button onClick={() => setSelectedCompany(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Bank Account Verification Card */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#14532d' }}>Registered Bank Account Verified</div>
                  <code style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: '700' }}>{selectedCompany.bank_account_number || 'Unlinked Account'}</code>
                </div>
              </div>

              {/* Master Profile Fields */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong style={{ color: '#475569' }}>Registration Number:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.registration_number || 'N/A'}</span></div>
                <div><strong style={{ color: '#475569' }}>Tax Identifier (GST/PAN):</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.tax_identifier || 'N/A'}</span></div>
                <div><strong style={{ color: '#475569' }}>Contact Person:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.contact_name || 'N/A'}</span></div>
                <div><strong style={{ color: '#475569' }}>Contact Email:</strong> <span style={{ color: '#2563eb', fontWeight: '600' }}>{selectedCompany.contact_email}</span></div>
                <div><strong style={{ color: '#475569' }}>Contact Phone:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedCompany.contact_phone || 'N/A'}</span></div>
              </div>

              {/* Multi-Agent Action Buttons inside Drawer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => { setSelectedCompany(null); setRiskCompany(selectedCompany); }}
                  style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <ShieldAlert size={14} />
                  <span>Risk Health</span>
                </button>

                <button
                  onClick={() => { setSelectedCompany(null); setCollectionCompany(selectedCompany); }}
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
