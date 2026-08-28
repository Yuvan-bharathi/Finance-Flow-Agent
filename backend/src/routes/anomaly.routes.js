import { Router } from 'express';
import {
  runAnomalyCheck,
  getAnomalyReport,
  getAnomalyList,
  dismissAnomaly,
  escalateAnomaly
} from '../controllers/anomaly.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

/**
 * Express Router: Financial Transaction Anomaly Detection Routes (Agent 7)
 * Base path: /api/anomaly
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/anomaly/list:
 *   get:
 *     summary: List All Flagged Anomalies
 *     description: Returns paginated list of payment anomaly records. Filter by status and severity.
 *     tags:
 *       - Anomaly Detection (Agent 7)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, dismissed, escalated, cleared]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [CLEAR, LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated anomaly list.
 */
router.get('/list', requirePermission(PERMISSIONS.CASE_VIEW), cacheMiddleware({ ttlSeconds: 15, tag: 'anomalies' }), getAnomalyList);

/**
 * @openapi
 * /api/anomaly/report/{paymentId}:
 *   get:
 *     summary: Get Anomaly Report for a Payment
 *     description: Retrieves all anomaly analysis records (Stage A and Stage B) for a specific payment.
 *     tags:
 *       - Anomaly Detection (Agent 7)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Anomaly report data.
 */
router.get('/report/:paymentId', requirePermission(PERMISSIONS.CASE_VIEW), getAnomalyReport);

/**
 * @openapi
 * /api/anomaly/check/{paymentId}:
 *   post:
 *     summary: Manually Trigger Stage B Anomaly Check
 *     description: Manually runs the full post-match anomaly analysis on a payment. Stage A runs automatically on ingest.
 *     tags:
 *       - Anomaly Detection (Agent 7)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               case_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Anomaly check result.
 */
router.post('/check/:paymentId', requirePermission(PERMISSIONS.AGENT_RUN), runAnomalyCheck);

/**
 * @openapi
 * /api/anomaly/{id}/dismiss:
 *   put:
 *     summary: Dismiss Anomaly as False Positive
 *     description: Human reviewer dismisses a flagged anomaly. Reason and reviewer are recorded for audit trail.
 *     tags:
 *       - Anomaly Detection (Agent 7)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dismiss_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Anomaly dismissed.
 */
router.put('/:id/dismiss', requirePermission(PERMISSIONS.CASE_VIEW), dismissAnomaly);

/**
 * @openapi
 * /api/anomaly/{id}/escalate:
 *   put:
 *     summary: Escalate Anomaly to Agent 6
 *     description: Human reviewer escalates a HIGH/CRITICAL anomaly to Agent 6 (Notification & Escalation) for executive review.
 *     tags:
 *       - Anomaly Detection (Agent 7)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Anomaly escalated.
 */
router.put('/:id/escalate', requirePermission(PERMISSIONS.AGENT_RUN), escalateAnomaly);

export default router;
