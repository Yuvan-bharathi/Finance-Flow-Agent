import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Reusable KPI Card Component
 * Rendered in the top summary row of the dashboard.
 * Supports shimmer skeleton loading state.
 * 
 * Called by:
 * - KPISection.jsx
 * 
 * @param {string} title - Card title string.
 * @param {string|number} value - Primary metric value.
 * @param {string} changeText - Trend description (e.g. "↑ 18 from last week").
 * @param {boolean} isPositiveTrend - True for green positive, false for red negative.
 * @param {React.Component} icon - Lucide Icon component.
 * @param {string} iconBgColor - Background color for icon container.
 * @param {string} iconColor - Icon foreground color.
 * @param {boolean} loading - If true, renders shimmer skeleton animation.
 */
export const KPICard = ({
  title,
  value,
  changeText,
  isPositiveTrend = true,
  icon: Icon,
  iconBgColor = '#f3e8ff',
  iconColor = '#7c3aed',
  loading = false
}) => {
  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
        height: '130px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '120px', height: '14px', borderRadius: '6px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </div>
        <div style={{ width: '80px', height: '32px', borderRadius: '8px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ width: '140px', height: '12px', borderRadius: '6px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      transition: 'all 0.25s ease',
      height: '130px'
    }}>
      
      {/* Top Row: Icon & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>
          {title}
        </span>

        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: iconBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor
        }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>

      {/* Primary Value */}
      <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
        {value}
      </div>

      {/* Bottom Change Trend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: isPositiveTrend ? '#059669' : '#dc2626'
      }}>
        {changeText}
      </div>

    </div>
  );
};
