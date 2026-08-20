import api from './api';

/**
 * Service: Agent Control Center Service
 * API client functions for agent observability, status, run history, and bulk execution.
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
