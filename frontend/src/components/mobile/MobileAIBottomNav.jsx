import React from 'react';
import { Home, Bot, Zap, Bell, Menu } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: MobileAIBottomNav
 * 
 * Purpose:
 *   Mobile-first bottom navigation bar for PWA users on screens under 768px.
 *   Elevates AI Command Center and Agent Operations to first-class navigation items.
 */
export const MobileAIBottomNav = ({
  activeTab = 'reconciliations',
  setActiveTab,
  onOpenMobileMenu,
  onOpenAiCopilot,
  alertCount = 0
}) => {
  const handleTabClick = (tabId) => {
    triggerHaptic('light');
    if (tabId === 'more') {
      if (onOpenMobileMenu) onOpenMobileMenu();
    } else if (tabId === 'copilot_panel') {
      if (onOpenAiCopilot) onOpenAiCopilot();
    } else {
      if (setActiveTab) setActiveTab(tabId);
    }
  };

  const navButtons = [
    { id: 'reconciliations', label: 'Home', icon: Home },
    { id: 'copilot_panel', label: 'AI Copilot', icon: Bot, isHighlight: true },
    { id: 'agents', label: 'Agents', icon: Zap },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'more', label: 'Menu', icon: Menu }
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 80,
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {navButtons.map((btn) => {
        const Icon = btn.icon;
        const isActive = activeTab === btn.id;

        if (btn.isHighlight) {
          return (
            <button
              key={btn.id}
              onClick={() => handleTabClick(btn.id)}
              aria-label={btn.label}
              style={{
                position: 'relative',
                top: '-12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: '3px solid #ffffff',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.45)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <Bot size={24} />
            </button>
          );
        }

        return (
          <button
            key={btn.id}
            onClick={() => handleTabClick(btn.id)}
            aria-label={btn.label}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 12px',
              color: isActive ? '#4f46e5' : '#64748b',
              fontWeight: isActive ? '700' : '500',
              fontSize: '0.7rem',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} color={isActive ? '#4f46e5' : '#64748b'} />
              {btn.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: '800',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #ffffff'
                  }}
                >
                  {btn.badge > 9 ? '9+' : btn.badge}
                </span>
              )}
            </div>
            <span>{btn.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileAIBottomNav;
