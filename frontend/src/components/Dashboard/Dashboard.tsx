import { useState, useEffect, useRef } from 'react';
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
import { AiCopilotPanel } from '../AiCopilotPanel';
import { FloatingAiAssistantButton } from '../FloatingAiAssistantButton';
import { PaymentIngestion } from '../../pages/PaymentIngestion';
import { CompanyList } from '../../pages/CompanyList';
import { LoanList } from '../../pages/LoanList';
import { AuditLogs } from '../../pages/AuditLogs';
import { DocumentList } from '../../pages/DocumentList';
import { ReportsAnalytics } from '../../pages/ReportsAnalytics';
import { AgentControlCenter } from '../../pages/AgentControlCenter';
import { Notifications } from '../../pages/Notifications';
import { Settings } from '../../pages/Settings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchDashboardStatsThunk,
  fetchCasesThunk,
  setSelectedCase,
} from '../../store/slices/reconciliationSlice';
import { connectSocket } from '../../services/socketService';
import { AlertCircle } from 'lucide-react';
import type { ReconciliationCase } from '../../types/reconciliation';

interface CopilotContext {
  page: string;
  recordType?: string | null;
  recordId?: number | string | null;
  [key: string]: unknown;
}

interface DashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

/**
 * Master Enterprise Fintech Dashboard Component
 * AI Agentic Repayment Platform Operations Center
 */
