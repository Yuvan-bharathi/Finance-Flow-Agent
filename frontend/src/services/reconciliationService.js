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
 * @returns {Promise<Object>} Created allocation result.
 */
export const approveRecommendation = async (recommendationId, notes = null) => {
  const response = await api.post('/reconciliations/approve', { recommendationId, notes });
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
 * @returns {Promise<Object>} Rejection result.
 */
export const rejectRecommendation = async (recommendationId, reason) => {
  const response = await api.post('/reconciliations/reject', { recommendationId, reason });
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
