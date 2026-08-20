import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Login } from './pages/Login';

/**
 * Main App Layout
 * 
 * IMPORTANT: Dashboard is always mounted as a single stable instance.
 * The activeTab state drives which sub-page renders INSIDE Dashboard.
 * We never conditionally unmount/remount Dashboard — that would reset 
 * all local state including sidebarCollapsed.
 */
const MainLayout = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('reconciliations');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', fontWeight: '600' }}>
        Loading FinanceFlow AI Enterprise Dashboard...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Always render a single Dashboard instance — tab switching is handled INSIDE Dashboard.jsx
  // This preserves sidebarCollapsed state, scroll position, and any other local state.
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
