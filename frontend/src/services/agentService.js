import api from './api';

/**
 * Service: Agent Control Center & Multi-Agent Orchestrator Service (Phase 5)
 * API client functions for agent observability, status, run history,
 * multi-agent pipeline triggers, and live queue telemetry.
 */

export const getAgentStatus = async () => {
  const response = await api.get('/agents/status');
  return response.data.data;
};

export const getAgentRuns = async (agentId, limit = 50) => {
  const response = await api.get(`/agents/${agentId}/runs?limit=${limit}`);
  return response.data.data;
};

export const getRunDetail = async (agentId, runId) => {
  const response = await api.get(`/agents/${agentId}/runs/${runId}`);
  return response.data.data;
};

export const getRecentActivity = async (limit = 20) => {
  const response = await api.get(`/agents/activity?limit=${limit}`);
  return response.data.data;
};

export const analyzeBulk = async (caseIds) => {
  const response = await api.post('/reconciliations/analyze-bulk', { caseIds });
  return response.data.data;
};

export const analyzeAllPending = async () => {
  const response = await api.post('/reconciliations/analyze-all-pending');
  return response.data.data;
};

// =============================================================================
// Phase 5 Multi-Agent Pipeline API Calls
// =============================================================================

export const triggerPipelineWorkflow = async (payload) => {
  const response = await api.post('/agents/pipeline/run', payload);
  return response.data.data;
};

export const getPipelineExecutions = async (params = {}) => {
  try {
    const response = await api.get('/agents/pipeline/executions', { params });
    return response.data.data;
  } catch (err) {
    if (err.response?.status === 404) {
      return { data: [] };
    }
    throw err;
  }
};

export const getPipelineExecutionById = async (id) => {
  const response = await api.get(`/agents/pipeline/executions/${id}`);
  return response.data.data;
};

export const getQueueStatus = async () => {
  try {
    const response = await api.get('/agents/queue/status');
    return response.data.data;
  } catch (err) {
    if (err.response?.status === 404) {
      return { activeJobsCount: 0, queuedJobsCount: 0, stats: { totalCompleted: 0 } };
    }
    throw err;
  }
};
