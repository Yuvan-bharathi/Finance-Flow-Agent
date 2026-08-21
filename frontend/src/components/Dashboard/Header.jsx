import React from 'react';
import { Search, Calendar, ChevronDown, Menu, Download, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: Header
 * 
 * Purpose:
 *   Top enterprise navigation and operational control bar.
 *   Provides user greeting, search, date filtering, live connection status,
 *   PWA installation prompt trigger, and mobile drawer trigger.
 */
export const Header = ({ searchQuery = '', setSearchQuery, onOpenMobileSidebar }) => {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { isInstallable, promptInstall } = usePWAInstall();

  const userName = (user && user.name && user.name.trim()) ? user.name : 'Senior Accountant';

  const handleInstallClick = async () => {
    triggerHaptic('light');
    const result = await promptInstall();
    if (result === 'accepted') {
      triggerHaptic('success');
    }
  };

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      gap: '12px'
    }}>
      
      {/* Left Greeting & Mobile Menu Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={() => {
            triggerHaptic('light');
            if (onOpenMobileSidebar) onOpenMobileSidebar();
          }}
          className="mobile-hamburger-btn"
          aria-label="Open Navigation Menu"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'none', // Shown via CSS media query
            alignItems: 'center',
            justifyContent: 'center',
            color: '#334155',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              Welcome back, {userName}! 👋
            </h1>
            {/* Live / Offline Status Pill */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: isOnline ? '#f0fdf4' : '#fef2f2',
              color: isOnline ? '#16a34a' : '#dc2626',
              border: isOnline ? '1px solid #bbf7d0' : '1px solid #fecaca',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.65rem',
              fontWeight: '700'
            }}>
              {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span>{isOnline ? 'LIVE' : 'OFFLINE'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }} className="header-subtitle">
            Here's what's happening with your reconciliations today.
          </p>
        </div>
      </div>

      {/* Right Controls Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* PWA Install Button (When browser supports install) */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
          >
            <Download size={14} />
            <span className="install-btn-text">Install App</span>
          </button>
        )}

        {/* Search Input Box */}
        <div style={{ position: 'relative' }} className="header-search-box">
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by sender, reference, TXN ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            style={{
              width: '260px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />
        </div>

        {/* Date Range Selector (Desktop only) */}
        <div className="header-date-badge" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '8px 12px',
          borderRadius: '10px',
          fontSize: '0.78rem',
          fontWeight: '600',
          color: '#334155',
          cursor: 'pointer'
        }}>
          <Calendar size={14} color="#6366f1" />
          <span>May 20 – May 27, 2025</span>
          <ChevronDown size={12} color="#94a3b8" />
        </div>

        {/* User Profile Avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '2px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#4f46e5',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {userName ? userName.split(' ').map(n => n[0]).join('') : 'SA'}
          </div>
          <div style={{ textAlign: 'left' }} className="header-user-info">
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>{userName}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' }}>
              {user ? (user.role_name || user.role) : 'ACCOUNTANT'}
            </div>
          </div>
        </div>

      </div>

    </header>
  );
};

export default Header;
