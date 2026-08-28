import api from './api';
import type { AgentInfo, AgentRun, RecentActivity, PipelineExecution, PipelineWorkflow, QueueMetrics, AgentStatusResponse } from '../types/agent';

/**
 * Service: Agent Control Center & Multi-Agent Orchestrator Service (Phase 5)
 */

export const getAgentStatus = async (): Promise<AgentStatusResponse & { agents?: AgentInfo[] } & AgentInfo[]> => {
  const response = await api.get('/agents/status');
  return response.data.data;
};

export const getAgentRuns = async (agentId: string, limit = 50): Promise<AgentRun[]> => {
  const response = await api.get(`/agents/${agentId}/runs?limit=${limit}`);
  return response.data.data as AgentRun[];
};

export const getRunDetail = async (agentId: string, runId: string | number): Promise<AgentRun> => {
  const response = await api.get(`/agents/${agentId}/runs/${runId}`);
  return response.data.data as AgentRun;
};

export const getRecentActivity = async (limit = 20): Promise<RecentActivity[]> => {
  const response = await api.get(`/agents/activity?limit=${limit}`);
  return response.data.data as RecentActivity[];
};

export const analyzeBulk = async (caseIds: number[]): Promise<unknown> => {
  const response = await api.post('/reconciliations/analyze-bulk', { caseIds });
  return response.data.data;
};

export const analyzeAllPending = async (): Promise<unknown> => {
  const response = await api.post('/reconciliations/analyze-all-pending');
  return response.data.data;
};

export const triggerPipelineWorkflow = async (payload: PipelineWorkflow): Promise<PipelineExecution> => {
  const response = await api.post('/agents/pipeline/run', payload);
  return response.data.data as PipelineExecution;
};

export const batchTriggerPipeline = async (payload: PipelineWorkflow): Promise<{ executed?: number; data?: PipelineExecution[] }> => {
  const response = await api.post('/agents/pipeline/batch-run', payload);
  return response.data.data;
};

export const getPendingPipelineTargets = async (): Promise<Array<{ id: number; company_id?: number | null; company_name?: string; sender_name?: string; transaction_id?: string; payment_id?: number; amount?: number | string; payment_date?: string; status?: string }>> => {
  const response = await api.get('/agents/pipeline/pending-targets');
  return response.data.data;
};

export const getPipelineExecutions = async (params: Record<string, unknown> = {}): Promise<{ data: PipelineExecution[] }> => {
  try {
    const response = await api.get('/agents/pipeline/executions', { params });
    return response.data.data as { data: PipelineExecution[] };
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) {
      return { data: [] };
    }
    throw err;
  }
};

export const getPipelineExecutionById = async (pipelineId: string | number): Promise<PipelineExecution> => {
  const response = await api.get(`/agents/pipeline/executions/${pipelineId}`);
  return response.data.data as PipelineExecution;
};

export const getQueueStatus = async (): Promise<QueueMetrics> => {
  try {
    const response = await api.get('/agents/queue/status');
    return response.data.data as QueueMetrics;
  } catch {
    return { activeJobsCount: 0, queuedJobsCount: 0, stats: { totalCompleted: 0 } };
  }
};
