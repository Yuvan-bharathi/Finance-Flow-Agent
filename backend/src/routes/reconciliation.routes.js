import { Router } from 'express';
import {
  getStats,
  getCases,
  getCaseById,
  getAllocations,
  analyzeCase,
  analyzeBulk,
  analyzeAllPending,
  approveRecommendation,
  rejectRecommendation,
  overrideRecommendation
} from '../controllers/reconciliation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

/**
 * Express Router: Payment Reconciliation Routes (Phase 6 OpenAPI Annotated)
 * Base path: /api/v1/reconciliations
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/reconciliations/stats:
 *   get:
 *     summary: Get Aggregate Reconciliation Case Statistics
 *     description: Returns case counts partitioned by status (New, Open, In Progress, Resolved, Flagged, Disputed) and average AI match confidence.
 *     tags:
 *       - Reconciliation & Settlement
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reconciliation case statistics.
 */
router.get('/stats', requirePermission(PERMISSIONS.CASE_VIEW), cacheMiddleware({ ttlSeconds: 60, tag: 'reconciliations' }), getStats);

/**
 * @openapi
 * /api/v1/reconciliations/cases:
 *   get:
 *     summary: List Reconciliation Cases (Paginated)
 *     description: Retrieves reconciliation cases with optional status, priority, and borrower company filters.
 *     tags:
 *       - Reconciliation & Settlement
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated reconciliation cases.
 */
router.get('/cases', requirePermission(PERMISSIONS.CASE_VIEW), cacheMiddleware({ ttlSeconds: 45, tag: 'reconciliations' }), getCases);
router.get('/cases/:caseId', requirePermission(PERMISSIONS.CASE_VIEW), cacheMiddleware({ ttlSeconds: 60, tag: 'reconciliations' }), getCaseById);
router.get('/allocations', requirePermission(PERMISSIONS.CASE_VIEW), cacheMiddleware({ ttlSeconds: 60, tag: 'reconciliations' }), getAllocations);

// Trigger AI Agent 1
router.post('/analyze/:caseId', requirePermission(PERMISSIONS.AGENT_RUN), analyzeCase);
router.post('/analyze-bulk', requirePermission(PERMISSIONS.AGENT_RUN), analyzeBulk);
router.post('/analyze-all-pending', requirePermission(PERMISSIONS.AGENT_RUN), analyzeAllPending);

/**
 * @openapi
 * /api/v1/reconciliations/approve:
 *   post:
 *     summary: Human Approval & ACID Financial Settlement
 *     description: Approves an AI payment match, allocates funds to loan principal/interest in repayment schedules, updates loan outstanding balances, marks the case resolved, and logs an immutable audit trail in a single ACID MySQL transaction.
 *     tags:
 *       - Reconciliation & Settlement
 *     security:
 *       - BearerAuth: []
 *       - IdempotencyKeyHeader: []
 *       - CorrelationIdHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - case_id
 *             properties:
 *               case_id:
 *                 type: integer
 *                 example: 1
 *               recommendation_id:
 *                 type: integer
 *                 example: 1
 *               notes:
 *                 type: string
 *                 example: Verified bank reference against August invoice.
 *     responses:
 *       200:
 *         description: Payment successfully approved and allocated in ledger.
 *       400:
 *         description: Invalid state or case already resolved.
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/approve',
  requirePermission(PERMISSIONS.CASE_APPROVE),
  idempotencyMiddleware({ required: false }),
  approveRecommendation
);

router.post(
  '/reject',
  requirePermission(PERMISSIONS.CASE_REJECT),
  idempotencyMiddleware({ required: false }),
  rejectRecommendation
);

router.post(
  '/override',
  requirePermission(PERMISSIONS.CASE_OVERRIDE),
  idempotencyMiddleware({ required: false }),
  overrideRecommendation
);

export default router;
