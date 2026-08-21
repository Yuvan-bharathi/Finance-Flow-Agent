import React from 'react';
import { Zap, Shield, Bell, PieChart, Bot, ChevronRight, Clock } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: MobileAIActivityFeed
 * 
 * Purpose:
 *   Mobile AI & Agent Activity timeline.
 *   Shows recent operational runs and alerts with one-tap "Ask AI About This" deep links.
 */
export const MobileAIActivityFeed = ({ onAskAiAboutEvent }) => {
  const events = [
    {
      id: 1,
      time: '09:42',
      agent: 'Agent 1',
      icon: Zap,
      color: '#16a34a',
      title: 'Payment #182 reconciled with 90% match',
      prompt: 'Explain the reconciliation match factors for Payment #182.'
    },
    {
      id: 2,
      time: '09:39',
      agent: 'Agent 6',
      icon: Bell,
      color: '#dc2626',
      title: 'Critical escalation detected for Case #16',
      prompt: 'Why did Agent 6 flag Case #16 as a critical escalation?'
    },
    {
      id: 3,
      time: '09:31',
      agent: 'Agent 2',
      icon: Shield,
      color: '#d97706',
      title: 'Apex Logistics risk rating updated to HIGH',
      prompt: 'Provide details on the recent risk rating increase for Apex Logistics.'
    },
    {
      id: 4,
      time: '09:20',
      agent: 'Agent 5',
      icon: PieChart,
      color: '#4f46e5',
      title: 'Portfolio snapshot generated (87.4% efficiency)',
      prompt: 'Summarize key findings from the latest Agent 5 portfolio snapshot.'
    }
  ];

  const handleEventClick = (prompt) => {
    triggerHaptic('light');
    if (onAskAiAboutEvent) {
      onAskAiAboutEvent(prompt);
    }
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
      gap: '14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#6366f1" />
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>AI Activity Feed</h3>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Live Timeline</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.map((ev) => {
          const Icon = ev.icon;

          return (
            <div
              key={ev.id}
              onClick={() => handleEventClick(ev.prompt)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ev.color
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#6366f1' }}>{ev.agent}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>• {ev.time}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#0f172a', marginTop: '1px' }}>
                    {ev.title}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: '700',
                color: '#4f46e5'
              }}>
                <Bot size={12} />
                <span>Ask AI</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileAIActivityFeed;
