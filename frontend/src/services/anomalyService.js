import api from './api';

/**
 * Frontend Service: Financial Transaction Anomaly Detection (Agent 7)
 * All requests use the `clientCache` layer via `api.js` interceptors.
 */

/**
 * Manually trigger Stage B anomaly check on a specific payment.
 * (Stage A auto-triggers on ingest — this is a manual re-run or first-time check.)
 * @param {number} paymentId
 * @param {number|null} caseId
 */
export const runAnomalyCheck = async (paymentId, caseId = null) => {
  const { data } = await api.post(`/anomaly/check/${paymentId}`, { case_id: caseId });
  return data;
};

/**
 * Retrieve stored anomaly analysis records (Stage A + Stage B) for a payment.
 * @param {number} paymentId
 */
export const getAnomalyReport = async (paymentId) => {
  const { data } = await api.get(`/anomaly/report/${paymentId}`);
  return data?.data || [];
};

/**
 * Get paginated list of flagged anomalies.
 * @param {Object} params - { status, severity, page, limit }
 */
export const getAnomalyList = async (params = {}) => {
  const { data } = await api.get('/anomaly/list', { params });
  return data;
};

/**
 * Dismiss a flagged anomaly as a false positive.
 * Records dismiss reason and reviewer for audit trail.
 * @param {number} anomalyId
 * @param {string} dismissReason
 */
export const dismissAnomaly = async (anomalyId, dismissReason = '') => {
  const { data } = await api.put(`/anomaly/${anomalyId}/dismiss`, { dismiss_reason: dismissReason });
  return data;
};

/**
 * Escalate a HIGH/CRITICAL anomaly to Agent 6 (Notification & Escalation).
 * @param {number} anomalyId
 */
export const escalateAnomaly = async (anomalyId) => {
  const { data } = await api.put(`/anomaly/${anomalyId}/escalate`);
  return data;
};
