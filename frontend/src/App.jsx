import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';
import { ShieldAlert } from 'lucide-react';

/**
 * Global Toast Container Component
 * Listens to app-wide 'ff-auth-permission-error' events and renders a high-visibility,
 * clean floating toast notification for authorization & RBAC permission errors.
 */
const GlobalToastContainer = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleAuthErr = (e) => {
      const { message } = e.detail || {};
      setToast({
        id: Date.now(),
        title: 'Access Restricted',
        badge: 'READ-ONLY ACCOUNT',
        message: message || 'Your current user role does not have permission for this action.',
        hint: 'Please contact a system administrator or switch to an authorized role.'
      });
      setTimeout(() => setToast(null), 7000);
    };

    window.addEventListener('ff-auth-permission-error', handleAuthErr);
    return () => window.removeEventListener('ff-auth-permission-error', handleAuthErr);
  }, []);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '24px',
      zIndex: 999999,
      maxWidth: '460px',
      width: 'calc(100vw - 48px)',
      background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)',
      border: '1.5px solid #fecaca',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '14px',
      boxShadow: '0 12px 32px -4px rgba(220, 38, 38, 0.25)',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <ShieldAlert size={22} color="#dc2626" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#991b1b' }}>
              {toast.title}
            </span>
            <span style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.625rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
              {toast.badge}
            </span>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#b91c1c', fontWeight: '600', marginTop: '3px', lineHeight: 1.35 }}>
            {toast.message}
          </p>
          <p style={{ fontSize: '0.735rem', color: '#dc2626', opacity: 0.9, marginTop: '4px', fontWeight: '500' }}>
            💡 {toast.hint}
          </p>
        </div>
      </div>
      <button
        onClick={() => setToast(null)}
        title="Dismiss notification"
        style={{
          background: '#fee2e2',
          border: 'none',
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          color: '#991b1b',
          fontWeight: '800',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s ease'
        }}
      >
        ✕
      </button>
    </div>
  );
};

/**
 * Main App Layout with Clean HTML5 History Routing (No # hashes)
 */
const MainLayout = () => {
  const { user, loading } = useAuth();

  const getTabFromPath = () => {
    const path = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
    const validTabs = [
      'reconciliations', 'payments', 'companies', 'loans', 
      'audit-logs', 'reports', 'documents', 'agents', 
      'notifications', 'settings'
    ];
    return validTabs.includes(path) ? path : 'reconciliations';
  };

  const [activeTab, setActiveTabState] = useState(getTabFromPath);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const targetPath = tab === 'reconciliations' ? '/' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(getTabFromPath());
    };

    window.addEventListener('popstate', handlePopState);

    if (window.location.hash) {
      const hashTab = window.location.hash.replace('#/', '').replace('#', '').trim();
      if (hashTab) {
        window.history.replaceState({ tab: hashTab }, '', hashTab === 'reconciliations' ? '/' : `/${hashTab}`);
        setActiveTabState(hashTab);
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', fontWeight: '600' }}>
        Loading FinanceFlow AI Enterprise Dashboard...
      </div>
    );
  }

  if (window.location.pathname.startsWith('/set-password')) {
    return <SetPassword />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <GlobalToastContainer />
      <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
