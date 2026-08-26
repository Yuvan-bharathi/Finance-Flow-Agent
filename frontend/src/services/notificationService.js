import api from './api';

/**
 * Service: Notification & Escalation API Client
 *
 * Purpose:
 *   Provides frontend functions to interact with the Agent 6 Notification backend.
 *
 * Called by:
 *   - frontend/src/pages/AgentControlCenter.jsx
 */

/**
 * triggerEscalationScan
 *
 * Purpose:
 *   Triggers Agent 6 to run a manual SLA breach detection and escalation analysis.
 *
 * Data flow:
 *   React [Run Escalation Scan] button
 *     → triggerEscalationScan()
 *     → POST /api/notifications/escalate
 *     → backend notificationAgent.js (SQL SLA engine + Groq)
 *     → notification_alerts created (status = 'pending')
 *     → WebSocket NEW_ESCALATION_ALERTS emitted
 *
 * @returns {Promise<Object>} { success, data: { alerts_created, alerts[] } }
 */
export const triggerEscalationScan = () => api.post('/notifications/escalate');

/**
 * getAlerts
 *
 * Purpose:
 *   Retrieves escalation alerts from the backend, with optional filtering.
 *
 * @param {Object} params - Optional filters: { status, severity, limit }
 *   status  — 'pending' | 'approved' | 'dismissed'
 *   severity — 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 *   limit   — max records (default: 20)
 *
 * @returns {Promise<Object>} { success, data: [ <alert>, ... ] }
 */
export const getAlerts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status)   query.set('status', params.status);
  if (params.severity) query.set('severity', params.severity);
  if (params.limit)    query.set('limit', params.limit);
  return api.get(`/notifications/alerts?${query.toString()}`);
};

/**
 * approveAlert
 *
 * Purpose:
 *   Records human approval of an escalation alert.
 *   The user clicked [Approve & Send] on the alert card.
 *
 * @param {number} alertId - notification_alerts.id primary key
 * @returns {Promise<Object>} { success, message }
 */
export const approveAlert = (alertId) =>
  api.put(`/notifications/alerts/${alertId}/approve`);

/**
 * dismissAlert
 *
 * Purpose:
 *   Records human dismissal of an escalation alert.
 *   The user clicked [Dismiss] on the alert card — no action taken.
 *
 * @param {number} alertId - notification_alerts.id primary key
 * @returns {Promise<Object>} { success, message }
 */
export const dismissAlert = (alertId) =>
  api.put(`/notifications/alerts/${alertId}/dismiss`);

/**
 * batchApproveAlerts
 *
 * Purpose:
 *   Approves and dispatches multiple notification alerts in a single batch call.
 *
 * @param {Array<number>} alertIds - Array of notification_alerts.id
 * @returns {Promise<Object>} { success, message, data }
 */
export const batchApproveAlerts = (alertIds = []) =>
  api.post('/notifications/alerts/batch-approve', { alertIds });

/**
 * batchDismissAlerts
 *
 * Purpose:
 *   Dismisses multiple notification alerts in a single batch call.
 *
 * @param {Array<number>} alertIds - Array of notification_alerts.id
 * @returns {Promise<Object>} { success, message }
 */
export const batchDismissAlerts = (alertIds = []) =>
  api.post('/notifications/alerts/batch-dismiss', { alertIds });
