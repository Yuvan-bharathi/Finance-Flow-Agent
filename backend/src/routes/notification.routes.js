import { Router } from 'express';
import {
  triggerEscalationScan,
  getAlerts,
  approveAlert,
  dismissAlert
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

/**
 * Express Router: Notification & Escalation Routes
 *
 * Base path: /api/notifications (mounted in app.js)
 * Authentication: Required for all routes (JWT cookie via authenticate middleware)
 *
 * Routes:
 *
 *   POST /api/notifications/escalate
 *     → Triggers Agent 6 (manual SLA breach scan + Groq escalation analysis)
 *     → Creates pending alerts in notification_alerts
 *     → Emits WebSocket NEW_ESCALATION_ALERTS
 *     → Auth: Any authenticated user (admin/manager recommended)
 *
 *   GET /api/notifications/alerts
 *     → Returns escalation alerts (filtered by status/severity)
 *     → Query: ?status=pending&severity=HIGH&limit=20
 *     → Auth: Any authenticated user
 *
 *   PUT /api/notifications/alerts/:id/approve
 *     → Human approves an alert (Approve & Send workflow step)
 *     → Updates notification_status = 'approved'
 *     → Auth: Authenticated user (records who approved)
 *
 *   PUT /api/notifications/alerts/:id/dismiss
 *     → Human dismisses an alert (no action needed)
 *     → Updates notification_status = 'dismissed'
 *     → Auth: Authenticated user
 */

const router = Router();

router.use(authenticate);

// Trigger Agent 6 — Manual escalation scan
router.post('/escalate', triggerEscalationScan);

// Read escalation alerts
router.get('/alerts', getAlerts);

// Human-in-the-loop approval actions
router.put('/alerts/:id/approve', approveAlert);
router.put('/alerts/:id/dismiss', dismissAlert);

export default router;
