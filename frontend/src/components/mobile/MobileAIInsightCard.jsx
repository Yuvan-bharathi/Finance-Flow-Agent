import React from 'react';
import { TrendingDown, TrendingUp, ShieldAlert, Bot, ArrowRight, PieChart } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: MobileAIInsightCard
 * 
 * Purpose:
 *   Mobile Portfolio Health & Collection Efficiency card powered by Agent 5 insights.
 *   Provides immediate visual status and one-tap investigation into high-risk entities.
 */
export const MobileAIInsightCard = ({
  efficiency = '87.4%',
  activeExposure = '₹42.8 Cr',
  overdue = '₹3.2 Cr',
  highRiskCount = 7,
  trend = -4.2,
  onInvestigate
}) => {
  const handleInvestigate = () => {
    triggerHaptic('light');
    if (onInvestigate) onInvestigate();
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={18} color="#4f46e5" />
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Portfolio Health</h3>
        </div>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.72rem',
          fontWeight: '700',
          color: trend < 0 ? '#dc2626' : '#16a34a',
          background: trend < 0 ? '#fef2f2' : '#f0fdf4',
          padding: '2px 8px',
          borderRadius: '6px'
        }}>
          {trend < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          <span>{Math.abs(trend)}% vs last mo</span>
        </span>
      </div>

      {/* Main Metric Spotlight */}
      <div style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
        border: '1px solid #c7d2fe',
        borderRadius: '14px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4338ca', textTransform: 'uppercase' }}>
          Collection Efficiency
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#312e81', lineHeight: 1.1, marginTop: '4px' }}>
          {efficiency}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '4px', fontWeight: '600' }}>
          Agent 5 Real-Time Portfolio Calculation
        </div>
      </div>

      {/* Sub-metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
        <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Active Exposure</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{activeExposure}</div>
        </div>
        <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Total Overdue</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#b91c1c', marginTop: '2px' }}>{overdue}</div>
        </div>
        <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>High Risk</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#c2410c', marginTop: '2px' }}>{highRiskCount}</div>
        </div>
      </div>

      {/* AI Explanation Banner */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#4f46e5' }}>
          <Bot size={14} />
          <span>AI Insight</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.4 }}>
          Collection efficiency declined by 4.2% primarily due to delays across 3 specific high-exposure borrowers.
        </p>
        <button
          onClick={handleInvestigate}
          style={{
            background: '#ffffff',
            border: '1px solid #c7d2fe',
            color: '#4338ca',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>Investigate Borrowers</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default MobileAIInsightCard;
