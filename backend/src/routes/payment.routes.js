import { Router } from 'express';
import {
  ingestPayment,
  getPayments,
  getPaymentById,
  ingestMockBankDeposit
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

/**
 * Express Router: Payment Ingestion Routes (Phase 6 OpenAPI Annotated)
 * Base path: /api/v1/payments
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/payments/ingest:
 *   post:
 *     summary: Ingest Raw Bank Deposit Transaction
 *     description: Ingests an incoming bank payment, creates a tracking record in `payments`, and automatically generates an open case in `reconciliation_cases`.
 *     tags:
 *       - Payments & Ingestion
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
 *               - amount
 *               - sender_name
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: TXN-BANK-998877
 *               amount:
 *                 type: number
 *                 example: 100000.00
 *               payment_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-08-25
 *               sender_name:
 *                 type: string
 *                 example: ABC Technologies Pvt Ltd
 *               sender_account:
 *                 type: string
 *                 example: 123456789012
 *               reference:
 *                 type: string
 *                 example: LN-2026-001 AUG REPAYMENT
 *     responses:
 *       201:
 *         description: Payment successfully ingested and reconciliation case created.
 *       400:
 *         description: Validation error or missing required fields.
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/ingest',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  idempotencyMiddleware({ required: false }),
  ingestPayment
);

/**
 * @openapi
 * /api/v1/payments/mock-bank-deposit:
 *   post:
 *     summary: Simulate Bank Webhook Deposit Ingestion
 *     description: Simulates an automated real-time bank webhook notification depositing funds into the system.
 *     tags:
 *       - Payments & Ingestion
 *     security:
 *       - BearerAuth: []
 *       - IdempotencyKeyHeader: []
 *     responses:
 *       201:
 *         description: Webhook simulated and processed.
 */
router.post(
  '/mock-bank-deposit',
  requirePermission(PERMISSIONS.PAYMENT_CREATE),
  idempotencyMiddleware({ required: false }),
  ingestMockBankDeposit
);

/**
 * @openapi
 * /api/v1/payments:
 *   get:
 *     summary: List Ingested Bank Payments (Paginated)
 *     description: Retrieves historical payment deposits with optional status filter, sorting, and pagination.
 *     tags:
 *       - Payments & Ingestion
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *         description: Paginated list of ingested payments.
 */
router.get('/', requirePermission(PERMISSIONS.PAYMENT_VIEW), getPayments);
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_VIEW), getPaymentById);

export default router;
