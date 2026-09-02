import React, { useState, useEffect, type ComponentType } from 'react';
import {
  GitMerge, CreditCard, Building2, FileSpreadsheet, ShieldCheck,
  BarChart3, Files, Bell, Settings,
  PanelLeftClose, PanelLeftOpen, Bot, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAlerts } from '../../services/notificationService';

interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  showCountOnHover?: boolean;
  isAgentControl?: boolean;
}

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  pendingCount?: number;
  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
}

const navItems: NavItem[] = [
  { id: 'reconciliations', label: 'Reconciliation Hub',  icon: GitMerge },
  { id: 'payments',       label: 'Payment Ingestion',    icon: CreditCard },
  { id: 'companies',      label: 'Borrowing Companies',  icon: Building2 },
  { id: 'loans',          label: 'Loans & Schedules',    icon: FileSpreadsheet },
  { id: 'audit-logs',     label: 'Audit Compliance',     icon: ShieldCheck },
  { id: 'reports',        label: 'Reports & Analytics',  icon: BarChart3 },
  { id: 'documents',      label: 'Documents',            icon: Files },
  { id: 'agents',         label: 'AI Agent Control',     icon: Bot, isAgentControl: true },
  { id: 'notifications',  label: 'Notifications',        icon: Bell, showCountOnHover: true },
  { id: 'settings',       label: 'Settings',             icon: Settings },
];

/**
 * Collapsible Enterprise Sidebar Component with 3D Soft-Glass Icons & Account Controls
 */
