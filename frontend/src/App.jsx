import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Login } from './pages/Login';

/**
 * Main App Layout with Clean HTML5 History Routing (No # hashes)
 * 
 * Synchronizes activeTab with window.location.pathname (/agents, /payments, /companies, /reconciliations, etc.)
 * Direct URL navigation, bookmarks, and browser Back/Forward controls work seamlessly.
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

    // Also clean up any legacy hash from URL if present
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
    <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
