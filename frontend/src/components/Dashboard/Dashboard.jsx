import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPISection } from './KPISection';
import { CaseStatusChart } from './CaseStatusChart';
import { CasesOverTimeChart } from './CasesOverTimeChart';
import { AIPerformanceCard } from './AIPerformanceCard';
import { PipelineHealthCard } from './PipelineHealthCard';
import { AttentionRequiredSection } from './AttentionRequiredSection';
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
import { connectSocket } from '../../services/socketService';
import { AlertCircle, RefreshCw, Construction } from 'lucide-react';

/**
 * Master Enterprise Fintech Dashboard Component
 * AI Agentic Repayment Platform Operations Center
 */
export const Dashboard = ({ activeTab: externalActiveTab = 'reconciliations', setActiveTab: externalSetActiveTab }) => {
  const [internalActiveTab, setInternalActiveTab] = useState('reconciliations');
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    kpis: {},
    payment_summary: {},
    status_breakdown: [],
    ai_performance: {},
    pipeline_health: [],
    attention_required: [],
    cases_over_time: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCase, setSelectedCase]   = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAiModal, setShowAiModal]     = useState(false);
  // AI Copilot: tracks what page/record the user is currently viewing
  const [copilotContext, setCopilotContext] = useState({ page: 'reconciliations', recordType: null, recordId: null });

  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  const debounceTimerRef = useRef(null);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg('');
      const [casesData, statsData] = await Promise.all([
        getCases(),
        getStats()
      ]);
      setCases(Array.isArray(casesData) ? casesData : (casesData?.data || []));
      const raw = (statsData && statsData.kpis) ? statsData : (statsData?.data || {});
      setStats({
        kpis: raw.kpis || {},
        payment_summary: raw.payment_summary || {},
        status_breakdown: Array.isArray(raw.status_breakdown) ? raw.status_breakdown : [],
        ai_performance: raw.ai_performance || {},
        pipeline_health: raw.pipeline_health || [],
        attention_required: raw.attention_required || [],
        cases_over_time: raw.cases_over_time || []
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (!silent) setErrorMsg('Failed to sync real-time database state. Please check MySQL backend connection.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Setup debounced real-time WebSocket listeners for silent background revalidation
    const socket = connectSocket();
    const triggerDebouncedRevalidate = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchDashboardData(true);
      }, 500);
    };

    socket.on('PAYMENT_INGESTED', triggerDebouncedRevalidate);
    socket.on('PAYMENT_RECEIVED', triggerDebouncedRevalidate);
    socket.on('PIPELINE_COMPLETED', triggerDebouncedRevalidate);
    socket.on('RECONCILIATION_COMPLETED', triggerDebouncedRevalidate);
    socket.on('ANOMALY_DETECTED', triggerDebouncedRevalidate);
    socket.on('RISK_ASSESSMENT_COMPLETED', triggerDebouncedRevalidate);
    socket.on('COLLECTION_DRAFTED', triggerDebouncedRevalidate);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      socket.off('PAYMENT_INGESTED', triggerDebouncedRevalidate);
      socket.off('PAYMENT_RECEIVED', triggerDebouncedRevalidate);
      socket.off('PIPELINE_COMPLETED', triggerDebouncedRevalidate);
      socket.off('RECONCILIATION_COMPLETED', triggerDebouncedRevalidate);
      socket.off('ANOMALY_DETECTED', triggerDebouncedRevalidate);
      socket.off('RISK_ASSESSMENT_COMPLETED', triggerDebouncedRevalidate);
      socket.off('COLLECTION_DRAFTED', triggerDebouncedRevalidate);
    };
  }, []);

  const handleAskAI = (recordType, recordId, extra = {}) => {
    setCopilotContext({ page: activeTab, recordType, recordId, ...extra });
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
        onOpenAiAssistant={() => {
          setCopilotContext({ page: activeTab, recordType: null, recordId: null });
          setShowAiModal(true);
        }}
      />

      {/* AI Copilot Panel — slide-in from right when open */}
      <AiCopilotPanel
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        contextPayload={copilotContext}
        onClearContext={() => setCopilotContext({ page: activeTab, recordType: null, recordId: null })}
      />

      {/* Slide-over Action Center AI Review Drawer */}
      <ActionCenterDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onRefresh={() => fetchDashboardData(true)}
        onAskAI={(recordType, recordId, extra) => handleAskAI(recordType, recordId, extra)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        
        {/* Top Floating Header with LIVE pulse */}
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
              <button onClick={() => fetchDashboardData()} style={{ background: '#ffffff', border: '1px solid #fca5a5', color: '#991b1b', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}>
                Retry Connection
              </button>
            </div>
          )}

          {/* TAB 1: Action Center AI Dashboard */}
          {activeTab === 'reconciliations' && (
            <>
              {/* Summary KPI Cards Row (6 Operational Cards + Processed Total) */}
              <KPISection
                kpis={stats.kpis}
                paymentSummary={stats.payment_summary}
                loading={loading}
              />

              {/* Middle Grid: Case Status Donut, Cases Over Time (Dynamic August 2026), AI Performance */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px'
              }}>
                <CaseStatusChart statusBreakdown={Array.isArray(stats.status_breakdown) ? stats.status_breakdown : []} loading={loading} />
                <CasesOverTimeChart casesOverTime={stats.cases_over_time} loading={loading} />
                <AIPerformanceCard
                  aiPerformance={stats.ai_performance}
                  onNavigateAgentControl={() => setActiveTab('agents')}
                />
              </div>

              {/* Pipeline Health Card & Attention Required Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr',
                gap: '20px',
                alignItems: 'stretch'
              }}>
                <PipelineHealthCard
                  pipelineHealth={stats.pipeline_health}
                  onNavigatePipeline={() => setActiveTab('agents')}
                />

                <AttentionRequiredSection
                  cases={
                    (stats.attention_required && stats.attention_required.length > 0)
                      ? stats.attention_required
                      : cases
                          .filter(c => ['new', 'pending_review', 'open', 'ai_failed'].includes((c.status || '').toLowerCase()))
                          .filter(c => (c.priority || '').toLowerCase() === 'high' || (c.priority || '').toLowerCase() === 'critical' || c.anomaly_score > 0)
                          .slice(0, 5)
                          .map(c => ({
                            case_id: c.id,
                            payment_id: c.payment_id,
                            transaction_id: c.transaction_id,
                            amount: parseFloat(c.amount) || 0,
                            sender_name: c.sender_name || 'Unassigned Sender',
                            priority: (c.priority || 'high').toUpperCase(),
                            severity: (c.priority || '').toLowerCase() === 'critical' ? 'CRITICAL' : 'HIGH',
                            anomaly_score: c.anomaly_score || 65,
                            anomaly_types: c.anomaly_types || ['SLA_ESCALATION_BREACH', 'UNALLOCATED_DEPOSIT'],
                            recommended_action: c.anomaly_recommendation || 'MANUAL_REVIEW',
                            status: c.status
                          }))
                  }
                  onSelectCase={(item) => setSelectedCase(item)}
                  onViewAll={() => setActiveTab('payments')}
                />
              </div>

              {/* Bottom Large Table: Recent Reconciliation Cases (Latest 5 Transactions) */}
              <RecentCasesTable
                cases={cases}
                loading={loading}
                onSelectCase={(item) => setSelectedCase(item)}
                onRefresh={() => fetchDashboardData(true)}
                onAskAI={(recordType, recordId, extra) => handleAskAI(recordType, recordId, extra)}
                onViewAll={() => setActiveTab('payments')}
              />
            </>
          )}

          {/* TAB 2: Payment Manual Ingestion */}
          {activeTab === 'payments' && (
            <PaymentIngestion
              onAskAI={(recordType, recordId, extra) => handleAskAI(recordType, recordId, extra)}
            />
          )}

          {/* TAB 3: Borrowing Companies Directory */}
          {activeTab === 'companies' && (
            <CompanyList
              onAskAI={(recordType, recordId, extra) => handleAskAI(recordType, recordId, extra)}
            />
          )}

          {/* TAB 4: Loans & Schedules Breakdown */}
          {activeTab === 'loans' && (
            <LoanList
              onAskAI={(recordType, recordId, extra) => handleAskAI(recordType, recordId, extra)}
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
              onAskAI={(recordType, recordId, extra) => handleAskAI(recordType, recordId, extra)}
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
