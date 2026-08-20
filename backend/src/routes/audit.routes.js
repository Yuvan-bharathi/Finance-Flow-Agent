import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

/**
 * Express Router: Audit Log Routes
 * Base Path: /api/audit-logs
 * 
 * Endpoints:
 * - GET /api/audit-logs (Admin, Manager, Accountant)
 */

const router = Router();

router.use(authenticate);
router.use(authorize(['admin', 'manager', 'accountant']));

router.get('/', getAuditLogs);

export default router;
