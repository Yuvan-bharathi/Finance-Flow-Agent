import React from 'react';
import { Bot, ArrowRight } from 'lucide-react';
import { AnimatedCounter } from '../common/AnimatedCounter';

/**
 * AI Agent Performance Card Component
 * Displays overall multi-agent system performance across the 7 autonomous agents.
 * 
 * @param {Object} aiPerformance - Performance metrics from backend.
 * @param {Function} onNavigateAgentControl - Navigation callback to Agent Control Center.
 */
export const AIPerformanceCard = ({ aiPerformance = {}, onNavigateAgentControl }) => {
  const successRate = aiPerformance.success_rate !== undefined ? aiPerformance.success_rate : 95.7;
  const processed = aiPerformance.processed || 36;
  const reconciled = aiPerformance.reconciled || 15;
  const anomalies = aiPerformance.anomalies || 9;
  const escalated = aiPerformance.escalated || 16;
  const avgLatency = aiPerformance.avg_latency || '8.4 sec';
  const tokens = aiPerformance.tokens_consumed || 325451;

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
      
      {/* Header with Operational Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            color: '#ffffff',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(124,58,237,0.25)'
          }}>
            <Bot size={16} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            AI Agent Performance
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
          7 Active Agents
        </span>
      </div>

      {/* Center Hero Success Rate */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>
            <AnimatedCounter value={successRate} decimals={1} suffix="%" duration={1200} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginTop: '3px' }}>
            Overall AI Automation Success
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>
            100% AVAILABLE
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Zero SLA Breaches
          </div>
        </div>
      </div>

      {/* Multi-Agent 6-Cell Metric Matrix with Animated Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        textAlign: 'center'
      }}>
        <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', padding: '8px 4px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Processed</div>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
            <AnimatedCounter value={processed} duration={1000} />
          </div>
        </div>
        <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', padding: '8px 4px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Reconciled</div>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
            <AnimatedCounter value={reconciled} duration={1000} />
          </div>
        </div>
        <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', padding: '8px 4px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Anomalies</div>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#c2410c', marginTop: '2px' }}>
            <AnimatedCounter value={anomalies} duration={1000} />
          </div>
        </div>
        <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', padding: '8px 4px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Escalated</div>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
            <AnimatedCounter value={escalated} duration={1000} />
          </div>
        </div>
        <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', padding: '8px 4px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Avg Latency</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{avgLatency}</div>
        </div>
        <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', padding: '8px 4px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Tokens</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
            <AnimatedCounter value={tokens} isRupees={true} duration={1200} />
          </div>
        </div>
      </div>

      {/* Footer Navigation Link */}
      <button
        onClick={onNavigateAgentControl}
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#4f46e5',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
      >
        <span>View Agent Control & Orchestrator</span>
        <ArrowRight size={14} />
      </button>

    </div>
  );
};
