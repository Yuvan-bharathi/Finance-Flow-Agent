import React, { useState, useEffect } from 'react';
import { X, Activity, CheckCircle2, AlertCircle, Clock, Zap, Cpu, ChevronDown, ChevronUp, Layers, Terminal, RefreshCw } from 'lucide-react';
import { getAgentRuns, getRunDetail } from '../services/agentService';

/**
 * Slide-Over Drawer: Agent Run History & Execution Log Inspector
 * Displays run history list for an agent, expandable to show step-by-step execution timeline logs.
 */
const formatAuditTimestamp = (dateStr) => {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
};

export const AgentRunHistoryDrawer = ({ agent, agentId, agentName, onClose }) => {
  const currentAgentId = agent?.id || (typeof agent === 'string' ? agent : agentId);
  const currentAgentName = agent?.name || agentName || (typeof agent === 'string' ? agent : 'Operational Agent');

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [runLogs, setRunLogs] = useState({});
  const [loadingLogs, setLoadingLogs] = useState({});

  useEffect(() => {
    if (currentAgentId) {
      fetchRuns();
    }
  }, [currentAgentId]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await getAgentRuns(currentAgentId, 30);
      setRuns(data || []);
    } catch (err) {
      console.error('Error fetching agent runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandRun = async (runId) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }

    setExpandedRunId(runId);

    if (!runLogs[runId]) {
      try {
        setLoadingLogs(prev => ({ ...prev, [runId]: true }));
        const logs = await getRunDetail(currentAgentId, runId);
        setRunLogs(prev => ({ ...prev, [runId]: logs || [] }));
      } catch (err) {
        console.error('Error fetching run detail logs:', err);
      } finally {
        setLoadingLogs(prev => ({ ...prev, [runId]: false }));
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentAgentId) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
        cursor: 'pointer'
      }}
    >
      
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '90vw',
          background: '#ffffff',
          height: '100vh',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
          cursor: 'default'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
                {currentAgentName}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Run History & Step Execution Logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              border: '1px solid #e2e8f0'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Agent Summary Card */}
          {agent?.metrics && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b' }}>TOTAL RUNS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>{agent.metrics.total_runs || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b' }}>AVG CONFIDENCE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669' }}>{agent.metrics.avg_confidence ? `${parseFloat(agent.metrics.avg_confidence).toFixed(1)}%` : '0%'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b' }}>TOTAL TOKENS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#4f46e5' }}>{parseInt(agent.metrics.total_tokens || 0).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Runs History Timeline List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#6366f1" /> Execution History ({runs.length})
            </h3>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5' }} />
                <div>Loading agent execution telemetry...</div>
              </div>
            ) : runs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                No execution runs recorded for this agent yet.
              </div>
            ) : (
              runs.map(run => {
                const isExpanded = expandedRunId === run.id;
                const logs = runLogs[run.id] || [];

                return (
                  <div
                    key={run.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#ffffff',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    {/* Run Header Item Row */}
                    <div
                      onClick={() => toggleExpandRun(run.id)}
                      style={{
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isExpanded ? '#f8fafc' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {run.status === 'completed' ? (
                          <CheckCircle2 size={18} color="#059669" />
                        ) : run.status === 'failed' ? (
                          <AlertCircle size={18} color="#dc2626" />
                        ) : (
                          <Activity size={18} color="#2563eb" className="animate-spin" />
                        )}

                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Run #{run.id}
                            <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '1px 6px', borderRadius: '4px', background: run.trigger_type === 'manual' ? '#e0e7ff' : '#f1f5f9', color: run.trigger_type === 'manual' ? '#4338ca' : '#475569' }}>
                              {run.trigger_type.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            {formatAuditTimestamp(run.created_at)} • Triggered by: {run.triggered_by_name || 'System'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: run.confidence_score >= 80 ? '#059669' : '#b45309' }}>
                            {run.confidence_score != null ? `${run.confidence_score}%` : 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {run.total_tokens ? `${run.total_tokens} tokens` : '0 tokens'} • {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                      </div>
                    </div>

                    {/* Expandable Step-by-Step Log Details */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        {/* Run Metadata Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', color: '#334155' }}>
                          <div><strong>Engine Mode:</strong> {run.groq_called ? `Groq LLM (${run.model})` : 'Deterministic Pre-Check Engine'}</div>
                          <div><strong>Pre-Check Result:</strong> {run.pre_check_result ? run.pre_check_result.toUpperCase() : 'N/A'}</div>
                          <div><strong>Input / Output Tokens:</strong> {run.input_tokens || 0} / {run.output_tokens || 0}</div>
                          <div><strong>Result Summary:</strong> {run.result_summary || 'N/A'}</div>
                        </div>

                        {/* Tools Called */}
                        {run.tools_called && Array.isArray(run.tools_called) && run.tools_called.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                            <strong>Tools Used:</strong> {run.tools_called.join(', ')}
                          </div>
                        )}

                        {/* Step Execution Logs Timeline */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Terminal size={14} color="#6366f1" /> Step Execution Timeline:
                          </div>

                          {loadingLogs[run.id] ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '8px' }}>Loading step logs...</div>
                          ) : logs.length === 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '6px 0' }}>No detailed step logs recorded.</div>
                          ) : (
                            logs.map((step, idx) => {
                              let out = step.output_data;
                              if (typeof out === 'string') {
                                try { out = JSON.parse(out); } catch (e) { out = null; }
                              }

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '700' }}>
                                    <span style={{ color: '#4f46e5' }}>[{step.step_type}] {step.step_name}</span>
                                    <span style={{
                                      fontSize: '0.68rem',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontWeight: '800',
                                      background: step.status === 'completed' ? '#ecfdf5' : '#fef2f2',
                                      color: step.status === 'completed' ? '#059669' : '#dc2626'
                                    }}>
                                      {step.status.toUpperCase()} {step.duration_ms ? `(${step.duration_ms}ms)` : ''}
                                    </span>
                                  </div>

                                  {/* Human-Readable Output Formatter */}
                                  {out && (
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', marginTop: '2px' }}>
                                      {/* Case 1: Breached Borrowers List */}
                                      {out.breached_borrowers && Array.isArray(out.breached_borrowers) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          <div style={{ fontWeight: '800', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
                                            <span>🚨 {out.total_delinquent_companies || out.breached_borrowers.length} Delinquent Borrower(s) Identified:</span>
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                                            {out.breached_borrowers.map((b, bIdx) => (
                                              <div key={bIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem' }}>
                                                <span style={{ fontWeight: '700', color: '#1e293b' }}>🏢 {b.company || b.company_name || `Company #${b.company_id}`}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <span style={{ color: '#b91c1c', fontWeight: '800' }}>{b.overdue_amount || (b.outstanding_amount ? `₹${Number(b.outstanding_amount).toLocaleString('en-IN')}` : '')}</span>
                                                  <span style={{ background: '#fef2f2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>{b.overdue_days}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : out.companies && Array.isArray(out.companies) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <span style={{ fontWeight: '700', color: '#b91c1c' }}>🚨 {out.breach_count || out.companies.length} Breached Accounts Identified</span>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {out.companies.map((c, cIdx) => (
                                              <span key={cIdx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', color: '#334155' }}>
                                                Company #{c.company_id} ({c.overdue_days}d overdue)
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ) : out.total_alerts !== undefined ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                                          <span style={{ fontWeight: '800', color: '#059669' }}>✅ Scan Complete</span>
                                          <span style={{ color: '#475569' }}>Total Alerts: <strong>{out.total_alerts}</strong></span>
                                          {out.critical > 0 && <span style={{ color: '#dc2626', fontWeight: '700' }}>Critical: {out.critical}</span>}
                                          {out.high > 0 && <span style={{ color: '#d97706', fontWeight: '700' }}>High: {out.high}</span>}
                                        </div>
                                      ) : out.overdue_count !== undefined ? (
                                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                          🔍 Scanned portfolio records. Found <strong>{out.overdue_count}</strong> delinquent entries.
                                        </div>
                                      ) : out.alerts_classified !== undefined ? (
                                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                          🧠 Groq AI classified <strong>{out.alerts_classified}</strong> risk escalation notices.
                                        </div>
                                      ) : out.subject ? (
                                        <div style={{ fontSize: '0.72rem', color: '#1e293b' }}>
                                          <span style={{ fontWeight: '700', color: '#4f46e5' }}>✉️ Notice Draft:</span> {out.subject}
                                        </div>
                                      ) : (
                                        <pre style={{ margin: 0, fontSize: '0.68rem', color: '#475569', overflowX: 'auto' }}>
                                          {JSON.stringify(out, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
