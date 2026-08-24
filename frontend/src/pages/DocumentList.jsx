import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Sparkles, Eye, Download, Upload, CheckCircle2, Building2, Calendar, ShieldCheck, X, RefreshCw } from 'lucide-react';

/**
 * Documents Master Tab Sub-Page & Agent 4: Document Intelligence Inspector
 * 
 * Called by:
 * - Dashboard.jsx
 */
export const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [extracting, setExtracting] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleInspectDocument = async (doc) => {
    setSelectedDoc(doc);
    setExtractedData(null);
    try {
      setExtracting(true);
      const res = await api.post(`/documents/extract/${doc.id}`);
      setExtractedData(res.data.data);
    } catch (err) {
      console.error('Error extracting terms:', err);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText color="#6366f1" size={26} />
            Document Intelligence & Contract Vault (Agent 4)
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Inspect uploaded borrower agreements and extract key financial terms, interest rates, penalty rates, and legal clauses automatically.
          </p>
        </div>

        <button className="btn-primary">
          <Upload size={18} />
          <span>Upload PDF Agreement</span>
        </button>
      </div>

      {/* Documents Table */}
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
              <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading document vault...</td></tr>
            ) : documents.map(d => (
              <tr
                key={d.id}
                onClick={() => handleInspectDocument(d)}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                    textTransform: 'uppercase'
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
                    onClick={(e) => { e.stopPropagation(); handleInspectDocument(d); }}
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
                      gap: '6px'
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

      {/* Selected Document Intelligence Slide-Over Drawer */}
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
            cursor: 'pointer'
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

            {/* Drawer Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {extracting ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#6366f1' }} />
                  <p style={{ fontWeight: '600' }}>Agent 4 is parsing PDF contract and extracting key terms...</p>
                </div>
              ) : extractedData ? (
                <>
                  {/* Company Summary Banner */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Borrower Organization</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{extractedData.borrower_company}</div>
                  </div>

                  {/* Extracted Key Financial Terms Grid */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                      Extracted Contract Financial Terms
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Facility Amount</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{extractedData.extracted_terms?.facility_amount}</div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Interest Rate (P.A.)</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#4f46e5', marginTop: '2px' }}>{extractedData.extracted_terms?.interest_rate_p_a}</div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Penalty Interest Rate</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#dc2626', marginTop: '2px' }}>{extractedData.extracted_terms?.penalty_interest_rate}</div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>Tenure & Frequency</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{extractedData.extracted_terms?.tenure_months} ({extractedData.extracted_terms?.repayment_frequency})</div>
                      </div>

                    </div>
                  </div>

                  {/* Governing Jurisdiction */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 18px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.725rem', color: '#166534', fontWeight: '700' }}>Governing Jurisdiction</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>{extractedData.extracted_terms?.governing_jurisdiction}</div>
                  </div>

                  {/* Identified Key Legal Clauses */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                      Identified Legal & Default Clauses
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {extractedData.key_clauses?.map((clause, idx) => (
                        <div key={idx} style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '0.825rem',
                          color: '#334155',
                          fontWeight: '500',
                          lineHeight: '1.4'
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

    </div>
  );
};
