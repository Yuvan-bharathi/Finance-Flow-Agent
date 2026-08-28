import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  MinusCircle,
  X,
  Code,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types/auth';

interface StepOutputPayload {
  skipped?: boolean;
  status?: string;
  reason?: string;
  message?: string;
  urgency_level?: string;
  total_overdue_amount?: number;
  overdue_amount?: number;
  recipient_name?: string;
  recipient_email?: string;
  subject?: string;
  email_subject?: string;
  email_body?: string;
  message_draft?: string;
  case?: { id?: number; sender_name?: string; amount?: number; sender_account?: string; transaction_id?: string };
  caseId?: number;
  precheck?: { reasons?: string[]; result?: string; score?: number; durationMs?: number };
  recommendation?: { confidence_score?: number; reasoning?: string; recommended_loan_id?: number; recommended_schedule_id?: number };
  tokens?: { total?: number };
  confidence_score?: number;
  tokens_used?: number;
  run_id?: number | string;
  groq_called?: boolean;
  anomaly_score?: number;
  score?: number;
  severity?: string;
  anomaly_types?: string[];
  recommended_action?: string;
  safe_to_allocate?: boolean;
  requires_manual_review?: boolean;
  explanation?: string;
  ai_reasoning?: string;
  summary?: string;
  risk_score?: number;
  continuous_score?: number;
  risk_level?: string;
  risk_tier?: string;
  key_risk_factors?: string[];
  factors?: string[];
  total_exposure?: number;
  company_name?: string;
  company_id?: number;
  mitigation_plan?: string;
  analysis?: string;
  [key: string]: unknown;
}

export interface PipelineStep {
  id?: number | string;
  step_index: number;
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | string;
  duration_ms?: number;
  tokens_used?: number;
  output_payload?: StepOutputPayload;
  input_payload?: Record<string, unknown>;
  error_message?: string;
}

export interface PipelineData {
  id: number | string;
  pipeline_name?: string;
  workflow_name?: string;
  status: 'pending' | 'running' | 'queued' | 'completed' | 'failed' | string;
  linked_company_name?: string;
  linked_transaction_id?: string;
  linked_case_id?: number | string;
  trigger_source?: string;
  correlation_id?: string;
  duration_ms?: number;
  total_tokens?: number;
  error_message?: string;
  steps?: PipelineStep[];
}

interface StepBusinessViewProps {
  step: PipelineStep;
  user: User | null;
}

export const formatAgentName = (rawName: string): string => {
  if (!rawName) return '';
  const knownNames: Record<string, string> = {
    PaymentReconciliationAgent: 'Payment Reconciliation Agent',
    AnomalyDetectionAgent: 'Anomaly Detection Agent',
    RepaymentRiskAssessmentAgent: 'Repayment Risk Assessment Agent',
    AutomatedCollectionFollowUpAgent: 'Automated Collection Follow-Up Agent',
    AccountingLedgerAgent: 'Accounting Ledger & ERP Sync Agent',
    ComplianceAuditAgent: 'Compliance & Audit Trail Agent',
    MultiChannelNotificationAgent: 'Multi-Channel Notification Agent',
  };
  if (knownNames[rawName]) return knownNames[rawName];

  const clean = rawName.replace(/Agent$/, '').trim();
  const withSpaces = clean
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
  return withSpaces.endsWith('Agent') ? withSpaces : `${withSpaces} Agent`;
};

/**
 * Component: Executive Step Business Inspector View
 */
