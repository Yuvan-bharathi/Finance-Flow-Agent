import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ActionCenterDrawer, type EnrichedCase } from '../components/ActionCenterDrawer';
import { Zap, Play, Search, RefreshCw, Eye } from 'lucide-react';
import type { ReconciliationCase } from '../types/reconciliation';

export const ActionCenter = () => {
  const [cases, setCases] = useState<EnrichedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<EnrichedCase | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingCaseId, setAnalyzingCaseId] = useState<number | null>(null);

  const fetchCases = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const url = statusFilter ? `/reconciliations/cases?status=${statusFilter}` : '/reconciliations/cases';
      const response = await api.get(url);
      setCases(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching reconciliation cases:', error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCases(true);
  }, [statusFilter]);

  const handleAnalyze = async (caseId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setAnalyzingCaseId(caseId);
      const response = await api.post(`/reconciliations/analyze/${caseId}`);
      await fetchCases();
      const updatedCase = response.data?.data?.case;
      if (updatedCase) {
        setSelectedCase(updatedCase);
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Agent analysis failed';
      alert(msg);
    } finally {
      setAnalyzingCaseId(null);
    }
  };

  const filteredCases = cases.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.transaction_id?.toLowerCase().includes(q) ||
      item.sender_name?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap color="#818cf8" size={28} />
            Reconciliation Action Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '4px' }}>
            AI-powered repayment analysis, automated evidence matching, and Human-in-the-Loop approval gate.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search sender, reference, TXN ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(31, 41, 55, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                width: '260px',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(31, 41, 55, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open (Unprocessed)</option>
            <option value="pending_review">Pending Accountant Review</option>
            <option value="under_review">Under Investigation</option>
            <option value="resolved">Resolved / Approved</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(17, 24, 39, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 20px' }}>Case &amp; TXN ID</th>
                <th style={{ padding: '16px 20px' }}>Sender &amp; Narration</th>
                <th style={{ padding: '16px 20px' }}>Deposit Amount</th>
                <th style={{ padding: '16px 20px' }}>AI Confidence</th>
                <th style={{ padding: '16px 20px' }}>Case Status</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#6366f1' }} />
                    <div>Loading reconciliation cases &amp; candidate matches...</div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No reconciliation cases found. Ingest a payment in the Payment Ingestion tab to get started!
                  </td>
                </tr>
              ) : (
                filteredCases.map(item => {
                  const rec = item.latest_recommendation;
                  const score = rec ? parseFloat(String(rec.confidence_score)) : 0;
                  let scoreColor = '#34d399';
                  if (score < 70) scoreColor = '#f87171';
                  else if (score < 90) scoreColor = '#fbbf24';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedCase(item)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#ffffff' }}>Case #{item.id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#818cf8', fontFamily: 'monospace' }}>{item.transaction_id}</div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#f3f4f6', fontWeight: '500' }}>{item.sender_name || 'Unknown Sender'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.reference || 'No narration reference'}</div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#34d399', fontSize: '0.95rem' }}>
                          ₹{parseFloat(String(item.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{item.payment_date}</div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        {rec ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: scoreColor }}>
                            <span>{score.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Not Analyzed</span>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span className={`badge badge-${item.status}`}>
                          {item.status}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {item.status === 'open' && (
                            <button
                              onClick={(e) => void handleAnalyze(item.id, e)}
                              disabled={analyzingCaseId === item.id}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                              <Play size={14} />
                              <span>{analyzingCaseId === item.id ? 'Running AI...' : 'Analyze'}</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCase(item); }}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            <Eye size={14} />
                            <span>Review</span>
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

      {/* Action Center Drawer */}
      {selectedCase && (
        <ActionCenterDrawer
          caseItem={selectedCase as ReconciliationCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={(optimisticData) => {
            if (optimisticData && optimisticData.id) {
              setCases(prev => prev.map(c => c.id === optimisticData.id ? { ...c, status: optimisticData.status as EnrichedCase['status'] } : c));
            }
            void fetchCases(false);
          }}
        />
      )}
    </div>
  );
};

export default ActionCenter;
