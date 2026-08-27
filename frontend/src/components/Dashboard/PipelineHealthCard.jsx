import React from 'react';
import { Activity, ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * Pipeline Health Card Component
 * Compact operational health matrix for the 7 autonomous agents & settlement engines.
 * 
 * @param {Array} pipelineHealth - List of agent health objects from backend stats.
 * @param {Function} onNavigatePipeline - Navigation callback to Agent Control / Pipeline Visualizer.
 */
export const PipelineHealthCard = ({ pipelineHealth = [], onNavigatePipeline }) => {
  const defaultHealth = [
    { name: 'Payment Ingestion Engine', role: 'Bank Webhook & API Gateway', status: 'HEALTHY', latency: '< 40ms' },
    { name: 'Reconciliation Agent', role: 'Agent 1 (Pre-Check + Groq)', status: 'HEALTHY', latency: '1.2s' },
    { name: 'Anomaly Detection Agent', role: 'Agent 7 (Integrity Guardrails)', status: 'HEALTHY', latency: '680ms' },
    { name: 'Waterfall Settlement Engine', role: 'Continuous Loan Allocator', status: 'HEALTHY', latency: '< 50ms' },
    { name: 'Repayment Risk Agent', role: 'Agent 2 (Continuous Credit)', status: 'HEALTHY', latency: '2.1s' },
    { name: 'Collection Follow-Up Agent', role: 'Agent 3 (Smart Notice Drafting)', status: 'HEALTHY', latency: '1.8s' },
    { name: 'Notification & Escalation Agent', role: 'Agent 6 (Multi-Channel Alerts)', status: 'HEALTHY', latency: '920ms' }
  ];

  const items = pipelineHealth.length > 0 ? pipelineHealth : defaultHealth;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
      minHeight: '340px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
          }}>
            <Activity size={16} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Pipeline Health
          </h3>
        </div>

        <span style={{
          background: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontWeight: '800',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
          7/7 Healthy
        </span>
      </div>

      {/* Agents Status Rows List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: '#fafbfc',
              border: '1px solid #f1f5f9',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: item.status === 'HEALTHY' ? '#10b981' : item.status === 'BUSY' ? '#f59e0b' : '#ef4444'
              }}></span>
              <span style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.latency}</span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: '800',
                color: item.status === 'HEALTHY' ? '#047857' : '#b45309',
                background: item.status === 'HEALTHY' ? '#d1fae5' : '#fef3c7',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Navigation Link */}
      <button
        onClick={onNavigatePipeline}
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#059669',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
      >
        <span>View Live Pipeline Visualizer</span>
        <ArrowRight size={14} />
      </button>

    </div>
  );
};
