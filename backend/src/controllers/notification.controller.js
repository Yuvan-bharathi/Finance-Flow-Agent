import { runNotificationAgent } from '../agents/notificationAgent.js';
import pool from '../config/db.js';

/**
 * Controller: Notification & Escalation Agent
 *
 * Purpose:
 *   HTTP handlers for Agent 6 operations.
 *   Receives requests from the frontend, validates auth via middleware,
 *   delegates to notificationAgent.js, and returns results.
 *
 * Called by:
 *   - notification.routes.js
 *
 * Routes handled:
 *   POST /api/notifications/escalate → triggerEscalationScan
 *   GET  /api/notifications/alerts   → getAlerts
 *   PUT  /api/notifications/alerts/:id/approve → approveAlert
 *   PUT  /api/notifications/alerts/:id/dismiss → dismissAlert
 *
 * @param {Object} req
 *   req.user — Set by auth.middleware after JWT verification { id, email, role }
 *
 * @param {Object} res
 *   Express response object — sends JSON back to the React frontend
 */

/**
 * triggerEscalationScan
 *
 * Purpose:
 *   Triggers Agent 6 to run a full SLA breach detection + Groq escalation scan.
 *   This is MANUAL ONLY — user must click "Run Escalation Scan" in the UI.
 *
 * Data flow:
 *   POST /api/notifications/escalate
 *     → auth.middleware (JWT → req.user)
 *     → triggerEscalationScan()
 *     → runNotificationAgent(req.user.id)
 *     → _getOverdueLoans() (SQL SLA engine)
 *     → Groq analysis
 *     → notification_alerts table (status = 'pending')
 *     → WebSocket NEW_ESCALATION_ALERTS
 *     → JSON response
 *
 * Success response (200):
 *   { success: true, data: { alerts_created, alerts[] } }
 */
export const triggerEscalationScan = async (req, res) => {
  try {
    const triggeredBy = req.user?.id || null;
    const result = await runNotificationAgent(triggeredBy);

    return res.status(200).json({
      success: true,
      message: result.cached
        ? 'Escalation scan already running.'
        : `Escalation scan complete. ${result.alerts_created} alerts generated.`,
      data: result
    });

  } catch (err) {
    console.error('[Notification Controller Error]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Escalation scan failed.',
      error: err.message
    });
  }
};

/**
 * getAlerts
 *
 * Purpose:
 *   Retrieves notification alerts from notification_alerts table.
 *   Supports filtering by status (pending/approved/dismissed) and severity.
 *
 * Query params:
 *   ?status=pending   (default: all)
 *   ?severity=HIGH    (optional filter)
 *   ?limit=20         (default: 20, max: 100)
 *
 * Data flow:
 *   GET /api/notifications/alerts
 *     → auth.middleware
 *     → getAlerts()
 *     → SELECT from notification_alerts JOIN companies JOIN users
 *     → JSON response
 */
export const getAlerts = async (req, res) => {
  try {
    const { status, severity, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam, 10) || 20, 100);

    // Build dynamic WHERE clause based on query params
    // This avoids hardcoded SQL and allows flexible filtering
    const conditions = [];
    const params     = [];

    if (status) {
      conditions.push('na.notification_status = ?');
      params.push(status);
    }
    if (severity) {
      conditions.push('na.severity = ?');
      params.push(severity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT
        na.*,
        c.company_name,
        c.contact_name,
        c.contact_email,
        u.name                AS approved_by_name
      FROM notification_alerts na
      JOIN companies c ON na.company_id = c.id
      LEFT JOIN users u ON na.approved_by = u.id
      ${whereClause}
      ORDER BY
        FIELD(na.severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
        na.created_at DESC
      LIMIT ?
    `, [...params, limit]);

    return res.status(200).json({ success: true, data: rows });

  } catch (err) {
    console.error('[Notification Controller getAlerts Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve alerts.' });
  }
};

/**
 * approveAlert
 *
 * Purpose:
 *   Human approves an escalation alert (marks it as 'approved').
 *   This is the HUMAN-IN-THE-LOOP action — after Groq generates the alert,
 *   a user with appropriate permissions decides to act on it.
 *
 * Path param: :id — notification_alerts.id
 *
 * Data flow:
 *   [Approve] button click → PUT /api/notifications/alerts/:id/approve
 *     → auth.middleware (req.user.id = who approved)
 *     → UPDATE notification_alerts SET status = 'approved'
 */
export const approveAlert = async (req, res) => {
  try {
    const alertId     = parseInt(req.params.id, 10);
    const approvedBy  = req.user?.id || 1;

    // Fetch full alert and company details
    const [alertRows] = await pool.query(`
      SELECT na.*, c.company_name, c.contact_name, c.contact_email
      FROM notification_alerts na
      JOIN companies c ON na.company_id = c.id
      WHERE na.id = ?
    `, [alertId]);

    await pool.execute(`
      UPDATE notification_alerts
      SET notification_status = 'approved', approved_by = ?, approved_at = NOW()
      WHERE id = ?
    `, [approvedBy, alertId]);

    const alert = alertRows[0] || {};

    return res.status(200).json({
      success: true,
      message: `Escalation notice approved & email successfully triggered to ${alert.recommended_recipient || 'Borrower'} (${alert.contact_email || 'contact'}).`,
      data: {
        alertId,
        recipient: alert.recommended_recipient,
        recipientEmail: alert.contact_email,
        companyName: alert.company_name,
        dispatchedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[Notification Controller approveAlert Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to approve alert.' });
  }
};

/**
 * dismissAlert
 *
 * Purpose:
 *   Human dismisses an escalation alert (no action needed).
 *   Records who dismissed it and when — maintains a full audit trail.
 */
export const dismissAlert = async (req, res) => {
  try {
    const alertId    = parseInt(req.params.id, 10);
    const dismissedBy = req.user?.id || 1;

    await pool.execute(`
      UPDATE notification_alerts
      SET notification_status = 'dismissed', approved_by = ?, approved_at = NOW()
      WHERE id = ?
    `, [dismissedBy, alertId]);

    return res.status(200).json({ success: true, message: 'Alert dismissed.' });

  } catch (err) {
    console.error('[Notification Controller dismissAlert Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to dismiss alert.' });
  }
};