export const Sidebar = ({
  activeTab = 'reconciliations',
  setActiveTab,
  pendingCount: _pendingCount = 0,
  collapsed = false,
  setCollapsed,
}: SidebarProps) => {
  const { user, logout } = useAuth();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [notificationCount, setNotificationCount] = useState(8);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    getAlerts({ status: 'pending' })
      .then(res => {
        const alerts = res?.data?.data;
        const count = Array.isArray(alerts) ? alerts.length : 0;
        if (typeof count === 'number') {
          if (count > notificationCount) {
            setHasNewNotifications(true);
            setTimeout(() => setHasNewNotifications(false), 2000);
          }
          setNotificationCount(count);
        }
      })
      .catch(() => {});
  }, [notificationCount]);

  const userName = (user?.name?.trim()) ? user.name : (user?.email ?? 'User');
  const userInitials = userName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed', left: '80px', background: '#0f172a', color: '#ffffff',
    padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600',
    whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', zIndex: 9999,
    pointerEvents: 'none', animation: 'fadeIn 0.15s ease forwards',
    display: 'flex', alignItems: 'center', gap: '6px',
  };

  return (
    <aside
      onWheel={(e) => e.stopPropagation()}
      style={{
        width: collapsed ? '72px' : '280px', minWidth: collapsed ? '72px' : '280px',
        background: '#ffffff', borderRight: '1px solid #e2e8f0',
        padding: collapsed ? '20px 12px' : '24px 18px',
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'sticky', top: 0, zIndex: 40,
        overscrollBehavior: 'contain',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible', boxShadow: '2px 0 12px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Embedded 3D Keyframe Animations & Reduced Motion Handler */}
      <style>{`
        @keyframes sidebarAgentPulse {
          0%, 100% {
            box-shadow: 0 3px 8px rgba(124, 58, 237, 0.2), inset 0 1px 1px rgba(255,255,255,0.9);
          }
          50% {
            box-shadow: 0 4px 14px rgba(124, 58, 237, 0.38), 0 0 12px rgba(168, 85, 247, 0.3), inset 0 1px 1px rgba(255,255,255,0.9);
          }
        }
        @keyframes notifBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-3d-icon-box {
            animation: none !important;
            transform: none !important;
          }
          .sidebar-item-label {
            transform: none !important;
          }
        }
      `}</style>

      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: '24px', minHeight: '44px', position: 'relative' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: collapsed ? 'pointer' : 'default', position: 'relative' }}
          onMouseEnter={() => collapsed && setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          onClick={() => collapsed && setCollapsed?.(false)}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {collapsed && logoHovered ? (
              <PanelLeftOpen size={22} color="#4f46e5" />
            ) : (
              <img src="/FinanceFlow AI Logo-favicon.png" alt="FinanceFlow AI Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            )}
          </div>

          {collapsed && logoHovered && (
            <div style={tooltipStyle}>Open sidebar</div>
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
            onClick={() => setCollapsed?.(true)}
            title="Collapse Sidebar"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#4338ca'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflowY: 'auto', overflowX: 'clip', paddingRight: '2px', overscrollBehavior: 'contain' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isHovered = hoveredTab === item.id;
          const isAgent = Boolean(item.isAgentControl);
          const isNotif = item.id === 'notifications';

          // Dynamic 3D Icon Box Styles
          let iconBg = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
          let iconBorder = '1px solid #e2e8f0';
          let iconShadow = '0 2px 5px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255,255,255,0.9)';
          let iconColor = isHovered ? '#4f46e5' : '#64748b';
          let animationStyle = 'none';

          if (isAgent) {
            if (isActive) {
              iconBg = 'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.15) 100%)';
              iconBorder = '1px solid rgba(255, 255, 255, 0.5)';
              iconShadow = '0 4px 12px rgba(124, 58, 237, 0.4), inset 0 1px 1px rgba(255,255,255,0.7)';
              iconColor = '#ffffff';
            } else if (isHovered) {
              iconBg = 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)';
              iconBorder = '1px solid #c084fc';
              iconShadow = '0 6px 16px rgba(147, 51, 234, 0.32), inset 0 1px 1px #ffffff';
              iconColor = '#6d28d9';
            } else {
              iconBg = 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)';
              iconBorder = '1px solid #ddd6fe';
              iconShadow = '0 3px 8px rgba(124, 58, 237, 0.2), inset 0 1px 1px rgba(255,255,255,0.9)';
              iconColor = '#7c3aed';
              animationStyle = 'sidebarAgentPulse 3s ease-in-out infinite';
            }
          } else if (isActive) {
            iconBg = 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 100%)';
            iconBorder = '1px solid rgba(255, 255, 255, 0.45)';
            iconShadow = '0 4px 10px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255,255,255,0.6)';
            iconColor = '#ffffff';
          } else if (isHovered) {
            iconBg = 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)';
            iconBorder = '1px solid #c7d2fe';
            iconShadow = '0 5px 12px rgba(99, 102, 241, 0.22), inset 0 1px 1px #ffffff';
            iconColor = '#4f46e5';
          }

          return (
            <div key={item.id} style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredTab(item.id)}
              onMouseLeave={() => setHoveredTab(null)}>
              <button
                onClick={() => setActiveTab?.(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
                  width: '100%', padding: collapsed ? '10px 8px' : '9px 12px', borderRadius: '12px', border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : (isHovered ? '#f1f5f9' : 'transparent'),
                  color: isActive ? '#ffffff' : (isHovered ? '#0f172a' : '#475569'),
                  fontWeight: isActive ? '700' : '500', fontSize: '0.865rem', cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 6px 16px rgba(99, 102, 241, 0.35)' : (isHovered ? '0 2px 8px rgba(0,0,0,0.03)' : 'none'),
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  {/* Soft 3D Glass Icon Container */}
                  <div
                    className="sidebar-3d-icon-box"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      background: iconBg,
                      border: iconBorder,
                      boxShadow: iconShadow,
                      animation: animationStyle,
                      transform: isHovered ? 'translateY(-2.5px) scale(1.05)' : (isActive ? 'translateY(-1px)' : 'translateY(0) scale(1)'),
                      transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.2s ease',
                    }}
                  >
                    <Icon size={18} color={iconColor} />

                    {/* Unread Notification Badge Dot */}
                    {isNotif && notificationCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: '1.5px solid #ffffff',
                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                        animation: hasNewNotifications ? 'notifBadgePulse 0.4s ease 3' : 'none',
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  {!collapsed && (
                    <span
                      className="sidebar-item-label"
                      style={{
                        whiteSpace: 'nowrap',
                        transform: isHovered && !isActive ? 'translateX(2px)' : 'translateX(0)',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s ease',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>

                {!collapsed && item.showCountOnHover && isHovered && notificationCount > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                    color: isActive ? '#ffffff' : '#dc2626',
                    boxShadow: isActive ? 'none' : '0 1px 4px rgba(220,38,38,0.15)',
                    animation: 'fadeIn 0.15s ease forwards'
                  }}>
                    {notificationCount}
                  </span>
                )}
              </button>

              {collapsed && isHovered && (
                <div style={{ ...tooltipStyle, transform: 'translateY(-50%) translateY(10px)' }}>
                  <span>{item.label}</span>
                  {item.showCountOnHover && notificationCount > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700' }}>
                      {notificationCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
        {!collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* User Profile Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                }}>
                  {userInitials}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.83rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email ?? '—'}</div>
                </div>
              </div>
              <button onClick={logout} title="Sign Out"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed Footer */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            <button onClick={logout} title={`Sign Out (${userName})`} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4f46e5', color: '#ffffff', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)' }}>
                {userInitials}
              </div>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
