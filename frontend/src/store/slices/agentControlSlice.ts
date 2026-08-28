import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Agent, AgentOverviewStats, QueueMetrics, PipelineExecution, AgentActivityLog } from '../../types/agent';
import { getAgentStatus, getQueueStatus, triggerPipelineWorkflow } from '../../services/agentService';

interface AgentControlState {
  agents: Agent[];
  overview: AgentOverviewStats;
  queueMetrics: QueueMetrics | null;
  activePipeline: PipelineExecution | null;
  triggeringPipeline: boolean;
  batchRunning: boolean;
  selectedAgentId: string | null;
  activityLogs: AgentActivityLog[];
  loading: boolean;
  error: string | null;
}

const initialAgents: Agent[] = [
  { id: 'agent_1', name: 'Payment Ingestion & Matching Agent', role: 'Deterministic Rule-Based & Semantic Matching', status: 'IDLE', total_runs: 36, success_rate: 98.2, latency: '1.2s' },
  { id: 'agent_2', name: 'Repayment Risk Assessment Agent', role: 'Continuous Loan Delinquency & Credit Scoring', status: 'IDLE', total_runs: 24, success_rate: 96.5, latency: '2.1s' },
  { id: 'agent_3', name: 'Automated Collection Follow-Up Agent', role: 'Multi-Channel Escalation & Notice Drafting', status: 'IDLE', total_runs: 18, success_rate: 94.0, latency: '1.8s' },
  { id: 'agent_4', name: 'Accounting Ledger & ERP Sync Agent', role: 'Tally Prime, Zoho Books & SAP Automated Posting', status: 'IDLE', total_runs: 30, success_rate: 99.1, latency: '850ms' },
  { id: 'agent_5', name: 'Compliance & Audit Trail Agent', role: 'Immutable Ledger Audit & Hash Signature Verification', status: 'IDLE', total_runs: 42, success_rate: 100.0, latency: '450ms' },
  { id: 'agent_6', name: 'Multi-Channel Notification Agent', role: 'WhatsApp, Email & In-App Dynamic Alerts', status: 'IDLE', total_runs: 55, success_rate: 97.8, latency: '920ms' },
  { id: 'agent_7', name: 'Payment Anomaly Detection Agent', role: 'Integrity Verification & Anomaly Flagging', status: 'IDLE', total_runs: 28, success_rate: 95.4, latency: '680ms' },
];

const initialState: AgentControlState = {
  agents: initialAgents,
  overview: {
    active_agents_count: 7,
    total_runs_today: 233,
    overall_success_rate: 97.3,
  },
  queueMetrics: null,
  activePipeline: null,
  triggeringPipeline: false,
  batchRunning: false,
  selectedAgentId: null,
  activityLogs: [],
  loading: false,
  error: null,
};

export const fetchAgentStatusThunk = createAsyncThunk(
  'agentControl/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAgentStatus();
      return data;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to fetch agent status';
      return rejectWithValue(message);
    }
  }
);

export const fetchQueueMetricsThunk = createAsyncThunk(
  'agentControl/fetchQueueMetrics',
  async (_, { rejectWithValue }) => {
    try {
      const metrics = await getQueueStatus();
      return metrics;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to fetch queue metrics';
      return rejectWithValue(message);
    }
  }
);

export const triggerPipelineWorkflowThunk = createAsyncThunk(
  'agentControl/triggerWorkflow',
  async (payload: { workflow: string; contextData?: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const result = await triggerPipelineWorkflow(payload);
      return result;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to trigger pipeline workflow';
      return rejectWithValue(message);
    }
  }
);

export const agentControlSlice = createSlice({
  name: 'agentControl',
  initialState,
  reducers: {
    setAgentStatus: (state, action: PayloadAction<{ agentId: string; status: string; latency?: string }>) => {
      const target = state.agents.find(a => a.id === action.payload.agentId);
      if (target) {
        target.status = action.payload.status;
        if (action.payload.latency) target.latency = action.payload.latency;
      }
    },
    updateQueueMetrics: (state, action: PayloadAction<QueueMetrics>) => {
      state.queueMetrics = action.payload;
    },
    setPipelineExecution: (state, action: PayloadAction<PipelineExecution | null>) => {
      state.activePipeline = action.payload;
    },
    setTriggeringPipeline: (state, action: PayloadAction<boolean>) => {
      state.triggeringPipeline = action.payload;
    },
    setBatchRunning: (state, action: PayloadAction<boolean>) => {
      state.batchRunning = action.payload;
    },
    setSelectedAgentId: (state, action: PayloadAction<string | null>) => {
      state.selectedAgentId = action.payload;
    },
    appendActivityLog: (state, action: PayloadAction<AgentActivityLog>) => {
      state.activityLogs.unshift(action.payload);
      if (state.activityLogs.length > 100) {
        state.activityLogs = state.activityLogs.slice(0, 100);
      }
    },
    clearActivityLogs: (state) => {
      state.activityLogs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentStatusThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAgentStatusThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const raw = action.payload as { overview?: AgentOverviewStats; agents?: Agent[] };
          if (raw.overview) state.overview = { ...state.overview, ...raw.overview };
          if (Array.isArray(raw.agents) && raw.agents.length > 0) {
            state.agents = state.agents.map(a => {
              const found = raw.agents?.find((item: Agent) => item.id === a.id);
              return found ? { ...a, ...found } : a;
            });
          }
        }
      })
      .addCase(fetchAgentStatusThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update agent status';
      })
      .addCase(fetchQueueMetricsThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.queueMetrics = action.payload;
        }
      })
      .addCase(triggerPipelineWorkflowThunk.pending, (state) => {
        state.triggeringPipeline = true;
      })
      .addCase(triggerPipelineWorkflowThunk.fulfilled, (state, action) => {
        state.triggeringPipeline = false;
        if (action.payload && typeof action.payload === 'object') {
          const res = action.payload as { execution_id?: string; status?: string; pipeline?: PipelineExecution };
          if (res.pipeline) {
            state.activePipeline = res.pipeline;
          }
        }
      })
      .addCase(triggerPipelineWorkflowThunk.rejected, (state, action) => {
        state.triggeringPipeline = false;
        state.error = (action.payload as string) || 'Pipeline trigger failed';
      });
  },
});

export const {
  setAgentStatus,
  updateQueueMetrics,
  setPipelineExecution,
  setTriggeringPipeline,
  setBatchRunning,
  setSelectedAgentId,
  appendActivityLog,
  clearActivityLogs,
} = agentControlSlice.actions;

export default agentControlSlice.reducer;
