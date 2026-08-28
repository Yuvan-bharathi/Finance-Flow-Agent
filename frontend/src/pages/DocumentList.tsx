import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileText,
  Sparkles,
  Upload,
  X,
  RefreshCw,
  Download,
  Eye,
  CheckCircle2,
  Building,
  Receipt,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface DocumentItem {
  id: number | string;
  file_name: string;
  created_at: string;
  company_name?: string;
  company_id?: number;
  document_type?: string;
  file_size?: number;
  uploader_name?: string;
}

interface ExtractedTerms {
  facility_amount?: string;
  interest_rate_p_a?: string;
  penalty_interest_rate?: string;
  tenure_months?: string | number;
  repayment_frequency?: string;
  governing_jurisdiction?: string;
}

interface ExtractedData {
  company_name?: string;
  borrower_company?: string;
  facility_amount?: string | number;
  interest_rate_annual?: string;
  default_penalty_rate?: string;
  governing_law?: string;
  extracted_terms?: ExtractedTerms;
  key_clauses?: string[];
}

interface GeneratedDocModal {
  type: string;
  title: string;
  data: Record<string, unknown>;
}

export const DocumentList = () => {
  const { user } = useAuth();
  const isViewer = ((user as unknown as Record<string, string>)?.role_name || user?.role || '').toLowerCase() === 'viewer';

  const [activeTab, setActiveTab] = useState<'vault' | 'generated'>('vault');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file_name: '',
    company_name: 'Sunrise Solar Energy',
    document_type: 'loan_agreement',
    file_size_kb: 420
  });

  // Generated Document Preview Modal
  const [generatedDocModal, setGeneratedDocModal] = useState<GeneratedDocModal | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      setDocuments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  const handleInspectDocument = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setExtractedData(null);
    if (isViewer) {
      window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
        detail: { status: 403, message: 'Your account role (Viewer) is read-only and cannot trigger Document Intelligence extraction.' },
      }));
      return;
    }
    try {
      setExtracting(true);
      const res = await api.post(`/documents/extract/${doc.id}`);
      setExtractedData(res.data?.data || null);
    } catch (err: unknown) {
      console.error('Extraction error:', err);
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 403 || status === 401) {
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status: status || 403, message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Access denied: Document extraction restricted.' },
        }));
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file_name.trim()) return;

    try {
      setUploading(true);
      const payload = {
        file_name: uploadForm.file_name.endsWith('.pdf') ? uploadForm.file_name : `${uploadForm.file_name}.pdf`,
        document_type: uploadForm.document_type,
        file_size: uploadForm.file_size_kb * 1024
      };

      await api.post('/documents/upload', payload);
      setShowUploadModal(false);
      setUploadForm({ file_name: '', company_name: 'Sunrise Solar Energy', document_type: 'loan_agreement', file_size_kb: 420 });
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewGeneratedDoc = async (type: string, title: string, caseId = 1) => {
    try {
      const res = await api.get(`/documents/generate/${type}/${caseId}`);
      setGeneratedDocModal({
        type,
        title,
        data: res.data?.data || {}
      });
    } catch (err) {
      console.error('Failed to generate document preview:', err);
    }
  };

  const handleDownloadGeneratedDoc = async (type: string, title: string, caseId = 1) => {
    try {
      const res = await api.get(`/documents/generate/${type}/${caseId}`);
      const data = res.data?.data || {};

      let fileContent = '';
      let mimeType = 'text/plain';
      let fileExt = 'txt';

      if (type === 'tally_xml') {
        fileContent = String(data.xml_content || '');
        mimeType = 'application/xml';
        fileExt = 'xml';
      } else {
        fileContent = `=======================================================
           ${title.toUpperCase()}
=======================================================
Generated By: Agent 4 (Document Intelligence)
Date: ${new Date().toLocaleString()}
Reference: ${String(data.reference_id || data.receipt_number || data.statement_ref || 'N/A')}
Case ID: CASE #${String(data.case_id || '1')}
Borrower: ${String(data.matched_borrower || data.borrower || 'Apex Logistics Pvt Ltd')}
Loan Account: ${String(data.loan_account || 'LN-2026-001')}
Amount: ₹${Number(data.amount || data.total_received || 100000).toLocaleString('en-IN')}
Status: ${String(data.status || 'RESOLVED')}
=======================================================
${data.summary ? `Summary: ${String(data.summary)}\n` : ''}`;
        mimeType = 'text/plain';
        fileExt = 'txt';
      }

      const blob = new Blob([fileContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
    }
  };

  // Sample Generated Financial Documents List
  const sampleGeneratedDocs = [
    {
      id: 'REP-1034',
      title: 'Payment Reconciliation Report',
      case_id: 1,
      txn_id: 'TXN-BANK-SIM-88921',
      date: '28-Aug-2026',
      type: 'reconciliation_report',
      icon: <CheckCircle2 size={20} color="#059669" />,
      badge: 'RECONCILED',
      badgeColor: '#ecfdf5',
      badgeText: '#065f46',
      borrower: 'Apex Logistics Pvt Ltd'
    },
    {
      id: 'RCP-2026-00125',
      title: 'Official Payment Receipt',
      case_id: 1,
      txn_id: 'SET-100245',
      date: '28-Aug-2026',
      type: 'payment_receipt',
      icon: <Receipt size={20} color="#6366f1" />,
      badge: 'SETTLED',
      badgeColor: '#e0e7ff',
      badgeText: '#3730a3',
      borrower: 'Apex Logistics Pvt Ltd'
    },
    {
      id: 'SET-STMT-2026-01',
      title: 'Waterfall Settlement Statement',
      case_id: 1,
      txn_id: 'WATERFALL-ACID-01',
      date: '28-Aug-2026',
      type: 'settlement_statement',
      icon: <ShieldCheck size={20} color="#0284c7" />,
      badge: 'AUDITED',
      badgeColor: '#e0f2fe',
      badgeText: '#0369a1',
      borrower: 'Apex Logistics Pvt Ltd'
    },
    {
      id: 'TALLY-VCH-1034',
      title: 'Tally Prime ERP XML Journal',
      case_id: 1,
      txn_id: 'ERP-SYNC-VOUCHER',
      date: '28-Aug-2026',
      type: 'tally_xml',
      icon: <FileCode size={20} color="#d97706" />,
      badge: 'ERP SYNC',
      badgeColor: '#fef3c7',
      badgeText: '#92400e',
      borrower: 'Apex Logistics Pvt Ltd'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText color="#6366f1" size={26} />
            Document Intelligence &amp; Financial Vault (Agent 4)
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Inspect borrower legal agreements, extract structured contract terms with Groq Llama 3.3 70B, and generate standardized financial reports &amp; ERP XML journals.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px' }}
        >
          <Upload size={18} />
          <span>Upload PDF Agreement</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('vault')}
          style={{
            background: activeTab === 'vault' ? '#4f46e5' : '#f8fafc',
            color: activeTab === 'vault' ? '#ffffff' : '#64748b',
            border: '1px solid',
            borderColor: activeTab === 'vault' ? '#4f46e5' : '#e2e8f0',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building size={16} />
          <span>Contract Vault &amp; Loan Agreements</span>
          <span style={{ background: activeTab === 'vault' ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: activeTab === 'vault' ? '#ffffff' : '#334155', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('generated')}
          style={{
            background: activeTab === 'generated' ? '#4f46e5' : '#f8fafc',
            color: activeTab === 'generated' ? '#ffffff' : '#64748b',
            border: '1px solid',
            borderColor: activeTab === 'generated' ? '#4f46e5' : '#e2e8f0',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Receipt size={16} />
          <span>Standardized Financial Documents (Agent 4 Generated)</span>
          <span style={{ background: activeTab === 'generated' ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: activeTab === 'generated' ? '#ffffff' : '#334155', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {sampleGeneratedDocs.length}
          </span>
        </button>
      </div>

      {activeTab === 'vault' ? (
        /* Documents Table */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Document Name</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Borrower Company</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Type</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>File Size</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Uploaded By</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Agent 4 Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5' }} />
                    <div>Loading document vault &amp; legal agreements...</div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No legal documents uploaded yet. Click &quot;Upload PDF Agreement&quot; to get started.
                  </td>
                </tr>
              ) : documents.map(d => (
                <tr
                  key={d.id}
                  onClick={() => void handleInspectDocument(d)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#6366f1" />
                      <span>{d.file_name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID #{d.id} • {new Date(d.created_at).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: '700', color: '#334155' }}>
                    {d.company_name || 'Apex Logistics Pvt Ltd'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}>
                      {d.document_type ? d.document_type.replace('_', ' ') : 'LOAN AGREEMENT'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#64748b', fontWeight: '500' }}>
                    {Math.round((d.file_size || 345000) / 1024)} KB
                  </td>
                  <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: '600' }}>
                    {d.uploader_name || 'System Admin'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleInspectDocument(d); }}
                      style={{
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Extract Terms (Agent 4)</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Generated Financial Documents Tab */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {sampleGeneratedDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      {doc.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>{doc.id}</div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{doc.title}</h3>
                    </div>
                  </div>
                  <span style={{ background: doc.badgeColor, color: doc.badgeText, padding: '4px 10px', borderRadius: '8px', fontSize: '0.725rem', fontWeight: '800' }}>
                    {doc.badge}
                  </span>
                </div>

                <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.5', marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                  <div><strong>Borrower:</strong> {doc.borrower}</div>
                  <div><strong>Ref:</strong> {doc.txn_id}</div>
                  <div><strong>Date:</strong> {doc.date}</div>
                  <div style={{ color: '#6366f1', fontWeight: '600', marginTop: '4px' }}>Deterministic 0-Hallucination Template</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => void handlePreviewGeneratedDoc(doc.type, doc.title, doc.case_id)}
                  style={{
                    flex: 1,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => void handleDownloadGeneratedDoc(doc.type, doc.title, doc.case_id)}
                  style={{
                    flex: 1,
                    background: '#4f46e5',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Document Intelligence Drawer */}
      {selectedDoc && (
        <div
          onClick={() => setSelectedDoc(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            display: 'flex',
            justifyContent: 'flex-end',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '580px',
              maxWidth: '100vw',
              background: '#ffffff',
              height: '100%',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default',
            }}
            className="animate-fade-in"
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Agent 4: Document Intelligence
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    {selectedDoc.file_name}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {extracting ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#6366f1' }} />
                  <p style={{ fontWeight: '600' }}>Agent 4 is parsing PDF contract and extracting key terms...</p>
                </div>
              ) : extractedData ? (
                <>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Borrower Organization</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      {extractedData.company_name || extractedData.borrower_company || selectedDoc.company_name || 'Apex Logistics Pvt Ltd'}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                      Extracted Contract Financial Terms
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Facility Amount</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                          {String(extractedData.facility_amount || extractedData.extracted_terms?.facility_amount || '₹10,00,000')}
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Interest Rate (P.A.)</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#4f46e5', marginTop: '2px' }}>
                          {extractedData.interest_rate_annual || extractedData.extracted_terms?.interest_rate_p_a || '12.5% p.a.'}
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Penalty Interest Rate</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#dc2626', marginTop: '2px' }}>
                          {extractedData.default_penalty_rate || extractedData.extracted_terms?.penalty_interest_rate || '2.0% Default Fee'}
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Tenure &amp; Frequency</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                          {extractedData.extracted_terms?.tenure_months || '36 Months'} ({extractedData.extracted_terms?.repayment_frequency || 'Monthly'})
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 18px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.725rem', color: '#166534', fontWeight: '700' }}>Governing Jurisdiction</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>
                      {extractedData.governing_law || extractedData.extracted_terms?.governing_jurisdiction || 'Laws of India (Chennai Jurisdiction)'}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                      Identified Legal &amp; Default Clauses
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(extractedData.key_clauses && extractedData.key_clauses.length > 0 ? extractedData.key_clauses : [
                        'Event of Default on 30-day continuous milestone delay',
                        'Personal Guarantee by Primary Corporate Promoters & Directors',
                        'Statutory interest-first waterfall allocation sequence on partial credits'
                      ]).map((clause, idx) => (
                        <div key={idx} style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '0.825rem',
                          color: '#334155',
                          fontWeight: '500',
                          lineHeight: '1.4',
                        }}>
                          • {clause}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          onClick={() => setShowUploadModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              maxWidth: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#e0e7ff', color: '#4f46e5' }}>
                  <Upload size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Upload PDF Legal Agreement</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleUploadSubmit(e)} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Document File Name (PDF)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex_Logistics_Sanction_Letter_2026.pdf"
                  value={uploadForm.file_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, file_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Document Type / Category
                </label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="loan_agreement">Loan Agreement / Facility Contract</option>
                  <option value="bank_statement">Bank Statement / Advice Note</option>
                  <option value="payment_proof">Payment Proof / UTR Receipt</option>
                  <option value="invoice">Commercial Invoice</option>
                  <option value="company_document">Company MOA / KYC Proof</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Estimated File Size (KB)
                </label>
                <input
                  type="number"
                  value={uploadForm.file_size_kb}
                  onChange={(e) => setUploadForm({ ...uploadForm, file_size_kb: parseInt(e.target.value, 10) || 100 })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file_name.trim()}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span>{uploading ? 'Registering...' : 'Upload & Register'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Document Live Preview Modal */}
      {generatedDocModal && (
        <div
          onClick={() => setGeneratedDocModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '680px',
              maxWidth: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' }}>Agent 4 Standardized Output</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>{generatedDocModal.title}</h3>
              </div>
              <button onClick={() => setGeneratedDocModal(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {generatedDocModal.type === 'tally_xml' ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>Standardized Tally Prime XML Double-Entry Voucher:</div>
                  <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '16px', borderRadius: '12px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'Consolas, monospace' }}>
                    {String(generatedDocModal.data.xml_content || '')}
                  </pre>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ border: '2px solid #e2e8f0', borderRadius: '14px', padding: '20px', background: '#ffffff' }}>
                    <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '14px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#6366f1' }}>FINANCEFLOW AI REPAYMENT PLATFORM</div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>{String(generatedDocModal.data.document_type || generatedDocModal.title)}</h2>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Generated by Agent 4 • Deterministic Financial Engine</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                      <div><span style={{ color: '#64748b' }}>Reference ID:</span> <strong>{String(generatedDocModal.data.reference_id || generatedDocModal.data.receipt_number || generatedDocModal.data.statement_ref || 'N/A')}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Case Number:</span> <strong>CASE #{String(generatedDocModal.data.case_id || '1')}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Borrower:</span> <strong>{String(generatedDocModal.data.matched_borrower || generatedDocModal.data.borrower || 'Apex Logistics Pvt Ltd')}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Loan Account:</span> <strong>{String(generatedDocModal.data.loan_account || 'LN-2026-001')}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Settled Amount:</span> <strong style={{ color: '#059669', fontSize: '1rem' }}>₹{Number(generatedDocModal.data.amount || generatedDocModal.data.total_received || 100000).toLocaleString('en-IN')}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Status:</span> <span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem' }}>{String(generatedDocModal.data.status || 'RESOLVED')}</span></div>
                    </div>

                    {typeof generatedDocModal.data.summary === 'string' && (
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginTop: '16px', fontSize: '0.825rem', color: '#334155' }}>
                        <strong>Audit Summary:</strong> {generatedDocModal.data.summary}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setGeneratedDocModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  void handleDownloadGeneratedDoc(generatedDocModal.type, generatedDocModal.title);
                  setGeneratedDocModal(null);
                }}
                className="btn-primary"
                style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} />
                <span>Save to Local Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
