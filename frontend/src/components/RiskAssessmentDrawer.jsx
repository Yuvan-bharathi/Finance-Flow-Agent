import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle, TrendingDown, RefreshCw, FileText } from 'lucide-react';
import api from '../services/api';

// Simple in-memory risk assessment cache with 2-minute TTL
const riskCache = {};

/**
 * Slide-Over Inspection Drawer for Agent 2: Repayment Risk Assessment Agent
 * Includes client-side 2-minute cache to prevent repeated API calls for the same company.
 * 
 * Called by:
 * - CompanyList.jsx
 */
export const RiskAssessmentDrawer = ({ company, onClose, onOpenCollectionModal }) => {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchRiskAssessment = async () => {
    // Check cache first (2-minute TTL)
    const cacheKey = `risk_${company.id}`;
    const cached = riskCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 120000)) {
      setRiskData(cached.data);
      setLoading(false);
      return;
    }

    // Cancel any pending request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/risk/assess/${company.id}`, {
        signal: controller.signal
      });
      const data = res.data.data;
      // Store in cache
      riskCache[cacheKey] = { data, timestamp: Date.now() };
      setRiskData(data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return; // Aborted
      console.error('Error fetching risk assessment:', err);
      setError('Unable to perform credit risk assessment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) fetchRiskAssessment();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [company]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getRiskBadgeColor = (level) => {
    switch (level) {
      case 'CRITICAL': return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
      case 'HIGH': return { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' };
      case 'MEDIUM': return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      default: return { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' };
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 90,
        cursor: 'pointer'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#ffffff',
          height: '100%',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'default'
        }}
      >
        
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Agent 2: Risk Assessment
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                {company.company_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#6366f1' }} />
              <p style={{ fontWeight: '600' }}>Evaluating repayment history & risk indicators...</p>
            </div>
          ) : riskData ? (
            <>
              {/* Risk Gauge Header */}
              {(() => {
                const colors = getRiskBadgeColor(riskData.risk_level);
                return (
                  <div style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: colors.text, textTransform: 'uppercase' }}>
                        Credit Risk Level
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: colors.text, marginTop: '2px' }}>
                        {riskData.risk_level} ({riskData.risk_score}/100)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Overdue Count</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                        {riskData.overdue_installments_count} Installments
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Overdue Total Amount */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Total Outstanding Overdue Balance</span>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  ₹{parseFloat(riskData.total_overdue_amount || 0).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Key Risk Factors */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                  Identified Key Risk Triggers
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {riskData.key_risk_factors?.map((factor, idx) => (
                    <div key={idx} style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#334155'
                    }}>
                      <AlertTriangle size={16} color="#ef4444" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommended Mitigation Actions */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                  Recommended Mitigation Actions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {riskData.recommended_actions?.map((act, idx) => (
                    <div key={idx} style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#166534'
                    }}>
                      <CheckCircle size={16} color="#16a34a" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Trigger Button */}
              {riskData.overdue_installments_count > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCollectionModal(company);
                  }}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '12px'
                  }}
                >
                  <FileText size={18} />
                  <span>Draft Collection Reminder (Agent 3)</span>
                </button>
              )}

            </>
          ) : null}

        </div>

      </div>
    </div>
  );
};
