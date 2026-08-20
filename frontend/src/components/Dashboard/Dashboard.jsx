import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPISection } from './KPISection';
import { CaseStatusChart } from './CaseStatusChart';
import { CasesOverTimeChart } from './CasesOverTimeChart';
import { AIPerformanceCard } from './AIPerformanceCard';
import { RecentCasesTable } from './RecentCasesTable';
import { ActionCenterDrawer } from '../ActionCenterDrawer';
import { PaymentIngestion } from '../../pages/PaymentIngestion';
import { CompanyList } from '../../pages/CompanyList';
import { LoanList } from '../../pages/LoanList';
import { AuditLogs } from '../../pages/AuditLogs';
import { DocumentList } from '../../pages/DocumentList';
import { ReportsAnalytics } from '../../pages/ReportsAnalytics';
import { getCases, getStats } from '../../services/reconciliationService';
import { AlertCircle, RefreshCw, Construction } from 'lucide-react';

/**
 * Master Enterprise Fintech Dashboard Component
 * Assembles bright SaaS layout, sidebar, top header, KPI summary row, analytics charts, and recent cases table.
 * 
 * Called by:
 * - App.jsx
 */
export const Dashboard = ({ activeTab = 'reconciliations', setActiveTab }) => {
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Fetch dashboard data from backend services
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, casesData] = await Promise.all([
        getStats(),
        getCases()
      ]);
      setStats(statsData);
      setCases(casesData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Unable to load reconciliation cases and analytics from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const kpis = stats?.kpis || {};
  const statusBreakdown = stats?.status_breakdown || [];
  const aiPerformance = stats?.ai_performance || {};

  const filteredCases = cases.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.transaction_id?.toLowerCase().includes(q) ||
      item.sender_name?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      color: '#0f172a'
    }}>
      
      {/* Left Collapsible Sidebar (Toggle Control inside Sidebar per Image 3) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={kpis.pending_review || 0}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Viewport */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Dashboard Main Scrollable Area */}
        <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px', flex: 1 }}>
          
          {/* Error State Banner */}
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '16px 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: '600' }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
              <button
                onClick={loadDashboardData}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* TAB 1: Action Center AI Dashboard */}
          {activeTab === 'reconciliations' && (
            <>
              {/* 1. KPI Summary Cards Row */}
              <KPISection kpis={kpis} loading={loading} />

              {/* 2. Analytics Charts Row (3 Cards Grid) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px'
              }}>
                <CaseStatusChart
                  statusBreakdown={statusBreakdown}
                  totalCases={kpis.total_cases}
                  loading={loading}
                />
                <CasesOverTimeChart />
                <AIPerformanceCard aiPerformance={aiPerformance} loading={loading} />
              </div>

              {/* 3. Recent Reconciliation Cases Table Card */}
              <RecentCasesTable
                cases={filteredCases}
                loading={loading}
                onSelectCase={(item) => setSelectedCase(item)}
                onRefresh={loadDashboardData}
              />
            </>
          )}

          {/* TAB 2: Payment Manual Ingestion (Section 17) */}
          {activeTab === 'payments' && <PaymentIngestion />}

          {/* TAB 3: Borrowing Companies Directory */}
          {activeTab === 'companies' && <CompanyList />}

          {/* TAB 4: Loans & Schedules Breakdown */}
          {activeTab === 'loans' && <LoanList />}

          {/* TAB 5: Audit Compliance Log */}
          {activeTab === 'audit-logs' && <AuditLogs />}

          {/* TAB 6: Document Intelligence Vault */}
          {activeTab === 'documents' && <DocumentList />}

          {/* TAB 7: Reports & Analytics */}
          {activeTab === 'reports' && <ReportsAnalytics />}

          {/* Fallback Placeholder for unimplemented tabs: Notifications, Settings */}
          {['notifications', 'settings'].includes(activeTab) && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '60px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Construction size={28} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px' }}>
                This module is coming soon. Select <strong>Action Center AI</strong>, <strong>Reports & Analytics</strong>, or <strong>Documents</strong> to explore live financial operations.
              </p>
              <button onClick={() => setActiveTab('reconciliations')} className="btn-primary" style={{ marginTop: '8px' }}>
                Return to Action Center AI
              </button>
            </div>
          )}

        </main>
      </div>

      {/* Action Center Slide-Over Review Drawer */}
      {selectedCase && (
        <ActionCenterDrawer
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={loadDashboardData}
        />
      )}

    </div>
  );
};
