import React, { useState } from 'react';
import {
  Zap,
  CreditCard,
  Building2,
  FileSpreadsheet,
  History,
  BarChart3,
  FileText,
  Bell,
  Settings,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ChevronRight,
  Bot,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Collapsible Enterprise Sidebar Component with AI Assistant & Account Controls
 */
export const Sidebar = ({
  activeTab = 'reconciliations',
  setActiveTab,
  pendingCount = 0,
  collapsed = false,
  setCollapsed,
  onOpenAiAssistant
}) => {
  const { user, logout } = useAuth();
  const [hoveredTab, setHoveredTab] = useState(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [aiHovered, setAiHovered] = useState(false);

  const navItems = [
    { id: 'reconciliations', label: 'Action Center AI', icon: Zap, badge: pendingCount || null },
    { id: 'payments', label: 'Payment Ingestion', icon: CreditCard },
    { id: 'companies', label: 'Borrowing Companies', icon: Building2 },
    { id: 'loans', label: 'Loans & Schedules', icon: FileSpreadsheet },
    { id: 'audit-logs', label: 'Audit Compliance', icon: History },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'agents', label: 'AI Agent Control', icon: Bot },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 8 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const userName = (user && user.name && user.name.trim()) ? user.name : 'Senior Accountant';
  const userInitials = userName.split(' ').map(n => n[0]).join('');

  return (
    <aside style={{
      width: collapsed ? '72px' : '280px',
      minWidth: collapsed ? '72px' : '280px',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: collapsed ? '20px 12px' : '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'visible',
      boxShadow: '2px 0 12px rgba(0, 0, 0, 0.03)'
    }}>

      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: '28px',
        minHeight: '44px',
        position: 'relative'
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: collapsed ? 'pointer' : 'default',
            position: 'relative'
          }}
          onMouseEnter={() => collapsed && setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          onClick={() => collapsed && setCollapsed && setCollapsed(false)}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            flexShrink: 0,
            transition: 'box-shadow 0.2s ease',
            position: 'relative'
          }}>
            {collapsed && logoHovered ? (
              <PanelLeftOpen size={22} />
            ) : (
              <Activity size={24} />
            )}
          </div>

          {collapsed && logoHovered && (
            <div style={{
              position: 'fixed',
              left: '80px',
              background: '#0f172a',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              zIndex: 9999,
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease forwards',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              Open sidebar
            </div>
          )}

          {!collapsed && (
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                FinanceFlow <span style={{ color: '#6366f1' }}>AI</span>
              </h2>
              <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '500', marginTop: '2px', whiteSpace: 'nowrap' }}>
                Agentic Repayment Platform
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed && setCollapsed(true)}
            title="Collapse Sidebar"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#4338ca'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', overflowX: 'clip' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isHovered = hoveredTab === item.id;

          return (
            <div
              key={item.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredTab(item.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <button
                onClick={() => setActiveTab && setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  width: '100%',
                  padding: collapsed ? '11px' : '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : (isHovered ? '#f1f5f9' : 'transparent'),
                  color: isActive ? '#ffffff' : (isHovered ? '#0f172a' : '#475569'),
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.32)' : 'none',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Icon size={20} color={isActive ? '#ffffff' : (isHovered ? '#6366f1' : '#64748b')} />
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </div>

                {!collapsed && item.badge != null && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#e0e7ff',
                    color: isActive ? '#ffffff' : '#4338ca'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>

              {collapsed && isHovered && (
                <div style={{
                  position: 'fixed',
                  left: '80px',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  zIndex: 9999,
                  pointerEvents: 'none',
                  transform: 'translateY(-50%) translateY(10px)',
                  animation: 'fadeIn 0.15s ease forwards'
                }}>
                  {item.label}
                  {item.badge != null && (
                    <span style={{ marginLeft: '8px', background: '#4f46e5', color: '#fff', padding: '1px 6px', borderRadius: '6px', fontSize: '0.68rem' }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
        {!collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* AI Assistant Card */}
            <div
              onClick={() => onOpenAiAssistant && onOpenAiAssistant()}
              style={{
                background: 'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
                border: '1px solid #d8b4fe',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(124, 58, 237, 0.22)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)' }}>
                  <Bot size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.83rem', fontWeight: '700', color: '#4c1d95' }}>AI Assistant</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b21a8' }}>Ask FinanceFlow AI</div>
                </div>
              </div>
              <ChevronRight size={16} color="#7c3aed" />
            </div>

            {/* User Profile Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {userInitials}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.83rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.email : 'accountant@financeflow.com'}</div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed: AI Assistant Icon + User Avatar */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            
            {/* Collapsed AI Assistant Icon Button */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setAiHovered(true)}
              onMouseLeave={() => setAiHovered(false)}
            >
              <button
                onClick={() => onOpenAiAssistant && onOpenAiAssistant()}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Bot size={20} />
              </button>

              {aiHovered && (
                <div style={{
                  position: 'fixed',
                  left: '80px',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  zIndex: 9999,
                  pointerEvents: 'none'
                }}>
                  AI Assistant (Coming Soon)
                </div>
              )}
            </div>

            {/* Collapsed User Avatar */}
            <button
              onClick={logout}
              title={`Sign Out (${userName})`}
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
            >
              <div
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)' }}
              >
                {userInitials}
              </div>
            </button>

          </div>
        )}
      </div>

    </aside>
  );
};
