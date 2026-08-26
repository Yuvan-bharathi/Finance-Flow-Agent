import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  MinusCircle,
  Eye,
  X,
  Code,
  Layers,
  ArrowRight,
  Cpu,
  Hash,
  Mail,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  DollarSign,
  Calendar,
  Building,
  FileText,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Component: Executive Step Business Inspector View
 * Renders role-appropriate, beautifully formatted financial cards instead of raw JSON code.
 */
const StepBusinessView = ({ step, user }) => {
  const [copied, setCopied] = useState(false);
  const output = step.output_payload || {};
  const isSkipped = step.status === 'skipped' || output.skipped === true || output.status === 'SKIPPED';

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SKIPPED STEP VIEW (e.g. Zero Overdue / Good Standing)
  // ───────────────────────────────────────────────────────────────────────────
  if (isSkipped) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1.5px solid #86efac',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: '#dcfce7', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
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

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AGENT 3: AUTOMATED COLLECTION FOLLOW-UP (Email Draft Notice Card)
  // ───────────────────────────────────────────────────────────────────────────
  if (step.agent_name === 'AutomatedCollectionFollowUpAgent') {
    const urgency = output.urgency_level || 'POLITE_REMINDER';
    const isHighUrgency = urgency === 'FINAL_DEMAND' || urgency === 'URGENT_WARNING';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Urgency & Debt Header */}
        <div style={{
          background: isHighUrgency ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${isHighUrgency ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
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
              ₹{Number(output.total_overdue_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Email Metadata Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: '700', color: '#64748b', width: '70px' }}>Recipient:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>{output.recipient_name || 'Borrower Representative'}</span>
            <span style={{ color: '#64748b', fontSize: '0.775rem' }}>&lt;{output.recipient_email}&gt;</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: '700', color: '#64748b', width: '70px' }}>Subject:</span>
            <span style={{ fontWeight: '700', color: '#334155' }}>{output.subject}</span>
          </div>
        </div>

        {/* Formatted Email Notice Body Box */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>Drafted Collection Notice</span>
            <button
              onClick={() => handleCopy(output.email_body || '')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: copied ? '#ecfdf5' : '#f1f5f9',
                border: `1px solid ${copied ? '#a7f3d0' : '#cbd5e1'}`,
                color: copied ? '#059669' : '#334155',
                padding: '5px 12px', borderRadius: '8px',
                fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
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
            whiteSpace: 'pre-line'
          }}>
            {output.email_body}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AGENT 1: RECONCILIATION AGENT CARD
  // ───────────────────────────────────────────────────────────────────────────
  if (step.agent_name === 'PaymentReconciliationAgent') {
    const isMatched = output.status === 'MATCHED' || output.status === 'auto_matched';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          background: isMatched ? '#f0fdf4' : '#fffbeb',
          border: `1.5px solid ${isMatched ? '#86efac' : '#fde68a'}`,
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: isMatched ? '#166534' : '#92400e', textTransform: 'uppercase' }}>
              Reconciliation Outcome
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: isMatched ? '#15803d' : '#b45309', marginTop: '2px' }}>
              {output.status ? output.status.toUpperCase() : 'PROCESSED'}
            </div>
          </div>
          <div style={{
            background: isMatched ? '#dcfce7' : '#fef3c7',
            color: isMatched ? '#166534' : '#92400e',
            padding: '6px 14px', borderRadius: '20px',
            fontSize: '0.825rem', fontWeight: '800'
          }}>
            Score: {Math.round(Number(output.confidence_score || 0.95) * 100)}% Match
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.825rem', color: '#334155' }}>
            <strong>Target Loan Schedule:</strong> #{output.target_schedule_id || output.recommended_schedule_id || 'Auto-Resolved'}
          </div>
          <div style={{ fontSize: '0.825rem', color: '#334155' }}>
            <strong>Analysis Rationale:</strong> {output.reason || output.resolution_reason || 'Identified matching loan invoice from repayment ledger.'}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AGENT 2: RISK ASSESSMENT CARD
  // ───────────────────────────────────────────────────────────────────────────
  if (step.agent_name === 'RepaymentRiskAssessmentAgent') {
    const risk = output.risk_level || 'LOW';
    const isCritical = risk === 'HIGH' || risk === 'CRITICAL';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          background: isCritical ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${isCritical ? '#fecaca' : '#86efac'}`,
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: isCritical ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>
              Borrower Credit Risk
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: isCritical ? '#dc2626' : '#15803d', marginTop: '2px' }}>
              {risk} RISK
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Exposure Balance</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
              ₹{Number(output.overdue_amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {Array.isArray(output.key_risk_factors) && output.key_risk_factors.length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
              Key Risk Factors Identified
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#334155', lineHeight: '1.5' }}>
              {output.key_risk_factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. GENERIC BUSINESS SUMMARY FOR OTHER AGENTS
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
        {step.agent_name.replace(/Agent$/, '')} Completed
      </div>
      <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.5' }}>
        {output.summary || output.message || 'Step executed and recorded in operational ledger.'}
      </div>
    </div>
  );
};

/**
 * Main Component: PipelineVisualizer
 */
export const PipelineVisualizer = ({ pipeline, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [selectedStep, setSelectedStep] = useState(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  if (!pipeline) return null;

  const steps = pipeline.steps || [];
  const isRunning = pipeline.status === 'running' || pipeline.status === 'queued';
  const isCompleted = pipeline.status === 'completed';
  const isFailed = pipeline.status === 'failed';

  const userRole = (user?.role_name || user?.role || '').toLowerCase();
  const canViewTechDetails = ['owner', 'super_admin', 'admin', 'senior_accountant', 'manager'].includes(userRole);

  const getStepIcon = (status) => {
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

  const getStepBadgeColor = (status) => {
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
      position: 'relative'
    }}>
      {/* 1. Pipeline Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isRunning ? '#eff6ff' : isCompleted ? '#ecfdf5' : '#fef2f2',
              color: isRunning ? '#3b82f6' : isCompleted ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Pipeline #{pipeline.id}: {pipeline.workflow_name || 'Autonomous Multi-Agent Workflow'}
                </h2>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  background: getStepBadgeColor(pipeline.status).bg,
                  border: `1px solid ${getStepBadgeColor(pipeline.status).border}`,
                  color: getStepBadgeColor(pipeline.status).text
                }}>
                  {pipeline.status}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '12px' }}>
                <span>Trigger: <strong>{pipeline.trigger_source || 'manual'}</strong></span>
                {pipeline.correlation_id && <span># <code>{pipeline.correlation_id}</code></span>}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 16px'
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
                color: '#475569'
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
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Error Banner if Failed */}
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
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{pipeline.error_message}</span>
        </div>
      )}

      {/* 2. Step Flow Visualizer Graph */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: `${steps.length * 240}px`, gap: '16px' }}>
          {steps.map((step, idx) => {
            const styleProps = getStepBadgeColor(step.status);
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={step.id || idx}>
                {/* Step Node Card */}
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
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                    {step.agent_name.replace(/Agent$/, '')} Agent
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                    <span>
                      {step.status === 'skipped' ? 'Skipped (₹0 Overdue)' : step.duration_ms ? `${step.duration_ms}ms` : step.status === 'running' ? 'Active...' : '-'}
                    </span>
                    <span style={{ fontWeight: '700', color: '#4f46e5' }}>{step.tokens_used ? `${step.tokens_used} tok` : ''}</span>
                  </div>
                </div>

                {/* Arrow Connector */}
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

      {/* 3. Step Output Inspector Drawer / Modal */}
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
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Step #{selectedStep.step_index}: {selectedStep.agent_name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                  Status: <strong style={{
                    color: selectedStep.status === 'completed' ? '#059669' : selectedStep.status === 'skipped' ? '#d97706' : '#dc2626'
                  }}>
                    {selectedStep.status.toUpperCase()}
                  </strong> · Duration: {selectedStep.duration_ms || 0}ms · Tokens: {selectedStep.tokens_used || 0}
                </div>
              </div>
              <button
                onClick={() => setSelectedStep(null)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {selectedStep.error_message && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626', marginBottom: '6px' }}>Error Details</div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', fontWeight: '600' }}>
                    {selectedStep.error_message}
                  </div>
                </div>
              )}

              {/* Business-Friendly Executive Card */}
              <StepBusinessView step={selectedStep} user={user} />

              {/* Permission-Gated Technical Details Accordion */}
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
                      color: '#475569'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Code size={16} color="#6366f1" />
                      <span>View Technical Payload & Debug Telemetry</span>
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
                          fontFamily: 'monospace'
                        }}>
                          {JSON.stringify(selectedStep.output_payload || {}, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Input Context JSON
                        </div>
                        <pre style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          padding: '12px',
                          borderRadius: '10px',
                          fontSize: '0.725rem',
                          overflowX: 'auto',
                          lineHeight: 1.4,
                          margin: 0,
                          fontFamily: 'monospace'
                        }}>
                          {JSON.stringify(selectedStep.input_payload || {}, null, 2)}
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
