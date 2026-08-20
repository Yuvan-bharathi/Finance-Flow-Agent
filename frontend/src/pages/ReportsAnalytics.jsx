import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Clock, ShieldAlert, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Interactive Reports & Financial Analytics Page
 * Renders Collection Efficiency, Aging Buckets breakdown, and Revenue Projections.
 * 
 * Called by:
 * - Dashboard.jsx
 */
export const ReportsAnalytics = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 color="#4f46e5" size={28} />
          Reports & Portfolio Financial Analytics
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
          Real-time collection efficiency rates, overdue aging buckets (30/60/90+ days), and revenue projections.
        </p>
      </div>

      {/* Top 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Monthly Collection Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>94.2%</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', marginTop: '4px' }}>
            <ArrowUpRight size={14} /> +3.4% vs last month
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Portfolio Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>₹2.68 Cr</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#4f46e5', fontWeight: '700', marginTop: '4px' }}>
            5 Active Facilities
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Overdue Balance</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', marginTop: '6px' }}>₹4,51,500</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#dc2626', fontWeight: '700', marginTop: '4px' }}>
            <ArrowDownRight size={14} /> 2 Companies Delinquent
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>AI Automation Efficiency</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a', marginTop: '6px' }}>88.5%</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', marginTop: '4px' }}>
            Instant AI Matches
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Overdue Aging Bucket Breakdown */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Overdue Aging Bucket Breakdown
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Distribution of overdue delinquent amounts by aging duration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                <span>1 – 30 Days (Current Delinquent)</span>
                <span>₹1,14,000 (25%)</span>
              </div>
              <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: '25%', height: '100%', background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                <span>31 – 60 Days (Moderate Risk)</span>
                <span>₹1,68,750 (37%)</span>
              </div>
              <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: '37%', height: '100%', background: '#ea580c' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                <span>61+ Days (High Risk / Agent 3 Triggered)</span>
                <span>₹1,68,750 (38%)</span>
              </div>
              <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: '38%', height: '100%', background: '#dc2626' }} />
              </div>
            </div>

          </div>
        </div>

        {/* Portfolio Monthly Collection Trend */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Monthly Revenue & Recovery Spline Trend
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Comparison of scheduled vs actual collected funds across Q1–Q3.
          </p>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px', paddingTop: '20px' }}>
            
            {[
              { month: 'Jan', height: '60%', amount: '₹8.5L' },
              { month: 'Feb', height: '75%', amount: '₹10.2L' },
              { month: 'Mar', height: '85%', amount: '₹11.8L' },
              { month: 'Apr', height: '70%', amount: '₹9.4L' },
              { month: 'May', height: '95%', amount: '₹13.1L' },
              { month: 'Jun', height: '88%', amount: '₹12.0L' },
            ].map((bar, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: '700', color: '#4f46e5' }}>{bar.amount}</span>
                <div style={{ width: '100%', height: bar.height, background: 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)', borderRadius: '8px' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>{bar.month}</span>
              </div>
            ))}

          </div>
        </div>

      </div>

    </div>
  );
};
