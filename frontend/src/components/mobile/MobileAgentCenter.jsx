import React, { useState } from 'react';
import {
  Bot, Zap, Shield, Mail, FileText, PieChart, Bell,
  Play, History, FileCode, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Component: MobileAgentCenter
 * 
 * Purpose:
 *   Mobile-first 1-column card layout for monitoring and triggering all 6 FinanceFlow AI Agents.
 *   Provides quick one-tap actions (Run, History, Logs, Analyze, Scan) with offline protection.
 */
export const MobileAgentCenter = ({
  agents = [],
  overview = {},
  loading = false,
  onRunAgent,
  onViewHistory,
  onAnalyzePortfolio,
  onScanAlerts,
  triggeringAgentId = null
}) => {
  const { isOnline } = useOnlineStatus();

  const getAgentIcon = (id) => {
    switch (id) {
      case 'agent_1': return Zap;
      case 'agent_2': return Shield;
      case 'agent_3': return Mail;
      case 'agent_4': return FileText;
      case 'agent_5': return PieChart;
      case 'agent_6': return Bell;
      default: return Bot;
    }
  };

  const handleAction = (callback, id) => {
    if (!isOnline) {
      triggerHaptic('warning');
      alert('Cannot trigger AI Agent execution while offline. Please connect to the internet.');
      return;
    }
    triggerHaptic('light');
    if (callback) callback(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Mobile Header Summary */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>AI Agents</h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>6 Autonomous Agents</p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Runs</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#059669' }}>
              {overview.active_runs || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Column Agent Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          const isRunning = triggeringAgentId === agent.id;
          const isAgent5 = agent.id === 'agent_5';
          const isAgent6 = agent.id === 'agent_6';

          return (
            <div
              key={agent.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Card Title & Status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {agent.role || 'Autonomous Operational Agent'}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0'
                }}>
                  READY
                </span>
              </div>

              {/* Metrics Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: '#f8fafc',
                padding: '8px 10px',
                borderRadius: '10px',
                fontSize: '0.72rem'
              }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Total Runs</div>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{agent.metrics?.total_runs || 0}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Tokens</div>
                  <div style={{ fontWeight: '700', color: '#4f46e5' }}>{((agent.metrics?.total_tokens || 0) / 1000).toFixed(1)}k</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Success</div>
                  <div style={{ fontWeight: '700', color: '#16a34a' }}>98%</div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {isAgent5 ? (
                  <button
                    onClick={() => handleAction(onAnalyzePortfolio)}
                    disabled={isRunning}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      border: 'none',
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
                    <Play size={13} />
                    <span>Analyze Portfolio</span>
                  </button>
                ) : isAgent6 ? (
                  <button
                    onClick={() => handleAction(onScanAlerts)}
                    disabled={isRunning}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      border: 'none',
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
                    <Bell size={13} />
                    <span>Scan Alerts</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction(onRunAgent, agent.id)}
                    disabled={isRunning}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      border: 'none',
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
                    <Play size={13} />
                    <span>{isRunning ? 'Running...' : 'Run Agent'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    if (onViewHistory) onViewHistory(agent);
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <History size={13} />
                  <span>History</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileAgentCenter;
