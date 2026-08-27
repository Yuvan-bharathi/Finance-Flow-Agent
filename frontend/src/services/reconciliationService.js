import api from './api';

/**
 * Service: Reconciliation API Service
 * Purpose: Centralized API communication functions for reconciliation cases, analytics, and settlement endpoints.
 * 
 * Called by:
 * - Dashboard.jsx
 * - ActionCenter.jsx
 * - RecentCasesTable.jsx
 * - ActionCenterDrawer.jsx
 */

/**
 * Fetches list of reconciliation cases from backend.
 * 
 * Data source:
 * GET /api/reconciliations/cases
 * 
 * @param {string|null} status - Optional status filter.
 * @param {string|null} priority - Optional priority filter.
 * @returns {Promise<Array>} List of reconciliation case objects.
 */
export const getCases = async (status = null, priority = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/reconciliations/cases${queryString}`);
  return response.data?.data || [];
};

/**
 * Fetches dashboard analytics KPI stats, status distribution, and AI performance metrics.
 * 
 * Data source:
 * GET /api/reconciliations/stats
 * 
 * @returns {Promise<Object>} Object containing kpis, status_breakdown, and ai_performance data.
 */
export const getStats = async () => {
  const response = await api.get('/reconciliations/stats');
  return response.data?.data || {};
};

/**
 * Fetches a single reconciliation case with detailed recommendation history.
 * 
 * Data source:
 * GET /api/reconciliations/cases/:caseId
 * 
 * @param {number} caseId - Case ID.
 * @returns {Promise<Object>} Reconciliation case object.
 */
export const getCaseById = async (caseId) => {
  const response = await api.get(`/reconciliations/cases/${caseId}`);
  return response.data?.data || null;
};

/**
 * Triggers Payment Reconciliation AI Agent analysis for a case.
 * 
 * Data source:
 * POST /api/reconciliations/analyze/:caseId
 * 
 * @param {number} caseId - Case ID.
 * @returns {Promise<Object>} Generated recommendation and updated case details.
 */
export const analyzeCase = async (caseId) => {
  const response = await api.post(`/reconciliations/analyze/${caseId}`);
  return response.data?.data || null;
};

/**
 * Approves an AI candidate recommendation and executes financial settlement.
 * 
 * Data source:
 * POST /api/reconciliations/approve
 * 
 * @param {number} recommendationId - AI Recommendation ID.
 * @param {string|null} notes - Optional reviewer notes.
 * @param {number|null} caseId - Optional Case ID fallback.
 * @returns {Promise<Object>} Created allocation result.
 */
export const approveRecommendation = async (recommendationId, notes = null, caseId = null) => {
  const response = await api.post('/reconciliations/approve', { recommendationId, caseId, notes });
  return response.data?.data || null;
};

/**
 * Rejects an AI candidate recommendation.
 * 
 * Data source:
 * POST /api/reconciliations/reject
 * 
 * @param {number} recommendationId - AI Recommendation ID.
 * @param {string} reason - Rejection reason.
 * @param {number|null} caseId - Optional Case ID fallback.
 * @returns {Promise<Object>} Rejection result.
 */
export const rejectRecommendation = async (recommendationId, reason, caseId = null) => {
  const response = await api.post('/reconciliations/reject', { recommendationId, caseId, reason });
  return response.data?.data || null;
};

/**
 * Manually overrides an AI recommendation.
 * 
 * Data source:
 * POST /api/reconciliations/override
 * 
 * @param {Object} overridePayload - `{ caseId, repayment_schedule_id, allocated_amount, override_reason }`.
 * @returns {Promise<Object>} Override result.
 */
export const overrideRecommendation = async (overridePayload) => {
  const response = await api.post('/reconciliations/override', overridePayload);
  return response.data?.data || null;
};

/**
 * Fetches the active deterministic Playbook and audit checklist progress for a case.
 * 
 * @param {number} caseId - Reconciliation Case ID.
 * @returns {Promise<Object>} Playbook object with steps and progress.
 */
export const getCasePlaybook = async (caseId) => {
  const response = await api.get(`/reconciliations/cases/${caseId}/playbook`);
  return response.data?.data || null;
};

/**
 * Updates or toggles a single step in a case's playbook checklist.
 * 
 * @param {number} caseId - Reconciliation Case ID.
 * @param {number} stepId - Playbook step ID.
 * @param {boolean} completed - True if completed, false if unmarked.
 * @param {string|null} notes - Optional reviewer note.
 * @returns {Promise<Object>} Updated playbook object.
 */
export const updatePlaybookStep = async (caseId, stepId, completed, notes = null) => {
  const response = await api.post(`/reconciliations/cases/${caseId}/playbook/step`, {
    stepId,
    completed,
    notes
  });
  return response.data?.data || null;
};

/**
 * Updates overall Playbook review status (e.g. COMPLETED, ESCALATED, IN_PROGRESS).
 * 
 * @param {number} caseId - Reconciliation Case ID.
 * @param {string} status - New status string.
 * @returns {Promise<Object>} Updated playbook object.
 */
export const updatePlaybookStatus = async (caseId, status) => {
  const response = await api.post(`/reconciliations/cases/${caseId}/playbook/status`, { status });
  return response.data?.data || null;
};

/**
 * Fetches the library of Standardized Operational Playbooks (SOP) for Agent 7.
 * 
 * @returns {Promise<Array>} Array of standard playbook definitions.
 */
export const getStandardPlaybooks = async () => {
  const response = await api.get('/reconciliations/playbooks/standard');
  return response.data?.data || [];
};
