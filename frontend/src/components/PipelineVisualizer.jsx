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
  Hash
} from 'lucide-react';

/**
 * Component: PipelineVisualizer (Phase 5 Multi-Agent Orchestrator)
 * Purpose: Renders an interactive real-time visual execution graph of a multi-agent workflow,
 *          tracking step progression, latency in ms, token usage, and inspectable output payloads.
 */
export const PipelineVisualizer = ({ pipeline, onClose, onRefresh }) => {
  const [selectedStep, setSelectedStep] = useState(null);

  if (!pipeline) return null;

  const steps = pipeline.steps || [];
  const isRunning = pipeline.status === 'running' || pipeline.status === 'queued';
  const isCompleted = pipeline.status === 'completed';
  const isFailed = pipeline.status === 'failed';

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
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Pipeline #{pipeline.id}: {pipeline.pipeline_name}</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  background: isRunning ? '#eff6ff' : isCompleted ? '#ecfdf5' : '#fef2f2',
                  color: isRunning ? '#2563eb' : isCompleted ? '#059669' : '#dc2626',
                  border: `1px solid ${isRunning ? '#bfdbfe' : isCompleted ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {pipeline.status}
                </span>
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Trigger: <strong>{pipeline.trigger_source}</strong></span>
                {pipeline.correlation_id && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Hash size={12} />
                    <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>{pipeline.correlation_id}</code>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Badges */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '8px 14px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Duration</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              {pipeline.duration_ms ? `${pipeline.duration_ms}ms` : isRunning ? 'Running...' : '0ms'}
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '8px 14px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Tokens</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5' }}>
              {pipeline.total_tokens || 0}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert if failed */}
      {pipeline.error_message && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#dc2626',
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
                  onClick={() => setSelectedStep(step)}
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
                    <span>{step.duration_ms ? `${step.duration_ms}ms` : step.status === 'running' ? 'Active...' : '-'}</span>
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
              width: '560px',
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
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Status: <strong style={{ color: selectedStep.status === 'completed' ? '#059669' : '#dc2626' }}>{selectedStep.status}</strong> · Duration: {selectedStep.duration_ms || 0}ms · Tokens: {selectedStep.tokens_used || 0}
                </div>
              </div>
              <button
                onClick={() => setSelectedStep(null)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedStep.error_message && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626', marginBottom: '6px' }}>Error Details</div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', fontWeight: '600' }}>
                    {selectedStep.error_message}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>Structured Output Payload</div>
                <pre style={{
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  lineHeight: 1.4,
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(selectedStep.output_payload || {}, null, 2)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', marginBottom: '6px' }}>Input Context Payload</div>
                <pre style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  lineHeight: 1.4,
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(selectedStep.input_payload || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineVisualizer;
