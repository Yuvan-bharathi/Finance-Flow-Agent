import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getAgentStatus, getRecentActivity } from '../services/agentService';
import { triggerPortfolioAnalysis, getLatestPortfolioSnapshot } from '../services/portfolioService';
import { triggerEscalationScan, getAlerts, approveAlert, dismissAlert } from '../services/notificationService';
import { AgentRunHistoryDrawer } from '../components/AgentRunHistoryDrawer';
import {
  Bot,
  Zap,
  Shield,
  Mail,
  Send,
  FileText,
  PieChart,
  Bell,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Cpu,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

/**
 * AI Agent Control Center Page
 * Central command center for monitoring, triggering, and auditing all 6 FinanceFlow AI operational agents.
 */
export const AgentControlCenter = () => {
  const [agents, setAgents] = useState([]);
  const [overview, setOverview] = useState({});
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentForHistory, setSelectedAgentForHistory] = useState(null);
  const [triggeringAgentId, setTriggeringAgentId] = useState(null);

  // Agent 5: Latest portfolio snapshot from portfolio_snapshots table
  const [portfolioSnapshot, setPortfolioSnapshot] = useState(null);

  // Agent 6: Pending escalation alerts from notification_alerts table
  const [escalationAlerts, setEscalationAlerts] = useState([]);
  const [actioningAlertId, setActioningAlertId] = useState(null);
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [mailSuccessToast, setMailSuccessToast] = useState(null);

  // Activity filter state
  const [agentFilter, setAgentFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');

  const fetchControlCenterData = async () => {
    try {
      setLoading(true);
      const [statusData, activityData, snapshotRes, alertsRes] = await Promise.all([
        getAgentStatus(),
        getRecentActivity(25),
        getLatestPortfolioSnapshot().catch(() => ({ data: null })),
        getAlerts({ status: 'pending', limit: 10 }).catch(() => ({ data: { data: [] } }))
      ]);

      if (statusData) {
        setOverview(statusData.overview || {});
        setAgents(statusData.agents || []);
      }
      setActivity(activityData || []);
      setPortfolioSnapshot(snapshotRes?.data?.data || null);
      setEscalationAlerts(alertsRes?.data?.data || []);
    } catch (err) {
      console.error('Error loading Agent Control Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControlCenterData();
  }, []);

  const handleTriggerAgent = async (agentIdStr) => {
    try {
      setTriggeringAgentId(agentIdStr);

      if (agentIdStr === 'agent_1_reconciliation') {
        await api.post('/reconciliations/analyze/14');
      } else if (agentIdStr === 'agent_2_risk') {
        await api.get('/risk/assess/1');
      } else if (agentIdStr === 'agent_3_collection') {
        await api.get('/collection/generate/1');
      } else if (agentIdStr === 'agent_4_document') {
        await api.post('/documents/extract/1');
      } else if (agentIdStr === 'agent_5_portfolio') {
        // Agent 5: Trigger portfolio analytics
        // No entity ID needed — portfolio analysis covers the full portfolio
        const res = await triggerPortfolioAnalysis();
        if (res.data?.data) setPortfolioSnapshot(res.data.data);
      } else if (agentIdStr === 'agent_6_notification') {
        // Agent 6: Trigger escalation scan
        // No entity ID needed — escalation scan covers all companies
        const res = await triggerEscalationScan();
        if (res.data?.data?.alerts) setEscalationAlerts(res.data.data.alerts.filter(a => a.notification_status === 'pending'));
      }

      await fetchControlCenterData();
    } catch (err) {
      console.error(`Error triggering Agent ${agentIdStr}:`, err);
    } finally {
      setTriggeringAgentId(null);
    }
  };

  // Handle human approval actions for Agent 6 alerts
  const handleApproveAlert = async (alertOrId) => {
    const alertId = typeof alertOrId === 'object' ? alertOrId.id : alertOrId;
    const alertObj = typeof alertOrId === 'object' ? alertOrId : escalationAlerts.find(a => a.id === alertId);
    try {
      setActioningAlertId(alertId);
      await approveAlert(alertId);
      setEscalationAlerts(prev => prev.filter(a => a.id !== alertId));
      if (expandedAlertId === alertId) setExpandedAlertId(null);

      const recipientText = alertObj?.recommended_recipient || 'Borrower';
      const companyText = alertObj?.company_name || '';
      setMailSuccessToast(`⚡ Escalation email notice approved & dispatched successfully to ${recipientText} for ${companyText}!`);
      setTimeout(() => setMailSuccessToast(null), 6000);
    } catch (err) {
      console.error('Failed to approve alert:', err);
    } finally {
      setActioningAlertId(null);
    }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      setActioningAlertId(alertId);
      await dismissAlert(alertId);
      setEscalationAlerts(prev => prev.filter(a => a.id !== alertId));
      if (expandedAlertId === alertId) setExpandedAlertId(null);
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    } finally {
      setActioningAlertId(null);
    }
  };

  const getAgentIcon = (id) => {
    switch (id) {
      case 'agent_1_reconciliation': return Zap;
      case 'agent_2_risk': return Shield;
      case 'agent_3_collection': return Mail;
      case 'agent_4_document': return FileText;
      case 'agent_5_portfolio': return PieChart;
      case 'agent_6_notification': return Bell;
      default: return Bot;
    }
  };

  const filteredActivity = activity.filter(item => {
    if (agentFilter && item.agent_id !== agentFilter) return false;
    if (triggerFilter && item.trigger_type !== triggerFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Summary Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
          }}>
            <Bot size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              AI Agent Control Center
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
              Monitor, trigger, and inspect all FinanceFlow AI operational agents & token usage.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Tokens Consumed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4f46e5' }}>
              {parseInt(overview.total_tokens_used || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>tokens</span>
            </div>
          </div>

          <div style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Runs</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>
              {overview.active_runs || 0}
            </div>
          </div>

          <button
            onClick={fetchControlCenterData}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 6 Agent Cards Grid (3 Columns x 2 Rows) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px'
      }}>
        {agents.map(agentItem => {
          const IconComponent = getAgentIcon(agentItem.id);
          const isComingSoon = !agentItem.is_active;
          const m = agentItem.metrics || {};
          const isRunningThis = triggeringAgentId === agentItem.id;

          return (
            <div
              key={agentItem.id}
              style={{
                background: '#ffffff',
                border: isComingSoon ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: isComingSoon ? 'none' : '0 2px 10px rgba(0,0,0,0.02)',
                opacity: isComingSoon ? 0.85 : 1
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: isComingSoon ? '#f1f5f9' : '#e0e7ff',
                    color: isComingSoon ? '#64748b' : '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComponent size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
                      {agentItem.name}
                    </h3>
                    {isComingSoon && (
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', marginTop: '2px', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                        COMING SOON
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body: Compact single-line metrics OR Coming Soon Description */}
              {!isComingSoon ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#94a3b8' }}>RUNS</span>
                    {m.total_runs || 0}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', color: '#059669' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#86efac' }}>SUCCESS</span>
                    {m.total_runs ? `${Math.round((m.successful_runs / m.total_runs) * 100)}%` : '100%'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eef2ff', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#a5b4fc' }}>TOKENS</span>
                    {parseInt(m.total_tokens || 0).toLocaleString()}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                  {agentItem.description}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!isComingSoon ? (
                  <>
                    <button
                      onClick={() => handleTriggerAgent(agentItem.id)}
                      disabled={isRunningThis}
                      style={{
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                      }}
                    >
                      {isRunningThis ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={13} />
                          <span>Test Run</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedAgentForHistory(agentItem)}
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px' }}
                    >
                      <Activity size={14} /> View Activity
                    </button>
                  </>
                ) : (
                  <button
                    disabled
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'not-allowed',
                      textAlign: 'center'
                    }}
                  >
                    Roadmap Phase 6
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Agent 5 — Latest Portfolio Health Snapshot Panel */}
      {portfolioSnapshot && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} color="#4f46e5" /> Portfolio Health — Latest Snapshot
            </h2>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
              background: portfolioSnapshot.health_grade === 'EXCELLENT' ? '#d1fae5'
                : portfolioSnapshot.health_grade === 'GOOD' ? '#e0e7ff'
                : portfolioSnapshot.health_grade === 'FAIR' ? '#fef3c7'
                : portfolioSnapshot.health_grade === 'POOR' ? '#fde68a'
                : '#fee2e2',
              color: portfolioSnapshot.health_grade === 'EXCELLENT' ? '#065f46'
                : portfolioSnapshot.health_grade === 'GOOD' ? '#3730a3'
                : portfolioSnapshot.health_grade === 'FAIR' ? '#92400e'
                : '#991b1b'
            }}>
              {portfolioSnapshot.health_grade} — {portfolioSnapshot.health_score}/100
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
            {[[
              'Collection Efficiency', `${portfolioSnapshot.collection_efficiency}%`, '#059669'
            ], [
              'Delinquency Rate', `${portfolioSnapshot.delinquency_rate}%`, '#dc2626'
            ], [
              'Top Borrower Conc.', `${portfolioSnapshot.top_borrower_concentration}%`, '#d97706'
            ], [
              'Overdue Amount', `₹${parseFloat(portfolioSnapshot.total_overdue_amount || 0).toLocaleString('en-IN')}`, '#7c3aed'
            ]].map(([label, value, color], i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color, marginTop: '4px' }}>{value}</div>
              </div>
            ))}
          </div>
          {portfolioSnapshot.ai_interpretation && (
            <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '12px 14px', fontSize: '0.8rem', color: '#3730a3', lineHeight: 1.5 }}>
              🤖 {portfolioSnapshot.ai_interpretation}
            </div>
          )}
        </div>
      )}

      {/* Agent 6 — Active Escalation Alerts Panel */}
      {escalationAlerts.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          {mailSuccessToast && (
            <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>{mailSuccessToast}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#dc2626" />
              Active Escalation Alerts & Drafted Notices
              <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
                {escalationAlerts.length} Pending Approval
              </span>
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Click any card to inspect the AI-drafted escalation email before dispatching.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {escalationAlerts.map(alert => {
              const isExpanded = expandedAlertId === alert.id;
              const formattedAmount = `₹${parseFloat(alert.outstanding_amount || 0).toLocaleString('en-IN')}`;

              return (
                <div
                  key={alert.id}
                  style={{
                    background: isExpanded ? '#ffffff' : '#f8fafc',
                    border: `1.5px solid ${
                      alert.severity === 'CRITICAL' ? (isExpanded ? '#ef4444' : '#fca5a5')
                      : alert.severity === 'HIGH' ? (isExpanded ? '#f59e0b' : '#fde68a')
                      : '#e2e8f0'
                    }`,
                    borderRadius: '14px',
                    padding: '16px',
                    transition: 'all 0.2s ease',
                    boxShadow: isExpanded ? '0 10px 25px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {/* Summary Header Row (Clickable to Expand/Collapse) */}
                  <div
                    onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800',
                          background: alert.severity === 'CRITICAL' ? '#fee2e2'
                            : alert.severity === 'HIGH' ? '#fef3c7' : '#f0fdf4',
                          color: alert.severity === 'CRITICAL' ? '#991b1b'
                            : alert.severity === 'HIGH' ? '#92400e' : '#166534'
                        }}>{alert.severity}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>{alert.company_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>• {alert.overdue_days} days overdue</span>
                      </div>
                      
                      <div style={{ fontSize: '0.775rem', color: '#475569' }}>
                        <strong style={{ color: '#0f172a' }}>{formattedAmount}</strong> outstanding
                        {alert.recommended_recipient && <span> → Target Escalation: <strong style={{ color: '#4f46e5' }}>{alert.recommended_recipient}</strong></span>}
                      </div>

                      {!isExpanded && alert.ai_reasoning && (
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                          {alert.ai_reasoning.slice(0, 110)}... <span style={{ color: '#4f46e5', fontWeight: '700' }}>Click to view drafted mail ✉️</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveAlert(alert);
                        }}
                        disabled={actioningAlertId === alert.id}
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                        }}
                      >
                        {actioningAlertId === alert.id ? 'Sending...' : '✓ Approve & Trigger'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.id);
                        }}
                        disabled={actioningAlertId === alert.id}
                        style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '7px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Dismiss
                      </button>

                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: isExpanded ? '#e0e7ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isExpanded ? '#4f46e5' : '#64748b' }}>
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded AI Drafted Email Preview Box */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
                      
                      {/* Email Header Banner */}
                      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                          <span style={{ color: '#64748b', fontWeight: '600' }}>From:</span>
                          <span style={{ color: '#0f172a', fontWeight: '700' }}>FinanceFlow AI Escalations Desk &lt;risk-alerts@financeflow.ai&gt;</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                          <span style={{ color: '#64748b', fontWeight: '600' }}>To:</span>
                          <span style={{ color: '#2563eb', fontWeight: '700' }}>
                            {alert.recommended_recipient} &lt;{alert.contact_email || 'management@borrower.com'}&gt;
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: '600' }}>Subject:</span>
                          <span style={{ color: '#991b1b', fontWeight: '800' }}>
                            [URGENT ESCALATION NOTICE] Overdue Loan Repayment Default — {alert.company_name} ({alert.overdue_days} Days Past Due)
                          </span>
                        </div>
                      </div>

                      {/* Drafted Email Message Body */}
                      <div style={{
                        background: '#ffffff',
                        border: '1.5px solid #dbeafe',
                        borderRadius: '12px',
                        padding: '18px 20px',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        color: '#1e293b',
                        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)'
                      }}>
                        <p style={{ marginBottom: '10px' }}>
                          Dear <strong>{alert.contact_name || alert.recommended_recipient || 'Finance Leadership'}</strong>,
                        </p>
                        
                        <p style={{ marginBottom: '12px' }}>
                          This is a formal escalation from the <strong>FinanceFlow Credit Risk & Portfolio Monitoring Desk</strong>. Our automated SLA surveillance system has detected a critical delinquency on your active credit facility.
                        </p>

                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Delinquency Summary & Exposure:
                          </div>
                          <ul style={{ margin: '0', paddingLeft: '18px', color: '#7f1d1d', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <li><strong>Borrower Entity:</strong> {alert.company_name}</li>
                            <li><strong>Days Past Due:</strong> <span style={{ color: '#dc2626', fontWeight: '800' }}>{alert.overdue_days} Days</span></li>
                            <li><strong>Total Overdue Exposure:</strong> <span style={{ color: '#dc2626', fontWeight: '800' }}>{formattedAmount}</span></li>
                            <li><strong>Severity Assessment:</strong> <span style={{ fontWeight: '800' }}>{alert.severity}</span></li>
                          </ul>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: '#334155' }}>🤖 AI Risk Analysis & Reasoning:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #6366f1' }}>
                            "{alert.ai_reasoning || 'Breach of contractual repayment SLA milestone detected. High risk of default identified by Agent 2.'}"
                          </p>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <strong style={{ color: '#334155' }}>⚡ Mandated Action Required:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#0f172a', fontWeight: '600' }}>
                            {alert.recommended_action || 'Remit outstanding balance immediately or provide a formal debt restructuring plan within 3 business days.'}
                          </p>
                        </div>

                        <p style={{ marginBottom: '14px', fontSize: '0.8rem', color: '#64748b' }}>
                          Failure to resolve this delinquency within <strong>48 hours</strong> of this notice will trigger automated reporting to credit rating bureaus and escalation to our legal recovery team.
                        </p>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '0.8rem', color: '#475569' }}>
                          <div>Sincerely,</div>
                          <strong style={{ color: '#0f172a' }}>FinanceFlow Portfolio Risk & Collections Office</strong><br />
                          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Automated Agentic Governance System • Platform ID #AL-{alert.id}</span>
                        </div>
                      </div>

                      {/* Expanded Card Trigger Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Approving this notice will record audit logs and transmit this notice to <strong>{alert.contact_email || 'the borrower'}</strong>.
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => setExpandedAlertId(null)}
                            className="btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                          >
                            Collapse Preview
                          </button>

                          <button
                            onClick={() => handleApproveAlert(alert)}
                            disabled={actioningAlertId === alert.id}
                            style={{
                              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 18px',
                              borderRadius: '8px',
                              fontSize: '0.825rem',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                            }}
                          >
                            <Send size={15} />
                            <span>{actioningAlertId === alert.id ? 'Triggering Email...' : '⚡ Approve & Dispatch Email Now'}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Log Timeline Feed */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Recent Agent Activity Feed
              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                {filteredActivity.length} Events
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
              <Filter size={14} /> Filter:
            </div>
            
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }}
            >
              <option value="">All Agents</option>
              {agents.filter(a => a.is_active).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <select
              value={triggerFilter}
              onChange={e => setTriggerFilter(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }}
            >
              <option value="">All Triggers</option>
              <option value="manual">Manual</option>
              <option value="api">API / Webhook</option>
              <option value="schedule">Schedule</option>
            </select>
          </div>
        </div>

        {/* Timeline Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.875rem' }}>
              No execution activity logged yet.
            </div>
          ) : (
            filteredActivity.map(act => {
              const isSuccess = act.status === 'completed';
              const IconComp = getAgentIcon(act.agent_id);

              return (
                <div
                  key={act.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isSuccess ? '#d1fae5' : '#fee2e2',
                      color: isSuccess ? '#059669' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComp size={18} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                          {act.agent_name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                          Run #{act.id}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {act.result_summary || `Processed Case #${act.case_id || 'N/A'}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: isSuccess ? '#059669' : '#dc2626' }}>
                        {isSuccess ? `${parseFloat(act.confidence_score || 90).toFixed(2)}%` : 'FAILED'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        {act.total_tokens ? `${parseInt(act.total_tokens).toLocaleString()} tokens` : '0 tokens'}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Step History Log Drawer */}
      {selectedAgentForHistory && (
        <AgentRunHistoryDrawer
          agent={selectedAgentForHistory}
          onClose={() => setSelectedAgentForHistory(null)}
        />
      )}

    </div>
  );
};
