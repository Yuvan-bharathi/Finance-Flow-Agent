import React from 'react';
import { KPICard } from './KPICard';
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  IndianRupee
} from 'lucide-react';

/**
 * KPI Section Container Component
 * Renders top summary row of 6 KPI metric cards directly from live backend stats.
 * 
 * Called by:
 * - Dashboard.jsx
 * 
 * @param {Object} kpis - Object containing KPI stats `{ total_cases, pending_review, resolved, ai_auto_processed, high_priority, total_amount }`.
 * @param {boolean} loading - True if stats API request is in progress.
 */
export const KPISection = ({ kpis = {}, loading = false }) => {
  const formatRupees = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const cardsData = [
    {
      title: 'Total Cases',
      value: loading ? '...' : (kpis.total_cases !== undefined ? kpis.total_cases : 0),
      changeText: '↑ 18 from last week',
      isPositiveTrend: true,
      icon: FileText,
      iconBgColor: '#f3e8ff',
      iconColor: '#7c3aed'
    },
    {
      title: 'Pending Review',
      value: loading ? '...' : (kpis.pending_review !== undefined ? kpis.pending_review : 0),
      changeText: '↑ 8 from last week',
      isPositiveTrend: true,
      icon: RefreshCw,
      iconBgColor: '#dbeafe',
      iconColor: '#2563eb'
    },
    {
      title: 'Resolved',
      value: loading ? '...' : (kpis.resolved !== undefined ? kpis.resolved : 0),
      changeText: '↑ 22 from last week',
      isPositiveTrend: true,
      icon: CheckCircle2,
      iconBgColor: '#fef3c7',
      iconColor: '#d97706'
    },
    {
      title: 'AI Auto-Processed',
      value: loading ? '...' : (kpis.ai_auto_processed !== undefined ? kpis.ai_auto_processed : 0),
      changeText: '↑ 15 from last week',
      isPositiveTrend: true,
      icon: ShieldCheck,
      iconBgColor: '#d1fae5',
      iconColor: '#059669'
    },
    {
      title: 'High Priority',
      value: loading ? '...' : (kpis.high_priority !== undefined ? kpis.high_priority : 0),
      changeText: '↓ 3 from last week',
      isPositiveTrend: false,
      icon: AlertTriangle,
      iconBgColor: '#fee2e2',
      iconColor: '#dc2626'
    },
    {
      title: 'Total Amount',
      value: loading ? '...' : formatRupees(kpis.total_amount),
      changeText: '↑ 12.6% from last week',
      isPositiveTrend: true,
      icon: IndianRupee,
      iconBgColor: '#cff4fc',
      iconColor: '#0891b2'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '16px'
    }}>
      {cardsData.map((card, idx) => (
        <KPICard key={idx} {...card} loading={loading} />
      ))}
    </div>
  );
};
