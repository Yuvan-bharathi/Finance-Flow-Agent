import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPISection } from './KPISection';
import { CaseStatusChart } from './CaseStatusChart';
import { CasesOverTimeChart } from './CasesOverTimeChart';
import { AIPerformanceCard } from './AIPerformanceCard';
import { RecentCasesTable } from './RecentCasesTable';
import { ActionCenterDrawer } from '../ActionCenterDrawer';
import { LiveToastNotifications } from '../LiveToastNotifications';
import AiCopilotPanel from '../AiCopilotPanel';
import { PaymentIngestion } from '../../pages/PaymentIngestion';
import { CompanyList } from '../../pages/CompanyList';
import { LoanList } from '../../pages/LoanList';
import { AuditLogs } from '../../pages/AuditLogs';
import { DocumentList } from '../../pages/DocumentList';
import { ReportsAnalytics } from '../../pages/ReportsAnalytics';
import { AgentControlCenter } from '../../pages/AgentControlCenter';
import { Notifications } from '../../pages/Notifications';
import { Settings } from '../../pages/Settings';
import { getCases, getStats } from '../../services/reconciliationService';
import { AlertCircle, RefreshCw, Construction } from 'lucide-react';

/**
 * Master Enterprise Fintech Dashboard Component
 * Assembles bright SaaS layout, sidebar, top header, KPI summary row, analytics charts, and recent cases table.
 * 
 * Called by:
 * - App.jsx
 */
export const Dashboard = ({ activeTab: externalActiveTab = 'reconciliations', setActiveTab: externalSetActiveTab }) => {
  const [internalActiveTab, setInternalActiveTab] = useState('reconciliations');
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ kpis: {}, status_breakdown: [], ai_performance: {} });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCase, setSelectedCase]   = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAiModal, setShowAiModal]     = useState(false);
  // AI Copilot: tracks what page/record the user is currently viewing
  const [copilotContext, setCopilotContext] = useState({ page: 'reconciliations', recordType: null, recordId: null });

  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [casesData, statsData] = await Promise.all([
        getCases(),
        getStats()
      ]);
      setCases(Array.isArray(casesData) ? casesData : (casesData?.data || []));
      const raw = (statsData && statsData.kpis) ? statsData : (statsData?.data || {});
      setStats({
        kpis: raw.kpis || {},
        status_breakdown: Array.isArray(raw.status_breakdown) ? raw.status_breakdown : [],
        ai_performance: raw.ai_performance || {}
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setErrorMsg('Failed to sync real-time database state. Please check MySQL backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAskAI = (recordType, recordId, page = activeTab) => {
    setCopilotContext({ page, recordType, recordId });
    setShowAiModal(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={stats?.kpis?.pending_review || 0}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenAiAssistant={() => setShowAiModal(true)}
      />

      {/* AI Copilot Panel — slide-in from right when open */}
      <AiCopilotPanel
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        contextPayload={copilotContext}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        
        {/* Top Floating Header */}
        <Header />

        {/* Dynamic Body View */}
        <main style={{ padding: '24px 32px 40px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {errorMsg && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '14px 20px',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
              <button onClick={fetchDashboardData} style={{ background: '#ffffff', border: '1px solid #fca5a5', color: '#991b1b', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}>
                Retry Connection
              </button>
            </div>
          )}

          {/* TAB 1: Action Center AI Dashboard */}
          {activeTab === 'reconciliations' && (
            <>
              {/* Summary KPI Cards Row */}
              <KPISection kpis={stats.kpis} loading={loading} />

              {/* Middle Grid: Case Status Donut, Cases Over Time, AI Performance */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px'
              }}>
                <CaseStatusChart statusBreakdown={Array.isArray(stats.status_breakdown) ? stats.status_breakdown : []} loading={loading} />
                <CasesOverTimeChart loading={loading} />
                <AIPerformanceCard aiPerformance={stats.ai_performance} loading={loading} />
              </div>

              {/* Bottom Large Table: Recent Reconciliation Cases (Latest 5 Transactions) */}
              <RecentCasesTable
                cases={cases}
                loading={loading}
                onSelectCase={(item) => setSelectedCase(item)}
                onRefresh={fetchDashboardData}
                onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId, 'reconciliations')}
                onViewAll={() => setActiveTab('payments')}
              />
            </>
          )}

          {/* TAB 2: Payment Manual Ingestion */}
          {activeTab === 'payments' && (
            <PaymentIngestion
              onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId, 'payments')}
            />
          )}

          {/* TAB 3: Borrowing Companies Directory */}
          {activeTab === 'companies' && (
            <CompanyList
              onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId, 'companies')}
            />
          )}

          {/* TAB 4: Loans & Schedules Breakdown */}
          {activeTab === 'loans' && (
            <LoanList
              onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId, 'loans')}
            />
          )}

          {/* TAB 5: Audit Compliance Log */}
          {activeTab === 'audit-logs' && <AuditLogs />}

          {/* TAB 6: Document Intelligence Vault */}
          {activeTab === 'documents' && <DocumentList />}

          {/* TAB 7: Reports & Analytics */}
          {activeTab === 'reports' && <ReportsAnalytics />}

          {/* TAB 8: AI Agent Control Center */}
          {activeTab === 'agents' && <AgentControlCenter />}

          {/* TAB 9: Real-Time Notification & Escalation Center (Agent 6) */}
          {activeTab === 'notifications' && (
            <Notifications
              onSelectCase={(item) => setSelectedCase(item)}
              onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId, 'notifications')}
            />
          )}

          {/* TAB 10: Enterprise Settings */}
          {activeTab === 'settings' && <Settings />}

        </main>
      </div>

      {/* Action Center Slide-Over Review Drawer */}
      {selectedCase && (
        <ActionCenterDrawer
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={fetchDashboardData}
          onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId, 'reconciliations')}
        />
      )}

      {/* Real-Time WebSocket Toast Notifications */}
      <LiveToastNotifications onRealtimeUpdate={fetchDashboardData} />

    </div>
  );
};
