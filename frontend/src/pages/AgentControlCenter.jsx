import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  getAgentStatus,
  getRecentActivity,
  triggerPipelineWorkflow,
  getPipelineExecutions,
  getPipelineExecutionById,
  getQueueStatus
} from '../services/agentService';
import { triggerPortfolioAnalysis, getLatestPortfolioSnapshot } from '../services/portfolioService';
import { triggerEscalationScan, getAlerts, approveAlert, dismissAlert } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { AgentRunHistoryDrawer } from '../components/AgentRunHistoryDrawer';
import { PipelineVisualizer } from '../components/PipelineVisualizer';
import { connectSocket } from '../services/socketService';
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
  ShieldAlert,
  Clock,
  RefreshCw,
  Cpu,
  Layers,
  ChevronRight,
  Filter,
  Play,
  ArrowRight,
  Eye,
  Workflow
} from 'lucide-react';

const DEFAULT_AGENTS = [
  { id: 'agent_1_reconciliation', name: 'Payment Reconciliation Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_2_risk', name: 'Repayment Risk Assessment Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_3_collection', name: 'Automated Collection Follow-Up Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_4_document', name: 'Document Intelligence Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_5_portfolio', name: 'Portfolio Analytics Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_6_notification', name: 'Notification & Escalation Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
];

/**
 * AI Agent Control Center & Multi-Agent Orchestrator Page (Phase 5)
 * Central command center for monitoring, triggering, and auditing all 6 FinanceFlow AI operational agents,
 * managing multi-agent orchestration pipelines, and viewing real-time execution timelines.
 */
export const AgentControlCenter = () => {
  const { user } = useAuth();
  const userRole = (user?.role_name || user?.role || '').toLowerCase();
  const isViewer = userRole === 'viewer';

  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [overview, setOverview] = useState({});
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentForHistory, setSelectedAgentForHistory] = useState(null);
  const [triggeringAgentId, setTriggeringAgentId] = useState(null);

  // Phase 5 Orchestrator State
  const [activePipeline, setActivePipeline] = useState(null);
  const [pipelineHistory, setPipelineHistory] = useState([]);
  const [queueMetrics, setQueueMetrics] = useState(null);
  const [triggeringPipeline, setTriggeringPipeline] = useState(false);

  // Agent 5: Latest portfolio snapshot
  const [portfolioSnapshot, setPortfolioSnapshot] = useState(null);

  // Agent 6: Pending escalation alerts
  const [escalationAlerts, setEscalationAlerts] = useState([]);
  const [actioningAlertId, setActioningAlertId] = useState(null);
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [mailSuccessToast, setMailSuccessToast] = useState(null);
  const [authErrorToast, setAuthErrorToast] = useState(null);

  // Activity filter state
  const [agentFilter, setAgentFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');

  const fetchControlCenterData = async () => {
    try {
      setLoading(true);
      const [statusData, activityData, snapshotRes, alertsRes, pipelinesRes, queueRes] = await Promise.all([
        getAgentStatus(),
        getRecentActivity(25),
        getLatestPortfolioSnapshot().catch(() => ({ data: null })),
        getAlerts({ status: 'pending', limit: 10 }).catch(() => ({ data: { data: [] } })),
        getPipelineExecutions({ page: 1, limit: 10 }).catch(() => ({ data: [] })),
        getQueueStatus().catch(() => null)
      ]);

      if (statusData) {
        setOverview(statusData.overview || {});
        setAgents(statusData.agents || []);
      }
      setActivity(activityData || []);
      setPortfolioSnapshot(snapshotRes?.data?.data || null);
      setEscalationAlerts(alertsRes?.data?.data || []);
      setPipelineHistory(pipelinesRes?.data || []);
      if (queueRes) setQueueMetrics(queueRes);
    } catch (err) {
      console.error('Error loading Agent Control Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControlCenterData();

    // 1. WebSocket Live Pipeline Progress Subscription
    const socket = connectSocket();
    if (socket) {
      socket.on('PIPELINE_STARTED', (data) => {
        setActivePipeline({
          id: data.pipeline_id,
          pipeline_name: data.pipeline_name,
          correlation_id: data.correlation_id,
          status: 'running',
          steps: data.steps || []
        });
      });

      socket.on('PIPELINE_STEP_STARTED', (data) => {
        setActivePipeline(prev => {
          if (!prev || prev.id !== data.pipeline_id) return prev;
          const updatedSteps = (prev.steps || []).map(s => 
            s.step_index === data.step_index ? { ...s, status: 'running' } : s
          );
          return { ...prev, steps: updatedSteps };
        });
      });

      socket.on('PIPELINE_STEP_COMPLETED', (data) => {
        setActivePipeline(prev => {
          if (!prev || prev.id !== data.pipeline_id) return prev;
          const updatedSteps = (prev.steps || []).map(s => 
            s.step_index === data.step_index 
              ? { ...s, status: data.status || 'completed', duration_ms: data.duration_ms, tokens_used: data.tokens_used, output_payload: data.output_payload }
              : s
          );
          return { ...prev, steps: updatedSteps };
        });
      });

      socket.on('PIPELINE_STEP_FAILED', (data) => {
        setActivePipeline(prev => {
          if (!prev || prev.id !== data.pipeline_id) return prev;
          const updatedSteps = (prev.steps || []).map(s => 
            s.step_index === data.step_index 
              ? { ...s, status: 'failed', error_message: data.error_message, duration_ms: data.duration_ms }
              : s
          );
          return { ...prev, steps: updatedSteps };
        });
      });

      socket.on('PIPELINE_COMPLETED', (data) => {
        setActivePipeline(prev => {
          if (!prev || prev.id !== data.pipeline_id) return prev;
          return { ...prev, status: data.status, duration_ms: data.duration_ms, total_tokens: data.total_tokens };
        });
        fetchControlCenterData();
      });
    }

    const handleAuthErr = (e) => {
      const { message } = e.detail || {};
      setAuthErrorToast({
        title: 'Access Restricted',
        badge: 'Permission Required',
        message: message || 'Your current account role does not have permission for this operation.',
        hint: 'Contact your platform administrator or sign in with an authorized role to request access.'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
    };
    window.addEventListener('ff-auth-permission-error', handleAuthErr);

    return () => {
      window.removeEventListener('ff-auth-permission-error', handleAuthErr);
      if (socket) {
        socket.off('PIPELINE_STARTED');
        socket.off('PIPELINE_STEP_STARTED');
        socket.off('PIPELINE_STEP_COMPLETED');
        socket.off('PIPELINE_STEP_FAILED');
        socket.off('PIPELINE_COMPLETED');
      }
    };
  }, []);

  const getAgentDisplayName = (id) => {
    const map = {
      'agent_1_reconciliation': 'Payment Reconciliation Agent',
      'agent_2_risk': 'Repayment Risk Assessment Agent',
      'agent_3_collection': 'Automated Collection Follow-Up Agent',
      'agent_4_document': 'Document Intelligence Agent',
      'agent_5_portfolio': 'Portfolio Analytics Agent',
      'agent_6_notification': 'Notification & Escalation Agent'
    };
    return map[id] || 'AI Operational Agent';
  };

  // Phase 5: Trigger a Multi-Agent Pipeline Workflow
  const handleTriggerPipeline = async (workflowName) => {
    if (isViewer) {
      setAuthErrorToast({
        title: 'Access Restricted',
        badge: 'Read-Only Account',
        message: 'Your account role (Viewer) is read-only and cannot trigger multi-agent workflows.',
        hint: 'Sign in with an authorized account (Admin, Manager, or Senior Accountant).'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
      return;
    }

    try {
      setTriggeringPipeline(true);
      const res = await triggerPipelineWorkflow({
        workflow: workflowName,
        contextData: { caseId: 20, companyId: 1, documentId: 1 },
        priority: 1
      });

      if (res) {
        setActivePipeline(res);
      }
      await fetchControlCenterData();
    } catch (err) {
      console.error('Error triggering pipeline:', err);
      setAuthErrorToast({
        title: 'Pipeline Execution Error',
        badge: 'Orchestrator',
        message: err.response?.data?.message || 'Failed to trigger multi-agent pipeline workflow.',
        hint: 'Please check database connectivity and worker queue status.'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
    } finally {
      setTriggeringPipeline(false);
    }
  };

  const handleInspectHistoricalPipeline = async (pipelineId) => {
    try {
      const detailed = await getPipelineExecutionById(pipelineId);
      setActivePipeline(detailed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to fetch pipeline detail:', err);
    }
  };

  const handleTriggerAgent = async (agentIdStr) => {
    const agentName = getAgentDisplayName(agentIdStr);

    if (isViewer) {
      setAuthErrorToast({
        title: 'Access Restricted',
        badge: 'Read-Only Account',
        message: `Your account role (Viewer) is read-only and cannot trigger the ${agentName}.`,
        hint: 'Sign in with an authorized account (Admin, Manager, or Accountant) to run operational agents.'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
      return;
    }

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
        const res = await triggerPortfolioAnalysis();
        if (res.data?.data) setPortfolioSnapshot(res.data.data);
      } else if (agentIdStr === 'agent_6_notification') {
        const res = await triggerEscalationScan();
        if (res.data?.data?.alerts) setEscalationAlerts(res.data.data.alerts.filter(a => a.notification_status === 'pending'));
      }

      await fetchControlCenterData();
    } catch (err) {
      console.error(`Error triggering Agent ${agentIdStr}:`, err);
      const cleanMessage = err.response?.data?.message || 'Operation could not be completed.';
      setAuthErrorToast({
        title: 'Execution Notice',
        badge: 'Agent System',
        message: `Unable to run ${agentName}: ${cleanMessage}`,
        hint: 'Please try again in a few moments.'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
    } finally {
      setTriggeringAgentId(null);
    }
  };

  const handleApproveAlert = async (alertOrId) => {
    if (isViewer) return;
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
    if (isViewer) return;
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
        flexWrap: 'wrap',
        gap: '16px',
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
              AI Agent Control & Orchestrator
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
              Multi-agent workflow orchestration, priority queue governance & real-time telemetry.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Tokens Consumed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4f46e5' }}>
              {parseInt(overview.total_tokens_used || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>tokens</span>
            </div>
          </div>

          <div style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Worker Queue</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>
              {queueMetrics?.activeJobsCount || 0} active / {queueMetrics?.queuedJobsCount || 0} queued
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

      {/* Auth Error Banner */}
      {authErrorToast && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <ShieldAlert size={22} color="#dc2626" />
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#991b1b' }}>
                {authErrorToast.title}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: '600', margin: '2px 0 0' }}>
                {authErrorToast.message}
              </p>
            </div>
          </div>
          <button onClick={() => setAuthErrorToast(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* PHASE 5: Live Pipeline Visualizer Graph (When active) */}
      {activePipeline && (
        <PipelineVisualizer
          pipeline={activePipeline}
          onClose={() => setActivePipeline(null)}
          onRefresh={fetchControlCenterData}
        />
      )}

      {/* PHASE 5: Multi-Agent Pipeline Workflows Card Section */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1.5px solid #cbd5e1',
        borderRadius: '18px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Workflow color="#4f46e5" size={22} />
              <span>Multi-Agent Orchestration Pipelines</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
              Execute cross-agent workflows sequenced through the priority worker queue with step telemetry.
            </p>
          </div>

          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', background: '#e0e7ff', padding: '4px 12px', borderRadius: '999px' }}>
            Phase 5 Orchestrator Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Workflow 1 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Zap size={18} color="#4f46e5" />
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>Reconcile & Risk Pipeline</span>
              </div>
              <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                <strong>Agent 1</strong> (Reconciliation) ➔ <strong>Agent 2</strong> (Risk Scoring) ➔ <strong>Agent 3</strong> (Collection Notice).
              </p>
            </div>
            <button
              onClick={() => handleTriggerPipeline('RECONCILIATION_AND_RISK')}
              disabled={triggeringPipeline}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: triggeringPipeline ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} />
              <span>Launch Pipeline</span>
            </button>
          </div>

          {/* Workflow 2 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <PieChart size={18} color="#059669" />
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>Portfolio & Escalation Pipeline</span>
              </div>
              <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                <strong>Agent 5</strong> (Portfolio Snapshot & KPIs) ➔ <strong>Agent 6</strong> (Escalation & SLA Scanner).
              </p>
            </div>
            <button
              onClick={() => handleTriggerPipeline('PORTFOLIO_AND_ESCALATION')}
              disabled={triggeringPipeline}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: triggeringPipeline ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} />
              <span>Launch Pipeline</span>
            </button>
          </div>

          {/* Workflow 3 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Shield size={18} color="#7c3aed" />
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>Full 6-Agent Audit Pipeline</span>
              </div>
              <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Comprehensive sequential orchestration across all 6 specialized agents for periodic regulatory audit.
              </p>
            </div>
            <button
              onClick={() => handleTriggerPipeline('END_TO_END_COMPLIANCE')}
              disabled={triggeringPipeline}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: triggeringPipeline ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} />
              <span>Launch Full Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Individual Agent Cards Grid */}
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
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5'
                  }}>
                    <IconComponent size={20} />
                  </div>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0'
                  }}>
                    {agentItem.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                  {agentItem.name}
                </h3>
                <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                  {agentItem.id === 'agent_1_reconciliation' && 'Zero-token deterministic pre-checks + Groq tool calling for bank payment reconciliation.'}
                  {agentItem.id === 'agent_2_risk' && 'Evaluates borrower exposure, updated debt-service ratio, and credit risk tier.'}
                  {agentItem.id === 'agent_3_collection' && 'Drafts automated reminder communications for past-due/unmatched borrowers.'}
                  {agentItem.id === 'agent_4_document' && 'Extracts loan facilities, interest clauses, and penalties from legal contracts.'}
                  {agentItem.id === 'agent_5_portfolio' && 'Computes portfolio collection efficiency, delinquency rates, and health grade.'}
                  {agentItem.id === 'agent_6_notification' && 'Detects SLA-breached overdue repayments and populates manager alerts.'}
                </p>
              </div>

              {/* Metrics Bar */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                textAlign: 'center',
                gap: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>TOTAL RUNS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{m.total_runs || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>SUCCESS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#059669' }}>{m.success_rate !== undefined ? `${Math.round(parseFloat(m.success_rate))}%` : '100%'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>AVG TIME</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#4f46e5' }}>
                    {m.avg_duration_ms ? `${Math.round(parseFloat(m.avg_duration_ms))}ms` : '320ms'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleTriggerAgent(agentItem.id)}
                  disabled={isRunningThis || isViewer}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: isRunningThis || isViewer ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Play size={12} className={isRunningThis ? 'animate-spin' : ''} />
                  <span>{isRunningThis ? 'Executing...' : 'Run Agent'}</span>
                </button>

                <button
                  onClick={() => setSelectedAgentForHistory(agentItem.id)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  History
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Multi-Agent Pipeline Executions */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Historical Multi-Agent Pipeline Runs
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
              Persistent execution ledger recorded in <code>pipeline_executions</code> with full step trees.
            </p>
          </div>
        </div>

        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Pipeline ID & Name</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Trigger Source</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Duration</th>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Total Tokens</th>
                <th style={{ padding: '14px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipelineHistory.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No pipeline workflows executed yet. Launch a pipeline above!</td></tr>
              ) : (
                pipelineHistory.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>Pipeline #{p.id}: {p.pipeline_name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(p.created_at).toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#475569', fontSize: '0.8rem' }}>
                      <code>{p.trigger_source}</code>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        background: p.status === 'completed' ? '#ecfdf5' : p.status === 'running' ? '#eff6ff' : '#fef2f2',
                        color: p.status === 'completed' ? '#059669' : p.status === 'running' ? '#2563eb' : '#dc2626'
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f172a' }}>
                      {p.duration_ms ? `${p.duration_ms}ms` : '-'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#4f46e5', fontWeight: '700' }}>
                      {p.total_tokens || 0}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleInspectHistoricalPipeline(p.id)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#4f46e5',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={12} /> Inspect Steps
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Drawer for Single Agent */}
      {selectedAgentForHistory && (
        <AgentRunHistoryDrawer
          agent={agents.find(a => a.id === selectedAgentForHistory) || { id: selectedAgentForHistory, name: getAgentDisplayName(selectedAgentForHistory) }}
          agentId={selectedAgentForHistory}
          agentName={getAgentDisplayName(selectedAgentForHistory)}
          onClose={() => setSelectedAgentForHistory(null)}
        />
      )}

    </div>
  );
};

export default AgentControlCenter;
