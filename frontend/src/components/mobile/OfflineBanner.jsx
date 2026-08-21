import React from 'react';
import { WifiOff, Wifi, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { triggerHaptic } from '../../utils/haptics';

/**
 * Component: OfflineBanner
 * 
 * Purpose:
 *   Prominently informs the user when the application enters offline mode.
 *   Clearly clarifies that financial mutations and AI operations require an online backend connection.
 *   Automatically displays a "Connection restored" confirmation when network returns.
 */
export const OfflineBanner = () => {
  const { isOnline, wasOffline, dismissRestoredToast } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  if (wasOffline && isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: '#ffffff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wifi size={16} />
          <span>Connection restored — Live real-time financial synchronization active.</span>
        </div>
        <button
          onClick={dismissRestoredToast}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)',
        color: '#ffffff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.85rem',
        boxShadow: '0 4px 14px rgba(185, 28, 28, 0.35)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <WifiOff size={18} />
        <div>
          <span style={{ fontWeight: '700' }}>Offline Mode: </span>
          <span>Financial operations, AI Copilot, and agent runs require an active backend connection. Cached static shell only.</span>
        </div>
      </div>

      <button
        onClick={() => {
          triggerHaptic('light');
          window.location.reload();
        }}
        style={{
          background: '#ffffff',
          color: '#991b1b',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}
      >
        <RefreshCw size={12} />
        <span>Check Connection</span>
      </button>
    </div>
  );
};

export default OfflineBanner;
