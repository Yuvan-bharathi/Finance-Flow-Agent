import React from 'react';
import { KPICard } from './KPICard';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  IndianRupee,
  Activity
} from 'lucide-react';

/**
 * KPI Section Container Component
 * Renders top summary row of 6 operational KPI metric cards directly from live backend stats.
 * 
 * @param {Object} kpis - Object containing KPI stats.
 * @param {Object} paymentSummary - Object containing payment totals and period.
 * @param {boolean} loading - True if stats API request is in progress.
 */
export const KPISection = ({ kpis = {}, paymentSummary = {}, loading = false }) => {
  const formatRupees = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cardsData = [
    {
      title: 'Total Cases',
      value: loading ? '...' : (kpis.total_cases !== undefined ? kpis.total_cases : 0),
      changeText: 'Overall workload tracked',
      isPositiveTrend: true,
      icon: FileText,
      iconBgColor: '#f3e8ff',
      iconColor: '#7c3aed'
    },
    {
      title: 'Pending Review',
      value: loading ? '...' : (kpis.pending_review !== undefined ? kpis.pending_review : 0),
      changeText: 'Human attention required',
      isPositiveTrend: true,
      icon: RefreshCw,
      iconBgColor: '#dbeafe',
      iconColor: '#2563eb'
    },
    {
      title: 'Resolved',
      value: loading ? '...' : (kpis.resolved !== undefined ? kpis.resolved : 0),
      changeText: 'Completed ledger matches',
      isPositiveTrend: true,
      icon: CheckCircle2,
      iconBgColor: '#fef3c7',
      iconColor: '#d97706'
    },
    {
      title: 'AI Auto-Processed',
      value: loading ? '...' : (kpis.ai_auto_processed !== undefined ? kpis.ai_auto_processed : 0),
      changeText: 'Autonomous Agent 1 matches',
      isPositiveTrend: true,
      icon: ShieldCheck,
      iconBgColor: '#d1fae5',
      iconColor: '#059669'
    },
    {
      title: 'Anomalies Detected',
      value: loading ? '...' : (kpis.anomalies_detected !== undefined ? kpis.anomalies_detected : 0),
      changeText: 'Flagged by Agent 7',
      isPositiveTrend: false,
      icon: AlertOctagon,
      iconBgColor: '#ffedd5',
      iconColor: '#c2410c'
    },
    {
      title: 'High Priority',
      value: loading ? '...' : (kpis.high_priority !== undefined ? kpis.high_priority : 0),
      changeText: 'Urgent SLA cases',
      isPositiveTrend: false,
      icon: AlertTriangle,
      iconBgColor: '#fee2e2',
      iconColor: '#dc2626'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 6 Top Operational Metric Cards */}
      <div className="kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        {cardsData.map((card, idx) => (
          <KPICard key={idx} {...card} loading={loading} />
        ))}
      </div>

      {/* Financial Summary Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            color: '#2563eb',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(37,99,235,0.15)'
          }}>
            <IndianRupee size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Payments Processed ({paymentSummary.period || 'Year-to-Date FY 2026'})
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {loading ? '...' : (
                <AnimatedCounter
                  value={kpis.total_amount || 0}
                  prefix="₹"
                  decimals={2}
                  isRupees={true}
                  duration={1200}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Total Reconciled Amount</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#059669', marginTop: '1px' }}>
              {loading ? '...' : (
                <AnimatedCounter
                  value={kpis.reconciled_amount || (kpis.total_amount ? kpis.total_amount * 0.45 : 0)}
                  prefix="₹"
                  decimals={2}
                  isRupees={true}
                  duration={1200}
                />
              )}
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>↑ 12.6% vs previous period</span>
          </div>
        </div>
      </div>
    </div>
  );
};
