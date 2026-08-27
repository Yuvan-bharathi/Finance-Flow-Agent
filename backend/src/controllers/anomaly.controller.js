import pool from '../config/db.js';
import { runAnomalyAgentStageA, runAnomalyAgentStageB } from '../agents/anomalyAgent.js';
import cacheService from '../services/cache.service.js';

/**
 * Controller: Financial Transaction Anomaly Detection (Agent 7)
 * Base path: /api/anomaly
 */

/**
 * POST /api/anomaly/check/:paymentId
 * Manually trigger Stage B anomaly check on a specific payment.
 * (Stage A is auto-triggered on ingest; this is a manual re-run)
 */
export const runAnomalyCheck = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);
    const caseId    = req.body?.case_id ? parseInt(req.body.case_id, 10) : null;
    const triggeredBy = req.user?.id || null;

    if (!paymentId || isNaN(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    }

    const result = await runAnomalyAgentStageB(paymentId, caseId, triggeredBy);

    if (!result) {
      return res.status(202).json({
        success: true,
        message: 'Anomaly check already running or payment not yet matched to a loan. Check back shortly.',
        payment_id: paymentId
      });
    }

    cacheService.invalidateByTag('anomalies');

    return res.status(200).json({
      success: true,
      message: `Anomaly check complete — ${result.severity} (Score: ${result.anomaly_score})`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/anomaly/report/:paymentId
 * Retrieve the stored anomaly analysis for a specific payment.
 */
export const getAnomalyReport = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);
    if (!paymentId || isNaN(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    }

    const [rows] = await pool.query(
      `SELECT
         pa.*,
         COALESCE(pa.case_id, rc.id) AS case_id,
         p.transaction_id,
         p.sender_name,
         p.sender_account,
         p.amount,
         p.payment_date,
         c.company_name,
         l.loan_number,
         COALESCE(u.name, u.email) AS reviewed_by_name
       FROM payment_anomalies pa
       LEFT JOIN payments p ON p.id = pa.payment_id
       LEFT JOIN reconciliation_cases rc ON rc.payment_id = pa.payment_id
       LEFT JOIN companies c ON c.id = pa.company_id
       LEFT JOIN loans l ON l.id = pa.loan_id
       LEFT JOIN users u ON u.id = pa.reviewed_by
       WHERE pa.payment_id = ?
       ORDER BY pa.detection_stage DESC
       LIMIT 10`,
      [paymentId]
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/anomaly/list
 * Paginated list of anomaly records with optional filters.
 * Query params: status, severity, page, limit
 */
export const getAnomalyList = async (req, res, next) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = ['pa.anomaly_detected = 1'];
    const params = [];

    if (status)   { conditions.push('pa.status = ?');   params.push(status);   }
    if (severity) { conditions.push('pa.severity = ?'); params.push(severity); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         pa.id, pa.payment_id,
         COALESCE(pa.case_id, rc.id) AS case_id,
         pa.company_id, pa.loan_id,
         pa.anomaly_types, pa.anomaly_score, pa.severity, pa.status,
         pa.safe_to_proceed, pa.safe_to_allocate, pa.requires_manual_review,
         pa.recommended_action, pa.evidence,
         pa.explanation, pa.recommendation,
         pa.score_breakdown, pa.deterministic_score,
         pa.detection_stage, pa.reviewed_by, pa.reviewed_at,
         pa.dismiss_reason, pa.created_at,
         p.transaction_id, p.sender_name, p.amount, p.payment_date,
         c.company_name,
         l.loan_number
       FROM payment_anomalies pa
       LEFT JOIN payments p ON p.id = pa.payment_id
       LEFT JOIN reconciliation_cases rc ON rc.payment_id = pa.payment_id
       LEFT JOIN companies c ON c.id = pa.company_id
       LEFT JOIN loans l ON l.id = pa.loan_id
       ${where}
       ORDER BY pa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM payment_anomalies pa ${where}`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/anomaly/:id/dismiss
 * Human dismisses an anomaly as a false positive.
 * Stores reviewer info and dismiss reason for audit trail.
 */
export const dismissAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.id, 10);
    const { dismiss_reason } = req.body;
    const reviewedBy = req.user?.id || null;

    if (!anomalyId || isNaN(anomalyId)) {
      return res.status(400).json({ success: false, message: 'Invalid anomaly ID.' });
    }

    const [existing] = await pool.query('SELECT id, status FROM payment_anomalies WHERE id = ? LIMIT 1', [anomalyId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Anomaly record not found.' });
    }
    if (existing[0].status === 'dismissed') {
      return res.status(409).json({ success: false, message: 'Anomaly already dismissed.' });
    }

    await pool.query(
      `UPDATE payment_anomalies SET
         status = 'dismissed',
         dismiss_reason = ?,
         reviewed_by = ?,
         reviewed_at = NOW(),
         updated_at = NOW()
       WHERE id = ?`,
      [dismiss_reason || null, reviewedBy, anomalyId]
    );

    cacheService.invalidateByTag('anomalies');

    return res.status(200).json({
      success: true,
      message: 'Anomaly dismissed successfully. Dismiss reason recorded for audit trail.',
      anomaly_id: anomalyId
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/anomaly/:id/escalate
 * Human escalates anomaly to Agent 6 (Notification & Escalation Agent).
 * Updates anomaly status and triggers escalation workflow.
 */
export const escalateAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.id, 10);
    const reviewedBy = req.user?.id || null;

    if (!anomalyId || isNaN(anomalyId)) {
      return res.status(400).json({ success: false, message: 'Invalid anomaly ID.' });
    }

    const [existing] = await pool.query(
      `SELECT pa.*, COALESCE(pa.case_id, rc.id) AS case_id, p.transaction_id, p.amount, c.company_name
       FROM payment_anomalies pa
       LEFT JOIN payments p ON p.id = pa.payment_id
       LEFT JOIN reconciliation_cases rc ON rc.payment_id = pa.payment_id
       LEFT JOIN companies c ON c.id = pa.company_id
       WHERE pa.id = ? LIMIT 1`,
      [anomalyId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Anomaly record not found.' });
    }
    if (existing[0].status === 'escalated') {
      return res.status(409).json({ success: false, message: 'Anomaly already escalated.' });
    }

    const anomaly = existing[0];

    await pool.query(
      `UPDATE payment_anomalies SET
         status = 'escalated',
         reviewed_by = ?,
         reviewed_at = NOW(),
         updated_at = NOW()
       WHERE id = ?`,
      [reviewedBy, anomalyId]
    );

    // Create structured executive alert for Agent 6
    const alertTitle = `🚨 Transaction Anomaly: ${anomaly.company_name || 'Borrower'} (Score: ${parseFloat(anomaly.anomaly_score || 0).toFixed(0)}/100)`;
    const alertMessage = `High anomaly detected on Case #${anomaly.case_id || 'N/A'} (Payment #${anomaly.payment_id}, TXN: ${anomaly.transaction_id || 'N/A'}). Recommended Action: ${anomaly.recommended_action || 'ESCALATE'}. Details: ${anomaly.recommendation || anomaly.explanation}`;

    await pool.query(
      `INSERT INTO notification_alerts
         (company_id, loan_id, case_id, title, message, severity,
          outstanding_amount, recommended_recipient, recommended_action,
          ai_reasoning, escalation_level, notification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        anomaly.company_id || 1,
        anomaly.loan_id || null,
        anomaly.case_id || null,
        alertTitle,
        alertMessage,
        anomaly.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        anomaly.amount || 0.00,
        'OPERATIONS_HEAD',
        anomaly.recommended_action || 'ESCALATE',
        JSON.stringify({
          evidence: typeof anomaly.evidence === 'string' ? JSON.parse(anomaly.evidence) : anomaly.evidence,
          anomaly_types: anomaly.anomaly_types,
          score_breakdown: anomaly.score_breakdown
        }),
        'EXECUTIVE'
      ]
    );

    const { emitSocketEvent } = await import('../config/socket.js');
    emitSocketEvent('escalation_alert_created', {
      anomaly_id: anomalyId,
      case_id: anomaly.case_id,
      payment_id: anomaly.payment_id,
      severity: anomaly.severity,
      recommended_action: anomaly.recommended_action
    });

    cacheService.invalidateByTag('anomalies');
    cacheService.invalidateByTag('notifications');

    return res.status(200).json({
      success: true,
      message: `Anomaly #${anomalyId} escalated to Agent 6 Executive Alerts successfully.`,
      anomaly_id: anomalyId,
      case_id: anomaly.case_id,
      recommended_action: anomaly.recommended_action
    });
  } catch (err) {
    next(err);
  }
};