const StepBusinessView = ({ step }: StepBusinessViewProps) => {
  const [copied, setCopied] = useState(false);
  const output = step.output_payload || {};
  const isSkipped = step.status === 'skipped' || output.skipped === true || output.status === 'SKIPPED';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // 1. SKIPPED STEP VIEW
  if (isSkipped) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1.5px solid #86efac',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: '#dcfce7', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#14532d' }}>
              No Action Required — Account in Good Standing
            </div>
            <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '2px' }}>
              {output.reason || output.message || 'Borrower has zero pending or overdue payments. Step was skipped by orchestrator.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '4px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Overdue Balance</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#166534', marginTop: '2px' }}>₹0.00</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Days Overdue</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#166534', marginTop: '2px' }}>0 Days</div>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Workflow Status</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>SKIPPED (HEALTHY)</div>
          </div>
        </div>
      </div>
    );
  }

  // 2. AGENT 3: AUTOMATED COLLECTION FOLLOW-UP
  if (step.agent_name === 'AutomatedCollectionFollowUpAgent') {
    const urgency = output.urgency_level || 'POLITE_REMINDER';
    const isHighUrgency = urgency === 'FINAL_DEMAND' || urgency === 'URGENT_WARNING';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: isHighUrgency ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${isHighUrgency ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: isHighUrgency ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>
              Collection Urgency
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: isHighUrgency ? '#dc2626' : '#15803d', marginTop: '2px' }}>
              {urgency.replace(/_/g, ' ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Total Overdue
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
              ₹{Number(output.total_overdue_amount || output.overdue_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: '700', color: '#64748b', width: '75px' }}>Recipient:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>{output.recipient_name || 'Borrower Representative'}</span>
            {output.recipient_email && <span style={{ color: '#64748b', fontSize: '0.775rem' }}>&lt;{output.recipient_email}&gt;</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: '700', color: '#64748b', width: '75px' }}>Subject:</span>
            <span style={{ fontWeight: '700', color: '#334155' }}>{output.subject || output.email_subject || 'Payment Follow-Up Notice'}</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>Drafted Collection Notice</span>
            <button
              onClick={() => handleCopy(output.email_body || output.message_draft || '')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: copied ? '#ecfdf5' : '#f1f5f9',
                border: `1px solid ${copied ? '#a7f3d0' : '#cbd5e1'}`,
                color: copied ? '#059669' : '#334155',
                padding: '5px 12px', borderRadius: '8px',
                fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Draft'}</span>
            </button>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '0.825rem',
            lineHeight: '1.6',
            color: '#1e293b',
            whiteSpace: 'pre-line',
          }}>
            {output.email_body || output.message_draft || 'No message drafted.'}
          </div>
        </div>
      </div>
    );
  }

  // 3. AGENT 1: RECONCILIATION AGENT
  if (step.agent_name === 'PaymentReconciliationAgent') {
    const caseData = output.case || {};
    const precheck = output.precheck || {};
    const rec = output.recommendation || {};
    const tokens = output.tokens || {};
    const confidenceScore = rec.confidence_score !== undefined ? rec.confidence_score : (output.confidence_score !== undefined ? output.confidence_score : 35);
    const isMatched = confidenceScore >= 70 || output.status === 'MATCHED' || output.status === 'auto_matched';
    const isFallback = confidenceScore < 50 || precheck.result === 'no_match';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: isMatched ? '#f0fdf4' : isFallback ? '#fffbeb' : '#f8fafc',
          border: `1.5px solid ${isMatched ? '#86efac' : isFallback ? '#fde68a' : '#e2e8f0'}`,
          borderRadius: '14px',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: isMatched ? '#166534' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reconciliation Outcome
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: isMatched ? '#15803d' : '#b45309', marginTop: '2px' }}>
              {isMatched ? 'AUTO-MATCHED & VERIFIED' : isFallback ? 'FLAGGED FOR MANUAL REVIEW' : 'PROCESSED'}
            </div>
          </div>
          <div style={{
            background: isMatched ? '#dcfce7' : '#fef3c7',
            color: isMatched ? '#166534' : '#92400e',
            border: `1px solid ${isMatched ? '#86efac' : '#fde68a'}`,
            padding: '6px 14px', borderRadius: '20px',
            fontSize: '0.85rem', fontWeight: '900',
          }}>
            Match Score: {confidenceScore}%
          </div>
        </div>

        {(caseData.id || output.caseId) && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Target Transaction Details</span>
              <span style={{ color: '#4f46e5' }}>Case #{caseData.id || output.caseId}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Sender Name</span>
                <strong style={{ color: '#0f172a' }}>{caseData.sender_name || 'Apex Logistic'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Deposit Amount</span>
                <strong style={{ color: '#0f172a' }}>₹{Number(caseData.amount || 100000).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', marginBottom: '6px' }}>
            Stage 2: AI Reasoning &amp; Allocation Decision
          </div>
          <div style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {rec.reasoning || (output.reasoning as string) || output.reason || 'Flagged for accountant review.'}
          </div>
        </div>

        {(tokens.total || output.tokens_used || output.run_id) && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
            <div>
              <span>Model: <strong style={{ color: '#0f172a' }}>{output.groq_called ? 'Groq LLaMA-3.3 70B' : 'Deterministic Hybrid'}</strong></span>
              {output.run_id && <span style={{ marginLeft: '8px' }}>• Run ID: <code>#{output.run_id}</code></span>}
            </div>
            <div style={{ fontWeight: '800', color: '#4f46e5' }}>
              {(tokens.total || output.tokens_used || 0).toLocaleString()} tokens consumed
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. AGENT 7: ANOMALY DETECTION
  if (step.agent_name === 'AnomalyDetectionAgent') {
    const rawScore = output.anomaly_score !== undefined ? output.anomaly_score : (output.score !== undefined ? output.score : 0);
    const severity = output.severity || (rawScore > 60 ? 'HIGH' : rawScore > 25 ? 'MEDIUM' : 'CLEAR');
    const isAnomaly = severity === 'HIGH' || severity === 'CRITICAL' || severity === 'MEDIUM';
    const types = Array.isArray(output.anomaly_types) ? output.anomaly_types : [];
    const safeToAllocate = output.safe_to_allocate !== false;
    const requiresReview = isAnomaly || output.requires_manual_review !== false;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: isAnomaly ? '#fff7ed' : '#f0fdf4',
          border: `1.5px solid ${isAnomaly ? '#fed7aa' : '#86efac'}`,
          borderRadius: '14px',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: isAnomaly ? '#9a3412' : '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Transaction Anomaly Check (Agent 7)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: isAnomaly ? '#c2410c' : '#15803d', marginTop: '2px' }}>
              {severity} SEVERITY
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: isAnomaly ? '#ffedd5' : '#dcfce7',
              color: isAnomaly ? '#9a3412' : '#166534',
              padding: '6px 14px', borderRadius: '20px',
              fontSize: '0.85rem', fontWeight: '900',
            }}>
              Score: {Math.round(Number(rawScore))}/100
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              background: safeToAllocate ? '#ecfdf5' : '#fef2f2',
              color: safeToAllocate ? '#065f46' : '#991b1b',
              border: `1px solid ${safeToAllocate ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '5px',
            }}>
              {safeToAllocate ? '🟢 Safe for Waterfall Allocation' : '🔴 Holds Allocation'}
            </span>
            {requiresReview && (
              <span style={{
                background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
                fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '5px',
              }}>
                🟡 Manual Review Required
              </span>
            )}
          </div>

          {types.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {types.map(t => (
                <span key={t} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>
                  ⚠️ {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. AGENT 2: RISK ASSESSMENT
  if (step.agent_name === 'RepaymentRiskAssessmentAgent') {
    const rawScore = output.risk_score !== undefined ? output.risk_score : (output.continuous_score !== undefined ? output.continuous_score : 18);
    const risk = output.risk_level || output.risk_tier || (rawScore > 65 ? 'CRITICAL' : rawScore > 35 ? 'MEDIUM' : 'LOW');
    const isCritical = risk === 'HIGH' || risk === 'CRITICAL';
    const factors = Array.isArray(output.key_risk_factors) ? output.key_risk_factors : (Array.isArray(output.factors) ? output.factors : []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: isCritical ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${isCritical ? '#fecaca' : '#86efac'}`,
          borderRadius: '14px',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: isCritical ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Borrower Credit Risk (Agent 2)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: isCritical ? '#dc2626' : '#15803d', marginTop: '2px' }}>
              {risk} RISK ({Math.round(Number(rawScore))}/100)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Overdue Exposure</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              ₹{Number(output.overdue_amount || output.total_exposure || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
            Key Risk Factors &amp; Assessment
          </div>
          {factors.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#334155', lineHeight: '1.5' }}>
              {factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: '1.5' }}>
              {output.summary || output.analysis || 'Borrower exhibits steady payment velocity with low default probability.'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. DEFAULT BUSINESS SUMMARY
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
        {formatAgentName(step.agent_name)} Execution Summary
      </div>
      <div style={{ fontSize: '0.825rem', color: '#334155', lineHeight: '1.6' }}>
        {output.summary || output.message || output.explanation || 'Step executed successfully and recorded in operational audit ledger.'}
      </div>
    </div>
  );
};

interface PipelineVisualizerProps {
  pipeline: PipelineData;
  onClose?: () => void;
  onRefresh?: () => void;
}

/**
 * Main Component: PipelineVisualizer
 */
export const PipelineVisualizer = ({ pipeline, onClose, onRefresh }: PipelineVisualizerProps) => {
  const { user } = useAuth();
  const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  if (!pipeline) return null;

  const steps = pipeline.steps || [];
  const isRunning = pipeline.status === 'running' || pipeline.status === 'queued';
  const isCompleted = pipeline.status === 'completed';

  const userRole = ((user as unknown as Record<string, string>)?.role_name || user?.role || '').toLowerCase();
  const canViewTechDetails = ['owner', 'super_admin', 'admin', 'senior_accountant', 'manager'].includes(userRole);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw size={18} className="animate-spin" color="#3b82f6" />;
      case 'completed':
        return <CheckCircle2 size={18} color="#10b981" />;
      case 'failed':
        return <AlertTriangle size={18} color="#ef4444" />;
      case 'skipped':
        return <MinusCircle size={18} color="#f59e0b" />;
      default:
        return <Clock size={18} color="#94a3b8" />;
    }
  };

  const getStepBadgeColor = (status: string) => {
    switch (status) {
      case 'running':
        return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', ring: '0 0 0 4px rgba(59, 130, 246, 0.15)' };
      case 'completed':
        return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', ring: 'none' };
      case 'failed':
        return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', ring: '0 0 0 4px rgba(239, 68, 68, 0.15)' };
      case 'skipped':
        return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', ring: 'none' };
      default:
        return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', ring: 'none' };
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      position: 'relative',
    }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 380px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: isRunning ? '#eff6ff' : isCompleted ? '#ecfdf5' : '#fef2f2',
            color: isRunning ? '#3b82f6' : isCompleted ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}>
            <Zap size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Pipeline #{pipeline.id}: {pipeline.pipeline_name?.replace(/_/g, ' ') || pipeline.workflow_name || 'Autonomous Multi-Agent Workflow'}
              </h2>
              <span style={{
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.7rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                background: getStepBadgeColor(pipeline.status).bg,
                border: `1px solid ${getStepBadgeColor(pipeline.status).border}`,
                color: getStepBadgeColor(pipeline.status).text,
              }}>
                {pipeline.status}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {pipeline.linked_company_name && (
                <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  🏢 Borrower: {pipeline.linked_company_name}
                </span>
              )}
              {pipeline.linked_transaction_id && (
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  💳 Transaction: {pipeline.linked_transaction_id}
                </span>
              )}
              {pipeline.linked_case_id && (
                <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  📄 Reconciliation Case #{pipeline.linked_case_id}
                </span>
              )}
              <span>Trigger: <strong>{pipeline.trigger_source || 'manual'}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: 'auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 14px',
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Duration</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>{pipeline.duration_ms ? `${pipeline.duration_ms}ms` : '-'}</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Total Tokens</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#4f46e5' }}>{pipeline.total_tokens || 0}</div>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh Pipeline Telemetry"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: '700',
                color: '#475569',
              }}
            >
              <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              title="Close Visualizer"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {pipeline.error_message && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#991b1b',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertTriangle size={18} />
          <span>{pipeline.error_message}</span>
        </div>
      )}

      {/* 2. Step Graph */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: `${steps.length * 240}px`, gap: '16px' }}>
          {steps.map((step, idx) => {
            const styleProps = getStepBadgeColor(step.status);
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={step.id || idx}>
                <div
                  onClick={() => { setSelectedStep(step); setShowTechDetails(false); }}
                  style={{
                    flex: '1 0 220px',
                    maxWidth: '260px',
                    background: '#ffffff',
                    border: `1.5px solid ${styleProps.border}`,
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: styleProps.ring !== 'none' ? styleProps.ring : '0 2px 8px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                      Step #{step.step_index}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getStepIcon(step.status)}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>
                    {formatAgentName(step.agent_name)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                    <span>
                      {step.status === 'skipped' ? 'Skipped (₹0 Overdue)' : step.duration_ms ? `${step.duration_ms}ms` : step.status === 'running' ? 'Active...' : '-'}
                    </span>
                    <span style={{ fontWeight: '700', color: '#4f46e5' }}>{step.tokens_used ? `${step.tokens_used} tok` : ''}</span>
                  </div>
                </div>

                {!isLast && (
                  <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1' }}>
                    <ArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Step Output Inspector Drawer */}
      {selectedStep && (
        <div
          onClick={() => setSelectedStep(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
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
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Step #{selectedStep.step_index}: {formatAgentName(selectedStep.agent_name)}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                  Status: <strong style={{
                    color: selectedStep.status === 'completed' ? '#059669' : selectedStep.status === 'skipped' ? '#d97706' : '#dc2626',
                  }}>
                    {selectedStep.status.toUpperCase()}
                  </strong> · Duration: {(selectedStep.duration_ms || 0).toLocaleString()}ms
                </div>
              </div>
              <button
                onClick={() => setSelectedStep(null)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {selectedStep.error_message && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626', marginBottom: '6px' }}>Error Details</div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', fontWeight: '600' }}>
                    {selectedStep.error_message}
                  </div>
                </div>
              )}

              <StepBusinessView step={selectedStep} user={user} />

              {canViewTechDetails && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                  <button
                    onClick={() => setShowTechDetails(prev => !prev)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      color: '#475569',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Code size={16} color="#6366f1" />
                      <span>View Technical Payload &amp; Debug Telemetry</span>
                    </div>
                    {showTechDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showTechDetails && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Structured Output JSON
                        </div>
                        <pre style={{
                          background: '#0f172a',
                          color: '#38bdf8',
                          padding: '14px',
                          borderRadius: '12px',
                          fontSize: '0.725rem',
                          overflowX: 'auto',
                          lineHeight: 1.4,
                          margin: 0,
                          fontFamily: 'monospace',
                        }}>
                          {JSON.stringify(selectedStep.output_payload || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineVisualizer;
