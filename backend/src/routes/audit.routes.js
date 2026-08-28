import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

/**
 * Express Router: Audit Log Routes (Phase 6 OpenAPI Annotated)
 * Base Path: /api/v1/audit-logs
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/audit-logs:
 *   get:
 *     summary: Retrieve Immutable Regulatory Audit Trail (Paginated)
 *     description: Returns immutable audit log records with user attribution, entity type, before/after JSON diffs, and Correlation IDs.
 *     tags:
 *       - Audit & Compliance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: correlation_id
 *         schema:
 *           type: string
 *         description: Filter logs by exact distributed correlation ID.
 *       - in: query
 *         name: entity_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated audit log records.
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', requirePermission(PERMISSIONS.AUDIT_VIEW), getAuditLogs);

export default router;
