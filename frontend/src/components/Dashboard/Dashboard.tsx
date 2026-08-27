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
import { AlertCircle } from 'lucide-react';
import type { DashboardKPIs, StatusBreakdown, AIPerformanceStats, PipelineHealthItem, CaseOverTime, ReconciliationCase } from '../../types/reconciliation';

interface PaymentSummary {
  total_processed?: number;
  total_reconciled?: number;
  period?: string;
}

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

interface DashboardStatsState {
  kpis: Partial<DashboardKPIs>;
  payment_summary: PaymentSummary;
  status_breakdown: StatusBreakdown[];
  ai_performance: Partial<AIPerformanceStats>;
  pipeline_health: PipelineHealthItem[];
  attention_required: ReconciliationCase[];
  cases_over_time: CaseOverTime[];
}

/**
 * Master Enterprise Fintech Dashboard Component
 * AI Agentic Repayment Platform Operations Center
 */
export const Dashboard = ({
  activeTab: externalActiveTab = 'reconciliations',
  setActiveTab: externalSetActiveTab,
}: DashboardProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState('reconciliations');
  const [cases, setCases] = useState<ReconciliationCase[]>([]);
  const [stats, setStats] = useState<DashboardStatsState>({
    kpis: {},
    payment_summary: {},
    status_breakdown: [],
    ai_performance: {},
    pipeline_health: [],
    attention_required: [],
    cases_over_time: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCase, setSelectedCase] = useState<ReconciliationCase | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      if (!silent) setLoading(true);
      setErrorMsg('');
      const [casesData, statsData] = await Promise.all([
        getCases(),
        getStats(),
      ]);

      const casesList = Array.isArray(casesData)
        ? casesData
        : (casesData as { data?: ReconciliationCase[] })?.data ?? [];
      setCases(casesList);

      const raw = ((statsData as { kpis?: DashboardKPIs })?.kpis ? statsData : (statsData as { data?: Record<string, unknown> })?.data) as Record<string, unknown> | undefined;

      setStats({
        kpis: (raw?.kpis as Partial<DashboardKPIs>) || {},
        payment_summary: (raw?.payment_summary as PaymentSummary) || {},
        status_breakdown: Array.isArray(raw?.status_breakdown) ? raw.status_breakdown as StatusBreakdown[] : [],
        ai_performance: (raw?.ai_performance as Partial<AIPerformanceStats>) || {},
        pipeline_health: Array.isArray(raw?.pipeline_health) ? raw.pipeline_health as PipelineHealthItem[] : [],
        attention_required: Array.isArray(raw?.attention_required) ? raw.attention_required as ReconciliationCase[] : [],
        cases_over_time: Array.isArray(raw?.cases_over_time) ? raw.cases_over_time as CaseOverTime[] : [],
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (!silent) setErrorMsg('Failed to sync real-time database state. Please check MySQL backend connection.');
    } finally {
      if (!silent) setLoading(false);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
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

      <AiCopilotPanel
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        contextPayload={copilotContext}
        onClearContext={() => setCopilotContext({ page: activeTab, recordType: null, recordId: null })}
      />

      <ActionCenterDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onRefresh={() => void fetchDashboardData(true)}
        onAskAI={(recordType: string, recordId: number) => handleAskAI(recordType, recordId)}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        <Header />

        <main style={{ flex: 1, padding: '24px 32px 48px', overflowY: 'auto' }}>
          {errorMsg && (
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
                <span>{errorMsg}</span>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <CaseStatusChart statusBreakdown={stats.status_breakdown} loading={loading} />
                <CasesOverTimeChart casesOverTime={stats.cases_over_time} loading={loading} />
                <AIPerformanceCard
                  aiPerformance={stats.ai_performance}
                  onNavigateAgentControl={() => setActiveTab('agents')}
                />
              </div>

              {/* 2-Column Row: Pipeline Health (Left) + Attention Required 2x2 Matrix (Right) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 2fr', gap: '20px', marginBottom: '24px', alignItems: 'stretch' }}>
                <PipelineHealthCard pipelineHealth={stats.pipeline_health} onNavigatePipeline={() => setActiveTab('agents')} />
                <AttentionRequiredSection
                  cases={stats.attention_required}
                  onSelectCase={(item) => setSelectedCase(item as ReconciliationCase)}
                  onViewAll={() => setActiveTab('payments')}
                />
              </div>

              <RecentCasesTable
                cases={cases}
                loading={loading}
                onSelectCase={(item) => setSelectedCase(item as ReconciliationCase)}
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
    </div>
  );
};
