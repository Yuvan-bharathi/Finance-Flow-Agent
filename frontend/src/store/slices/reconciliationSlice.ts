import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  ReconciliationCase,
  Payment,
  DashboardStats,
} from '../../types/reconciliation';
import { getCases, getStats } from '../../services/reconciliationService';
import api from '../../services/api';

interface ReconciliationState {
  cases: ReconciliationCase[];
  payments: Payment[];
  selectedCase: ReconciliationCase | null;
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  filterStatus: string;
}

const defaultStats: DashboardStats = {
  kpis: {
    total_cases: 53,
    new_cases: 22,
    pending_review: 16,
    resolved: 15,
    ai_auto_processed: 36,
    anomalies_detected: 6,
    high_priority: 10,
    total_amount: 82196648.18,
    reconciled_amount: 36988491.68,
  },
  payment_summary: {
    total_processed: 82196648.18,
    total_reconciled: 36988491.68,
    period: 'Year-to-Date FY 2026',
  },
  status_breakdown: [
    { status: 'open', count: 22 },
    { status: 'pending_review', count: 16 },
    { status: 'resolved', count: 15 },
  ],
  ai_performance: {
    success_rate: 95.7,
    active_agents: 7,
    system_status: '100% AVAILABLE',
    processed: 36,
    reconciled: 15,
    anomalies: 9,
    escalated: 16,
    avg_latency: '8.4 sec',
    tokens_consumed: 325451,
  },
  anomalies_breakdown: {
    total: 6,
    requires_review: 4,
    escalated: 2,
    cleared: 0,
  },
  pipeline_health: [
    { name: 'Payment Ingestion Engine', role: 'Bank Webhook & API Gateway', status: 'HEALTHY', latency: '< 40ms' },
    { name: 'Reconciliation Agent', role: 'Agent 1 (Pre-Check + Groq)', status: 'HEALTHY', latency: '1.2s' },
    { name: 'Anomaly Detection Agent', role: 'Agent 7 (Integrity Guardrails)', status: 'HEALTHY', latency: '680ms' },
    { name: 'Waterfall Settlement Engine', role: 'Continuous Loan Allocator', status: 'HEALTHY', latency: '< 50ms' },
    { name: 'Repayment Risk Agent', role: 'Agent 2 (Continuous Credit)', status: 'HEALTHY', latency: '2.1s' },
    { name: 'Collection Follow-Up Agent', role: 'Agent 3 (Smart Notice Drafting)', status: 'HEALTHY', latency: '1.8s' },
    { name: 'Notification & Escalation Agent', role: 'Agent 6 (Multi-Channel Alerts)', status: 'HEALTHY', latency: '920ms' },
  ],
  attention_required: [],
  cases_over_time: [
    { day: 'Aug 21', date: '2026-08-21', value: 4 },
    { day: 'Aug 22', date: '2026-08-22', value: 7 },
    { day: 'Aug 23', date: '2026-08-23', value: 5 },
    { day: 'Aug 24', date: '2026-08-24', value: 9 },
    { day: 'Aug 25', date: '2026-08-25', value: 6 },
    { day: 'Aug 26', date: '2026-08-26', value: 8 },
    { day: 'Aug 27', date: '2026-08-27', value: 14 },
  ],
};

const initialState: ReconciliationState = {
  cases: [],
  payments: [],
  selectedCase: null,
  stats: defaultStats,
  loading: false,
  error: null,
  filterStatus: 'ALL',
};

export const fetchDashboardStatsThunk = createAsyncThunk(
  'reconciliation/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getStats();
      return data;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to fetch dashboard statistics';
      return rejectWithValue(message);
    }
  }
);

export const fetchCasesThunk = createAsyncThunk(
  'reconciliation/fetchCases',
  async (params: { status?: string | null; priority?: string | null } | undefined, { rejectWithValue }) => {
    try {
      const cases = await getCases(params?.status, params?.priority);
      return cases;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to fetch reconciliation cases';
      return rejectWithValue(message);
    }
  }
);

export const fetchPaymentsThunk = createAsyncThunk(
  'reconciliation/fetchPayments',
  async (params: { page?: number; limit?: number; status?: string; search?: string } | undefined, { rejectWithValue }) => {
    try {
      const res = await api.get('/payments', { params });
      return (res.data?.data?.payments || res.data?.data || []) as Payment[];
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to fetch payments';
      return rejectWithValue(message);
    }
  }
);

export const reconciliationSlice = createSlice({
  name: 'reconciliation',
  initialState,
  reducers: {
    setSelectedCase: (state, action: PayloadAction<ReconciliationCase | null>) => {
      state.selectedCase = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<string>) => {
      state.filterStatus = action.payload;
    },
    updateCaseStatus: (state, action: PayloadAction<{ id: number; status: ReconciliationCase['status'] }>) => {
      const target = state.cases.find(c => c.id === action.payload.id);
      if (target) {
        target.status = action.payload.status;
      }
      if (state.selectedCase && state.selectedCase.id === action.payload.id) {
        state.selectedCase.status = action.payload.status;
      }
      const attnTarget = state.stats.attention_required.find(c => c.id === action.payload.id);
      if (attnTarget) {
        attnTarget.status = action.payload.status;
      }
    },
    paymentIngested: (state, action: PayloadAction<Payment>) => {
      state.payments.unshift(action.payload);
      if (state.stats.kpis) {
        state.stats.kpis.total_cases += 1;
        state.stats.kpis.new_cases += 1;
      }
    },
    caseAnomaliesUpdated: (
      state,
      action: PayloadAction<{ caseId: number; anomalyTypes: string[]; severity: string }>
    ) => {
      const target = state.cases.find(c => c.id === action.payload.caseId);
      if (target) {
        target.anomaly_types = action.payload.anomalyTypes;
        target.severity = action.payload.severity;
      }
      if (state.selectedCase && state.selectedCase.id === action.payload.caseId) {
        state.selectedCase.anomaly_types = action.payload.anomalyTypes;
        state.selectedCase.severity = action.payload.severity;
      }
    },
    setDashboardStats: (state, action: PayloadAction<Partial<DashboardStats>>) => {
      state.stats = { ...state.stats, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStatsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const payload = action.payload as Partial<DashboardStats>;
          state.stats = {
            ...state.stats,
            ...payload,
            kpis: payload.kpis ? { ...state.stats.kpis, ...payload.kpis } : state.stats.kpis,
            ai_performance: payload.ai_performance
              ? { ...state.stats.ai_performance, ...payload.ai_performance }
              : state.stats.ai_performance,
            status_breakdown: payload.status_breakdown || state.stats.status_breakdown,
            cases_over_time: payload.cases_over_time || state.stats.cases_over_time,
            pipeline_health: payload.pipeline_health || state.stats.pipeline_health,
            attention_required: payload.attention_required || state.stats.attention_required,
          };
        }
      })
      .addCase(fetchDashboardStatsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Error loading dashboard statistics';
      })
      .addCase(fetchCasesThunk.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.cases = action.payload;
        }
      })
      .addCase(fetchPaymentsThunk.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.payments = action.payload;
        }
      });
  },
});

export const {
  setSelectedCase,
  setFilterStatus,
  updateCaseStatus,
  paymentIngested,
  caseAnomaliesUpdated,
  setDashboardStats,
} = reconciliationSlice.actions;

export default reconciliationSlice.reducer;