export const Dashboard = ({
  activeTab: externalActiveTab = 'reconciliations',
  setActiveTab: externalSetActiveTab,
}: DashboardProps) => {
  const dispatch = useAppDispatch();
  const {
    cases,
    stats,
    selectedCase,
    loading,
    error: reduxError,
  } = useAppSelector((state) => state.reconciliation);

  const [internalActiveTab, setInternalActiveTab] = useState('reconciliations');
  const [localError, setLocalError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [copilotContext, setCopilotContext] = useState<CopilotContext>({
    page: 'reconciliations',
    recordType: null,
    recordId: null,
  });

  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | number | null>(null);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLocalError('');
      await Promise.all([
        dispatch(fetchCasesThunk()).unwrap(),
        dispatch(fetchDashboardStatsThunk()).unwrap(),
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (!silent) setLocalError('Failed to sync real-time database state. Please check MySQL backend connection.');
    }
  };

  useEffect(() => {
    void fetchDashboardData();

    const socket = connectSocket();
    const triggerDebouncedRevalidate = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current as number);
      debounceTimerRef.current = setTimeout(() => {
        void fetchDashboardData(true);
      }, 300);
    };

    socket.on('PAYMENT_INGESTED', triggerDebouncedRevalidate);
    socket.on('PAYMENT_RECEIVED', triggerDebouncedRevalidate);
    socket.on('PIPELINE_COMPLETED', triggerDebouncedRevalidate);
    socket.on('RECONCILIATION_COMPLETED', triggerDebouncedRevalidate);
    socket.on('ANOMALY_DETECTED', triggerDebouncedRevalidate);
    socket.on('RISK_ASSESSMENT_COMPLETED', triggerDebouncedRevalidate);
    socket.on('COLLECTION_DRAFTED', triggerDebouncedRevalidate);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current as number);
      socket.off('PAYMENT_INGESTED', triggerDebouncedRevalidate);
      socket.off('PAYMENT_RECEIVED', triggerDebouncedRevalidate);
      socket.off('PIPELINE_COMPLETED', triggerDebouncedRevalidate);
      socket.off('RECONCILIATION_COMPLETED', triggerDebouncedRevalidate);
      socket.off('ANOMALY_DETECTED', triggerDebouncedRevalidate);
      socket.off('RISK_ASSESSMENT_COMPLETED', triggerDebouncedRevalidate);
      socket.off('COLLECTION_DRAFTED', triggerDebouncedRevalidate);
    };
  }, []);

  const handleAskAI = (recordType: string | null, recordId: number | string | null, extra?: Record<string, unknown>) => {
    setCopilotContext({ page: activeTab, recordType, recordId, ...(extra || {}) });
    setShowAiModal(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', maxWidth: '100vw', overflowX: 'hidden', background: '#f8fafc' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={stats?.kpis?.pending_review || 0}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      <AiCopilotPanel
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        contextPayload={copilotContext}
        onClearContext={() => setCopilotContext({ page: activeTab, recordType: null, recordId: null })}
      />

      <ActionCenterDrawer
        caseItem={selectedCase}
        onClose={() => dispatch(setSelectedCase(null))}
        onRefresh={() => void fetchDashboardData(true)}
        onAskAI={(recordType: string, recordId: number) => handleAskAI(recordType, recordId)}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflow: 'hidden',
      }}>
        <Header 
          activeTab={activeTab} 
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />

        <main className="dashboard-main-area">
          {(localError || reduxError) && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#991b1b',
              fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} color="#dc2626" />
                <span>{localError || reduxError}</span>
              </div>
              <button
                onClick={() => void fetchDashboardData()}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: '#991b1b',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'reconciliations' && (
            <>
              <KPISection kpis={stats.kpis} loading={loading} />

              {/* 3-Card Row: Case Status + Cases Over Time + AI Agent Performance */}
              <div className="dashboard-three-cards-row">
                <CaseStatusChart statusBreakdown={stats.status_breakdown} loading={loading} />
                <CasesOverTimeChart casesOverTime={stats.cases_over_time} loading={loading} />
                <AIPerformanceCard
                  aiPerformance={stats.ai_performance}
                  onNavigateAgentControl={() => setActiveTab('agents')}
                />
              </div>

              {/* 2-Column Row: Pipeline Health (Left) + Attention Required 2x2 Matrix (Right) */}
              <div className="dashboard-two-cards-row">
                <PipelineHealthCard pipelineHealth={stats.pipeline_health} onNavigatePipeline={() => setActiveTab('agents')} />
                <AttentionRequiredSection
                  cases={stats.attention_required}
                  onSelectCase={(item) => dispatch(setSelectedCase(item as ReconciliationCase))}
                  onViewAll={() => setActiveTab('payments')}
                />
              </div>

              <RecentCasesTable
                cases={cases}
                loading={loading}
                onSelectCase={(item) => dispatch(setSelectedCase(item as ReconciliationCase))}
                onRefresh={() => void fetchDashboardData(true)}
                onAskAI={(recordType, recordId) => handleAskAI(recordType, recordId)}
                onViewAll={() => setActiveTab('payments')}
              />
            </>
          )}

          {activeTab === 'payments' && (
            <PaymentIngestion
              onAskAI={(recordType: string, recordId: string | number, extra?: Record<string, unknown>) => handleAskAI(recordType, recordId, extra)}
            />
          )}

          {activeTab === 'companies' && (
            <CompanyList
              onAskAI={(recordType: string, recordId: string | number) => handleAskAI(recordType, recordId)}
            />
          )}

          {activeTab === 'loans' && (
            <LoanList
              onAskAI={(recordType: string, recordId: string | number, extra?: Record<string, unknown>) => handleAskAI(recordType, recordId, extra)}
            />
          )}

          {activeTab === 'audit-logs' && <AuditLogs />}

          {activeTab === 'documents' && <DocumentList />}

          {activeTab === 'reports' && <ReportsAnalytics />}

          {activeTab === 'agents' && <AgentControlCenter />}

          {activeTab === 'notifications' && (
            <Notifications
              onSelectCase={(item: unknown) => setSelectedCase(item as ReconciliationCase)}
              onAskAI={(recordType: string, recordId: string | number, extra?: Record<string, unknown>) => handleAskAI(recordType, recordId, extra)}
            />
          )}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      <LiveToastNotifications onRealtimeUpdate={() => void fetchDashboardData(true)} />

      {/* Floating AI Assistant FAB */}
      <FloatingAiAssistantButton onClick={() => {
        setCopilotContext({ page: activeTab, recordType: null, recordId: null });
        setShowAiModal(true);
      }} />
    </div>
  );
};
