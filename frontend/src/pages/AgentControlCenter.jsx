import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  getAgentStatus,
  getRecentActivity,
  triggerPipelineWorkflow,
  batchTriggerPipeline,
  getPendingPipelineTargets,
  getPipelineExecutions,
  getPipelineExecutionById,
  getQueueStatus
} from '../services/agentService';
import { triggerPortfolioAnalysis, getLatestPortfolioSnapshot } from '../services/portfolioService';
import { triggerEscalationScan, getAlerts, approveAlert, dismissAlert } from '../services/notificationService';
import { getAnomalyList, dismissAnomaly, escalateAnomaly } from '../services/anomalyService';
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
  ChevronUp,
  ChevronDown,
  Filter,
  Play,
  ArrowRight,
  Eye,
  Workflow,
  X,
  Lock,
  Search,
  CheckSquare,
  Square,
  SendHorizontal,
  Building,
  CreditCard,
  FileSpreadsheet,
  ScanSearch,
  AlertTriangle,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';

const formatAuditTimestamp = (dateStr) => {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
};

const DEFAULT_AGENTS = [
  { id: 'agent_1_reconciliation', name: 'Payment Reconciliation Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_7_anomaly', name: 'Anomaly Detection Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 180 } },
  { id: 'agent_2_risk', name: 'Repayment Risk Assessment Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_3_collection', name: 'Automated Collection Follow-Up Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_4_document', name: 'Document Intelligence Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_5_portfolio', name: 'Portfolio Analytics Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
  { id: 'agent_6_notification', name: 'Notification & Escalation Agent', status: 'READY', is_active: true, metrics: { total_runs: 0, success_rate: 100, avg_duration_ms: 320 } },
];

/**
 * AI Agent Control Center & Multi-Agent Orchestrator Page (Phase 5)
 * Features single target selection modal, batch multi-agent execution, inline step inspection, and live telemetry.
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
  const [expandedHistoricalPipelineId, setExpandedHistoricalPipelineId] = useState(null);
  const [expandedHistoricalPipelines, setExpandedHistoricalPipelines] = useState({});
  const [inspectingPipelineId, setInspectingPipelineId] = useState(null);

  // Option 1 & 2 Modal & Batch Processing State
  const [targetModalWorkflow, setTargetModalWorkflow] = useState(null); // 'RECONCILIATION_AND_RISK' | 'END_TO_END_COMPLIANCE' | null
  const [pendingTargets, setPendingTargets] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchToast, setBatchToast] = useState(null);

  // Agent 5: Latest portfolio snapshot
  const [portfolioSnapshot, setPortfolioSnapshot] = useState(null);

  // Agent 6: Pending escalation alerts
  const [escalationAlerts, setEscalationAlerts] = useState([]);
  const [actioningAlertId, setActioningAlertId] = useState(null);
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [mailSuccessToast, setMailSuccessToast] = useState(null);
  const [authErrorToast, setAuthErrorToast] = useState(null);

  // Agent 7: Anomaly flags
  const [anomalyFlags, setAnomalyFlags] = useState([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [actioningAnomalyId, setActioningAnomalyId] = useState(null);
  const [dismissModalId, setDismissModalId] = useState(null);
  const [dismissReason, setDismissReason] = useState('');
  const [expandedAnomalyId, setExpandedAnomalyId] = useState(null);

  // Activity filter state
  const [agentFilter, setAgentFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');

  const fetchControlCenterData = async () => {
    try {
      setLoading(true);
      const [statusData, activityData, snapshotRes, alertsRes, pipelinesRes, queueRes, anomalyRes] = await Promise.all([
        getAgentStatus(),
        getRecentActivity(25),
        getLatestPortfolioSnapshot().catch(() => ({ data: null })),
        getAlerts({ status: 'pending', limit: 10 }).catch(() => ({ data: { data: [] } })),
        getPipelineExecutions({ page: 1, limit: 15 }).catch(() => ({ data: [] })),
        getQueueStatus().catch(() => null),
        getAnomalyList({ status: 'pending', limit: 20 }).catch(() => ({ data: [] }))
      ]);

      if (statusData) {
        setOverview(statusData.overview || {});
        if (statusData.agents && statusData.agents.length > 0) {
          setAgents(prev => prev.map(a => {
            const found = statusData.agents.find(item => item.id === a.id);
            return found ? { ...a, ...found } : a;
          }));
        }
      }

      if (activityData) {
        setActivity(activityData);
      }

      if (snapshotRes?.data) {
        setPortfolioSnapshot(snapshotRes.data);
      }

      if (alertsRes?.data?.data) {
        setEscalationAlerts(alertsRes.data.data);
      }

      if (pipelinesRes?.data) {
        setPipelineHistory(pipelinesRes.data);
      }

      if (queueRes) {
        setQueueMetrics(queueRes);
      }

      if (anomalyRes?.data) {
        setAnomalyFlags(Array.isArray(anomalyRes.data) ? anomalyRes.data : (anomalyRes.data?.data || []));
      }
    } catch (err) {
      console.error('Failed to load agent control center telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControlCenterData();

    // Listen for real-time WebSocket events
    const socketInstance = connectSocket();
    const handleEvent = () => {
      fetchControlCenterData();
    };

    if (socketInstance) {
      socketInstance.on('pipeline_completed', handleEvent);
      socketInstance.on('pipeline_step_completed', handleEvent);
      socketInstance.on('agent_executed', handleEvent);
      socketInstance.on('agent_status_updated', handleEvent);
      socketInstance.on('portfolio_recalculated', handleEvent);
      socketInstance.on('escalation_alert_created', handleEvent);
      socketInstance.on('ANOMALY_DETECTED', (payload) => {
        setAnomalyFlags(prev => {
          if (prev.some(f => f.payment_id === payload.payment_id && f.detection_stage === 'stage_b')) return prev;
          return [{
            id: payload.anomaly_id,
            payment_id: payload.payment_id,
            company_name: payload.company_name || 'Unknown',
            anomaly_score: payload.anomaly_score,
            severity: payload.severity,
            anomaly_types: payload.anomaly_types || [],
            status: 'pending',
            created_at: new Date().toISOString(),
            isLive: true
          }, ...prev].slice(0, 20);
        });
      });
    }

    return () => {
      if (socketInstance) {
        socketInstance.off('pipeline_completed', handleEvent);
        socketInstance.off('pipeline_step_completed', handleEvent);
        socketInstance.off('agent_executed', handleEvent);
        socketInstance.off('agent_status_updated', handleEvent);
        socketInstance.off('portfolio_recalculated', handleEvent);
        socketInstance.off('escalation_alert_created', handleEvent);
        socketInstance.off('ANOMALY_DETECTED');
      }
    };
  }, []);

  const getAgentDisplayName = (id) => {
    const map = {
      'agent_1_reconciliation': 'Payment Reconciliation Agent',
      'agent_7_anomaly': 'Anomaly Detection Agent',
      'agent_2_risk': 'Repayment Risk Assessment Agent',
      'agent_3_collection': 'Automated Collection Follow-Up Agent',
      'agent_4_document': 'Document Intelligence Agent',
      'agent_5_portfolio': 'Portfolio Analytics Agent',
      'agent_6_notification': 'Notification & Escalation Agent'
    };
    return map[id] || 'AI Operational Agent';
  };

  // ─── Anomaly Actions ────────────────────────────────────────────────────────
  const handleDismissAnomaly = async (anomalyId) => {
    setActioningAnomalyId(anomalyId);
    try {
      await dismissAnomaly(anomalyId, dismissReason);
      setAnomalyFlags(prev => prev.filter(f => f.id !== anomalyId));
      setDismissModalId(null);
      setDismissReason('');
    } catch (err) {
      console.error('Failed to dismiss anomaly:', err);
    } finally {
      setActioningAnomalyId(null);
    }
  };

  const handleEscalateAnomaly = async (anomalyId) => {
    setActioningAnomalyId(anomalyId);
    try {
      await escalateAnomaly(anomalyId);
      setAnomalyFlags(prev => prev.map(f => f.id === anomalyId ? { ...f, status: 'escalated' } : f));
    } catch (err) {
      console.error('Failed to escalate anomaly:', err);
    } finally {
      setActioningAnomalyId(null);
    }
  };

  // ─── Modal Open & Pending Targets Fetching ──────────────────────────────────
  const handleOpenTargetModal = async (workflowName) => {
    if (isViewer) {
      setAuthErrorToast({
        title: 'Access Restricted',
        badge: 'Read-Only Account',
        message: 'Your account role (Viewer) is read-only and cannot trigger multi-agent workflows.',
        hint: 'Sign in with an authorized account (Owner, Admin, Manager, or Senior Accountant).'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
      return;
    }

    setTargetModalWorkflow(workflowName);
    setLoadingTargets(true);
    try {
      const targets = await getPendingPipelineTargets();
      setPendingTargets(targets || []);
      if (targets && targets.length > 0) {
        setSelectedCaseId(targets[0].id);
      } else {
        setSelectedCaseId(null);
      }
    } catch (err) {
      console.error('Failed to fetch pending targets:', err);
      setPendingTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  };

  // ─── Single Target Pipeline Execution ──────────────────────────────────────
  const handleExecuteSingleTarget = async () => {
    if (!targetModalWorkflow) return;
    try {
      setTriggeringPipeline(true);
      const chosenCase = pendingTargets.find(t => t.id === selectedCaseId);
      const res = await triggerPipelineWorkflow({
        workflow: targetModalWorkflow,
        contextData: {
          caseId: selectedCaseId || 20,
          companyId: chosenCase?.company_id || 1,
          documentId: 1
        },
        priority: 1
      });

      if (res) {
        setActivePipeline(res);
      }
      setTargetModalWorkflow(null);
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

  // ─── Batch Pipeline Execution (Option 2) ───────────────────────────────────
  const handleExecuteBatch = async (workflowName = 'RECONCILIATION_AND_RISK') => {
    if (isViewer) {
      setAuthErrorToast({
        title: 'Access Restricted',
        badge: 'Read-Only Account',
        message: 'Your account role (Viewer) is read-only and cannot trigger batch pipelines.',
        hint: 'Sign in with an authorized account (Owner, Admin, Manager, or Senior Accountant).'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
      return;
    }

    try {
      setBatchRunning(true);
      const res = await batchTriggerPipeline({
        workflow: workflowName,
        caseIds: pendingTargets.map(t => t.id)
      });

      const count = res?.executed || pendingTargets.length || 0;
      setBatchToast(`⚡ Successfully dispatched batch pipeline across ${count} pending transactions!`);
      setTimeout(() => setBatchToast(null), 8000);
      setTargetModalWorkflow(null);
      await fetchControlCenterData();
    } catch (err) {
      console.error('Batch pipeline execution failed:', err);
    } finally {
      setBatchRunning(false);
    }
  };

  // ─── Direct Portfolio Pipeline Trigger ─────────────────────────────────────
  const handleTriggerPortfolioDirect = async () => {
    if (isViewer) {
      setAuthErrorToast({
        title: 'Access Restricted',
        badge: 'Read-Only Account',
        message: 'Your account role (Viewer) is read-only and cannot trigger portfolio workflows.'
      });
      setTimeout(() => setAuthErrorToast(null), 8000);
      return;
    }

    try {
      setTriggeringPipeline(true);
      const res = await triggerPipelineWorkflow({
        workflow: 'PORTFOLIO_AND_ESCALATION',
        contextData: {},
        priority: 1
      });
      if (res) setActivePipeline(res);
      await fetchControlCenterData();
    } catch (err) {
      console.error('Error triggering portfolio pipeline:', err);
    } finally {
      setTriggeringPipeline(false);
    }
  };

  // ─── Inspect Historical Pipeline Inline ────────────────────────────────────
  const handleInspectHistoricalPipeline = async (pipelineId, forceRefresh = false) => {
    if (expandedHistoricalPipelineId === pipelineId && !forceRefresh) {
      setExpandedHistoricalPipelineId(null);
      return;
    }

    try {
      setInspectingPipelineId(pipelineId);
      setExpandedHistoricalPipelineId(pipelineId);
      const detailed = await getPipelineExecutionById(pipelineId);
      setExpandedHistoricalPipelines(prev => ({
        ...prev,
        [pipelineId]: detailed
      }));
    } catch (err) {
      console.error('Failed to fetch pipeline detail:', err);
    } finally {
      setInspectingPipelineId(null);
    }
  };

  // ─── Single Agent Trigger ──────────────────────────────────────────────────
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

      if (agentIdStr === 'agent_5_portfolio') {
        await triggerPortfolioAnalysis();
      } else if (agentIdStr === 'agent_6_notification') {
        await triggerEscalationScan();
      } else {
        await api.post(`/agents/${agentIdStr}/trigger`, { trigger_source: 'manual_ui' });
      }

      await fetchControlCenterData();
    } catch (err) {
      console.error(`Failed to trigger ${agentIdStr}:`, err);
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        setAuthErrorToast({
          title: 'Permission Denied',
          badge: 'Security Policy (PBAC)',
          message: err.response?.data?.message || `You do not have required operational permissions to run ${agentName}.`,
          hint: 'Only Admin, Manager, and Senior Accountant roles may execute live financial agents.'
        });
        setTimeout(() => setAuthErrorToast(null), 8000);
      }
    } finally {
      setTriggeringAgentId(null);
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
    const matchesAgent = !agentFilter || item.agent_id === agentFilter;
    const matchesTrigger = !triggerFilter || item.trigger_source === triggerFilter;
    return matchesAgent && matchesTrigger;
  });

  const filteredModalTargets = pendingTargets.filter(t => {
    if (!targetSearchQuery) return true;
    const q = targetSearchQuery.toLowerCase();
    return (
      String(t.id).includes(q) ||
      (t.transaction_id || '').toLowerCase().includes(q) ||
      (t.sender_name || '').toLowerCase().includes(q) ||
      (t.company_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#ffffff',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}>
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              AI Agent Control & Orchestrator
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
              Multi-agent workflow orchestration, target transaction selection, batch execution & real-time telemetry.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Total Tokens Consumed
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#4f46e5' }}>
              {(overview.total_tokens_consumed || 325451).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>tokens</span>
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', background: '#e2e8f0' }} />

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Worker Queue
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669' }}>
              {queueMetrics?.activeJobsCount || 0} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>active / {queueMetrics?.queuedJobsCount || 0} queued</span>
            </div>
          </div>

          <button
            onClick={fetchControlCenterData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Batch Toast Banner */}
      {batchToast && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '12px',
          padding: '14px 20px',
          color: '#14532d',
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>{batchToast}</span>
          </div>
          <button onClick={() => setBatchToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14532d' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Auth Error Banner */}
      {authErrorToast && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#991b1b' }}>{authErrorToast.title}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>
                  {authErrorToast.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: '600', margin: '2px 0 0' }}>
                {authErrorToast.message}
              </p>
            </div>
          </div>
          <button onClick={() => setAuthErrorToast(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Live Pipeline Visualizer Graph (When active) */}
      {activePipeline && (
        <PipelineVisualizer
          pipeline={activePipeline}
          onClose={() => setActivePipeline(null)}
          onRefresh={fetchControlCenterData}
        />
      )}

      {/* ── MULTI-AGENT PIPELINE ORCHESTRATION CARDS (With Single & Batch Buttons) ── */}
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
              Select a target transaction to launch a single pipeline or trigger a batch run across all open cases.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => handleExecuteBatch('RECONCILIATION_AND_RISK')}
              disabled={batchRunning}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#ffffff', border: 'none',
                borderRadius: '8px', padding: '6px 14px',
                fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
              }}
            >
              <SendHorizontal size={14} />
              <span>{batchRunning ? 'Dispatching Batch...' : '⚡ Batch Run All Pending Cases'}</span>
            </button>

            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', background: '#e0e7ff', padding: '4px 12px', borderRadius: '999px' }}>
              Phase 5 Orchestrator Active
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          
          {/* Pipeline 1: Reconcile & Risk Pipeline */}
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
              <button
                onClick={() => handleOpenTargetModal('RECONCILIATION_AND_RISK')}
                disabled={triggeringPipeline || batchRunning}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: (triggeringPipeline || batchRunning) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Play size={13} />
                <span>Select Target Case</span>
              </button>

              <button
                onClick={() => handleExecuteBatch('RECONCILIATION_AND_RISK')}
                disabled={batchRunning}
                title="Run pipeline for all pending cases in batch"
                style={{
                  background: '#f8fafc',
                  color: '#4f46e5',
                  border: '1.5px solid #c7d2fe',
                  padding: '9px 10px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: batchRunning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Zap size={13} />
                <span>⚡ Batch Run</span>
              </button>
            </div>
          </div>

          {/* Pipeline 2: Portfolio & Escalation Pipeline */}
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
              onClick={handleTriggerPortfolioDirect}
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
              <span>Launch Portfolio Scan</span>
            </button>
          </div>

          {/* Pipeline 3: Full 6-Agent Audit Pipeline */}
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
              <button
                onClick={() => handleOpenTargetModal('END_TO_END_COMPLIANCE')}
                disabled={triggeringPipeline || batchRunning}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: (triggeringPipeline || batchRunning) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Play size={13} />
                <span>Select Target Case</span>
              </button>

              <button
                onClick={() => handleExecuteBatch('END_TO_END_COMPLIANCE')}
                disabled={batchRunning}
                style={{
                  background: '#f8fafc',
                  color: '#7c3aed',
                  border: '1.5px solid #ddd6fe',
                  padding: '9px 10px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: batchRunning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Zap size={13} />
                <span>⚡ Batch All</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── OPTION 1 & 2: TARGET CASE SELECTION & BATCH CONFIGURATION MODAL ── */}
      {targetModalWorkflow && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Configure Pipeline Target Transaction
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                    Workflow: <strong>{targetModalWorkflow.replace(/_/g, ' ')}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetModalWorkflow(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Option Selector Toggle Banner */}
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
                padding: '12px 16px', fontSize: '0.8rem', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="#3b82f6" />
                  <span>Choose a single target transaction below, or dispatch across all pending cases in batch.</span>
                </div>
                <span style={{ fontWeight: '800', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
                  {pendingTargets.length} Pending
                </span>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  placeholder="Search by company name, transaction reference, or Case ID..."
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Pending Targets List */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Available Open Transactions ({filteredModalTargets.length})
                </div>

                {loadingTargets ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#4f46e5' }} />
                    Loading available transactions...
                  </div>
                ) : filteredModalTargets.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '0.82rem' }}>
                    No matching open transactions found. You can still launch default case.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredModalTargets.map(target => {
                      const isSelected = selectedCaseId === target.id;
                      return (
                        <div
                          key={target.id}
                          onClick={() => setSelectedCaseId(target.id)}
                          style={{
                            background: isSelected ? '#f5f3ff' : '#ffffff',
                            border: `1.5px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                            borderRadius: '12px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '50%',
                              border: `2px solid ${isSelected ? '#6366f1' : '#cbd5e1'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1' }} />}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                                  {target.company_name || target.sender_name || 'Unallocated Borrower'}
                                </span>
                                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.68rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>
                                  Case #{target.id}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                                <span>TXN: <code>{target.transaction_id || 'TXN-PENDING'}</code></span>
                                <span>•</span>
                                <span>{target.payment_date ? new Date(target.payment_date).toLocaleDateString() : 'Recent'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#0f172a' }}>
                              ₹{Number(target.amount || 0).toLocaleString('en-IN')}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'capitalize' }}>
                              {target.status || 'open'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Option 2 Batch Trigger from Modal */}
              <button
                onClick={() => handleExecuteBatch(targetModalWorkflow)}
                disabled={batchRunning || triggeringPipeline}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#f1f5f9', border: '1px solid #cbd5e1',
                  color: '#475569', borderRadius: '10px',
                  padding: '9px 16px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <Zap size={14} color="#6366f1" />
                <span>{batchRunning ? 'Batching...' : `⚡ Batch Run All (${pendingTargets.length})`}</span>
              </button>

              {/* Option 1 Single Target Launch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setTargetModalWorkflow(null)}
                  style={{
                    background: 'none', border: '1px solid #cbd5e1',
                    borderRadius: '10px', padding: '9px 16px',
                    fontSize: '0.8rem', fontWeight: '700', color: '#64748b', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecuteSingleTarget}
                  disabled={triggeringPipeline || batchRunning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: '#ffffff', border: 'none',
                    borderRadius: '10px', padding: '9px 20px',
                    fontSize: '0.8rem', fontWeight: '700', cursor: (triggeringPipeline || batchRunning) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <Play size={14} />
                  <span>{triggeringPipeline ? 'Launching Pipeline...' : `Launch for Case #${selectedCaseId || 20}`}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: isComingSoon ? '#f1f5f9' : '#eef2ff',
                      color: isComingSoon ? '#94a3b8' : '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: isComingSoon ? '#94a3b8' : '#0f172a' }}>
                        {agentItem.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {agentItem.id}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    background: isComingSoon ? '#f1f5f9' : '#ecfdf5',
                    color: isComingSoon ? '#94a3b8' : '#059669',
                    border: `1px solid ${isComingSoon ? '#e2e8f0' : '#a7f3d0'}`
                  }}>
                    {isComingSoon ? 'Roadmap' : agentItem.status || 'READY'}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Runs</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{m.total_runs || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Success</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#059669' }}>{m.success_rate != null ? `${m.success_rate}%` : '100%'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Avg Latency</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#4f46e5' }}>{m.avg_duration_ms ? `${m.avg_duration_ms}ms` : '320ms'}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleTriggerAgent(agentItem.id)}
                  disabled={isComingSoon || isRunningThis}
                  title={isViewer ? 'Viewer role is read-only' : `Run ${agentItem.name}`}
                  style={{
                    flex: 1,
                    background: isComingSoon ? '#f1f5f9' : isViewer ? '#f8fafc' : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    color: isComingSoon ? '#94a3b8' : isViewer ? '#94a3b8' : '#ffffff',
                    border: isViewer ? '1px solid #cbd5e1' : 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: (isComingSoon || isRunningThis) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: (!isComingSoon && !isViewer) ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none'
                  }}
                >
                  {isViewer ? <Lock size={12} /> : <Play size={12} />}
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
                    fontSize: '0.78rem',
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

      {/* ── PHASE 5: HISTORICAL PIPELINE RUNS TABLE (With Inline Step Inspection) ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Historical Multi-Agent Pipeline Runs
            </h3>
            <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '2px 0 0' }}>
              Persistent execution ledger recorded in <code>pipeline_executions</code> with linked transaction details and full step trees.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontWeight: '700' }}>Pipeline ID, Name & Linked Entity</th>
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
                pipelineHistory.map(p => {
                  const isExpanded = expandedHistoricalPipelineId === p.id;
                  const detail = expandedHistoricalPipelines[p.id];
                  const isLoadingThis = inspectingPipelineId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          background: isExpanded ? '#f8fafc' : '#ffffff',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>Pipeline #{p.id}: {p.pipeline_name?.replace(/_/g, ' ')}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{formatAuditTimestamp(p.created_at)}</span>
                            {p.linked_company_name && (
                              <span style={{ background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                🏢 {p.linked_company_name}
                              </span>
                            )}
                            {p.linked_transaction_id && (
                              <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                💳 {p.linked_transaction_id}
                              </span>
                            )}
                            {p.linked_case_id && (
                              <span style={{ background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                📄 Case #{p.linked_case_id}
                              </span>
                            )}
                          </div>
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
                              background: isExpanded ? '#4f46e5' : '#ffffff',
                              border: `1px solid ${isExpanded ? '#4338ca' : '#cbd5e1'}`,
                              color: isExpanded ? '#ffffff' : '#4f46e5',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <Eye size={13} />}
                            <span>{isLoadingThis && !detail ? 'Loading...' : isExpanded ? 'Hide Steps' : 'Inspect Steps'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Inline Expanded Row Directly Below the Inspected Pipeline */}
                      {isExpanded && (
                        <tr key={`${p.id}-subrow`} style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                          <td colSpan={6} style={{ padding: '12px 20px 24px 20px' }}>
                            {isLoadingThis && !detail ? (
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#4f46e5' }} />
                                Loading execution step tree for Pipeline #{p.id}...
                              </div>
                            ) : (
                              <PipelineVisualizer
                                pipeline={detail || p}
                                onClose={() => setExpandedHistoricalPipelineId(null)}
                                onRefresh={() => handleInspectHistoricalPipeline(p.id, true)}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* AGENT 7: Anomaly Flags Panel                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '32px' }}>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <ScanSearch size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#ffffff' }}>Agent 7 — Anomaly Flags</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                {anomalyFlags.filter(f => f.status === 'pending').length} pending review
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#ffffff', fontSize: '0.7rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>READ-ONLY DETECTION</span>
            <button onClick={fetchControlCenterData} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '7px 10px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {anomalyFlags.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <ShieldCheck size={40} style={{ marginBottom: '12px', color: '#10b981' }} />
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#059669' }}>No Active Anomaly Flags</p>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>All recent payments cleared anomaly detection checks.</p>
          </div>
        ) : (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {anomalyFlags.map(flag => {
              const severityConfig = {
                CLEAR:    { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', label: 'CLEAR',    icon: <ShieldCheck size={14} color="#16a34a" /> },
                LOW:      { bg: '#fefce8', border: '#fde68a', badge: '#d97706', label: 'LOW',      icon: <AlertCircle size={14} color="#d97706" /> },
                MEDIUM:   { bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c', label: 'MEDIUM',   icon: <AlertTriangle size={14} color="#ea580c" /> },
                HIGH:     { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626', label: 'HIGH',     icon: <ShieldAlert size={14} color="#dc2626" /> },
                CRITICAL: { bg: '#450a0a', border: '#dc2626', badge: '#ffffff', label: 'CRITICAL', icon: <ShieldAlert size={14} color="#ef4444" /> },
              };
              const cfg = severityConfig[flag.severity] || severityConfig.LOW;
              const isExpanded = expandedAnomalyId === flag.id;
              const isActioning = actioningAnomalyId === flag.id;
              const isEscalated = flag.status === 'escalated';
              const types = Array.isArray(flag.anomaly_types) ? flag.anomaly_types : (flag.anomaly_types ? JSON.parse(flag.anomaly_types) : []);

              return (
                <div key={flag.id} style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s ease' }}>
                  {/* Header Row */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      {/* Severity Badge */}
                      <div style={{ background: cfg.badge, color: cfg.label === 'CRITICAL' ? '#ffffff' : '#ffffff', fontSize: '0.65rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {cfg.icon} {cfg.label}
                      </div>
                      {/* Company + Payment */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.85rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {flag.company_name || `Payment #${flag.payment_id}`}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#64748b' }}>
                          Payment #{flag.payment_id} · Score: {parseFloat(flag.anomaly_score || 0).toFixed(0)}/100
                          {flag.isLive && <span style={{ marginLeft: '6px', background: '#4f46e5', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>LIVE</span>}
                        </p>
                      </div>
                      {/* Anomaly Type Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, justifyContent: 'flex-start' }}>
                        {types.map(t => (
                          <span key={t} style={{ background: 'rgba(0,0,0,0.07)', color: '#374151', fontSize: '0.65rem', fontWeight: '600', padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                            {t.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isViewer && (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => setExpandedAnomalyId(isExpanded ? null : flag.id)}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '0.73rem', fontWeight: '600', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} /> {isExpanded ? 'Hide' : 'Details'}
                        </button>
                        {!isEscalated && (
                          <>
                            <button
                              onClick={() => { setDismissModalId(flag.id); setDismissReason(''); }}
                              disabled={isActioning}
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '0.73rem', fontWeight: '600', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <X size={13} /> Dismiss
                            </button>
                            {(flag.severity === 'HIGH' || flag.severity === 'CRITICAL') && (
                              <button
                                onClick={() => handleEscalateAnomaly(flag.id)}
                                disabled={isActioning}
                                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 10px', fontSize: '0.73rem', fontWeight: '600', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {isActioning ? <RefreshCw size={12} className="animate-spin" /> : <ShieldAlert size={13} />}
                                Escalate
                              </button>
                            )}
                          </>
                        )}
                        {isEscalated && (
                          <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' }}>ESCALATED</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${cfg.border}`, padding: '14px 18px', background: 'rgba(255,255,255,0.6)' }}>
                      {flag.explanation && (
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '0.73rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Explanation</p>
                          <p style={{ margin: 0, fontSize: '0.83rem', color: '#374151', lineHeight: '1.6' }}>{flag.explanation}</p>
                        </div>
                      )}
                      {flag.recommendation && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '0.7rem', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' }}><MessageSquare size={11} style={{ marginRight: '4px' }} />Recommendation</p>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e40af' }}>{flag.recommendation}</p>
                        </div>
                      )}
                      {flag.score_breakdown && (
                        <div style={{ marginTop: '10px' }}>
                          <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Score Breakdown</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(typeof flag.score_breakdown === 'string' ? JSON.parse(flag.score_breakdown) : flag.score_breakdown).map(([k, v]) => (
                              <span key={k} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#374151', fontSize: '0.68rem', fontWeight: '600', padding: '3px 9px', borderRadius: '6px' }}>
                                {k.replace(/_/g, ' ')} +{v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dismiss Reason Modal */}
      {dismissModalId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', width: '440px', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Dismiss Anomaly Flag</h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.83rem', color: '#64748b' }}>Provide a brief reason for dismissal. This is stored in the audit trail.</p>
            <textarea
              value={dismissReason}
              onChange={e => setDismissReason(e.target.value)}
              placeholder="e.g. Verified with operations team — legitimate payment from subsidiary account."
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '12px', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setDismissModalId(null); setDismissReason(''); }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Cancel</button>
              <button
                onClick={() => handleDismissAnomaly(dismissModalId)}
                disabled={!dismissReason.trim() || actioningAnomalyId === dismissModalId}
                style={{ background: !dismissReason.trim() ? '#cbd5e1' : '#4f46e5', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: '700', cursor: dismissReason.trim() ? 'pointer' : 'not-allowed', color: '#ffffff' }}
              >
                {actioningAnomalyId === dismissModalId ? 'Dismissing...' : 'Confirm Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

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
