import { Router } from 'express';
import {
  triggerEscalationScan,
  getAlerts,
  approveAlert,
  dismissAlert,
  batchApproveAlerts,
  batchDismissAlerts
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

/**
 * Express Router: Notification & Escalation Routes
 * Base path: /api/notifications (mounted in app.js)
 */

const router = Router();

router.use(authenticate);

// Trigger Agent 6 — Manual escalation scan (Restricted to owner, super_admin, admin, manager)
router.post('/escalate', authorize(['owner', 'super_admin', 'admin', 'manager']), triggerEscalationScan);

// Read escalation alerts (All authenticated users can view - Cached for 30s under 'notifications' tag)
router.get('/alerts', cacheMiddleware({ ttlSeconds: 30, tag: 'notifications' }), getAlerts);

// Human-in-the-loop approval actions (Restricted to owner, super_admin, admin, manager, senior_accountant)
router.put('/alerts/:id/approve', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), approveAlert);
router.put('/alerts/:id/dismiss', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), dismissAlert);

// Batch approval and dispatch actions (Restricted to owner, super_admin, admin, manager, senior_accountant)
router.post('/alerts/batch-approve', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), batchApproveAlerts);
router.post('/alerts/batch-dismiss', authorize(['owner', 'super_admin', 'admin', 'manager', 'senior_accountant']), batchDismissAlerts);

export default router;
