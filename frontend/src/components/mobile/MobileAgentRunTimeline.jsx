import React, { useState } from 'react';
import { CheckCircle2, Clock, Cpu, Zap, ChevronDown, ChevronUp, Bot, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: MobileAgentRunTimeline
 * 
 * Purpose:
 *   Mobile-optimized expandable timeline for inspecting Agent run execution steps,
 *   token usage metrics, Groq latency, and audit logs.
 */
export const MobileAgentRunTimeline = ({ run = {} }) => {
  const [expanded, setExpanded] = useState(true);

  const toggleExpand = () => {
    triggerHaptic('light');
    setExpanded(!expanded);
  };

  const steps = [
    { title: 'Trigger Initiated', time: '09:41:02', detail: 'Event validation and payload parsing', status: 'done' },
    { title: 'Rule-Based Pre-check', time: '09:41:03', detail: 'Score calculated: 70%', status: 'done' },
    { title: 'Database Fact Extraction', time: '09:41:03', detail: 'Bank account match (+40), Amount match (+30)', status: 'done' },
    { title: 'Groq LLM Reasoning', time: '09:41:04', detail: `${run.tokens_used || 761} output tokens generated`, status: 'done' },
    { title: 'Recommendation Finalized', time: '09:41:05', detail: 'Logged to audit trail with Human-in-the-loop requirement', status: 'done' }
  ];

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
            Run #{run.id || 28} — {run.agent_name || 'Agent 1'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Duration: {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '2.4s'} • Model: Groq Qwen
          </div>
        </div>

        <span style={{
          background: '#f0fdf4',
          color: '#16a34a',
          border: '1px solid #bbf7d0',
          fontSize: '0.7rem',
          fontWeight: '800',
          padding: '3px 8px',
          borderRadius: '6px'
        }}>
          COMPLETED
        </span>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        background: '#f8fafc',
        padding: '8px',
        borderRadius: '10px',
        fontSize: '0.7rem'
      }}>
        <div>
          <span style={{ color: '#64748b' }}>Tokens:</span>{' '}
          <strong style={{ color: '#4f46e5' }}>{run.tokens_used ? run.tokens_used.toLocaleString() : '1,024'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Confidence:</span>{' '}
          <strong style={{ color: '#16a34a' }}>90%</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Audit:</span>{' '}
          <strong style={{ color: '#0f172a' }}>VERIFIED</strong>
        </div>
      </div>

      {/* Expandable Execution Timeline */}
      <div>
        <button
          onClick={toggleExpand}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '4px 0',
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#4f46e5',
            cursor: 'pointer'
          }}
        >
          <span>Execution Timeline</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid #e2e8f0' }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{ position: 'relative', paddingLeft: '12px' }}>
                <div style={{
                  position: 'absolute',
                  left: '-14px',
                  top: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4f46e5'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    {step.time}
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAgentRunTimeline;
