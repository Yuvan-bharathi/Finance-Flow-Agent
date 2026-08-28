import { Router } from 'express';
import {
  chat,
  wakeContext,
  getActiveProposals,
  confirmProposal,
  dismissProposal
} from '../controllers/assistant.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';
import { agentRateLimiter } from '../middleware/rateLimit.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

/**
 * Express Router: AI Operational Assistant & Copilot Routes (Phase 7 OpenAPI Annotated)
 * Base path: /api/v1/assistant (and /api/assistant)
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/assistant/chat:
 *   post:
 *     summary: Interact with FinanceFlow AI Operational Copilot
 *     description: Runs the Groq tool-calling agent with 18+ read-only financial tools. If mutation intent is requested, generates an `assistant_action_proposal` subject to human approval.
 *     tags:
 *       - AI Operational Copilot
 *     security:
 *       - BearerAuth: []
 *       - CorrelationIdHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Which companies are currently overdue and require follow-up?"
 *               conversationHistory:
 *                 type: array
 *                 items:
 *                   type: object
 *               contextPayload:
 *                 type: object
 *     responses:
 *       200:
 *         description: AI response with answer markdown, source citation pills, and active action proposals.
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/chat', requirePermission(PERMISSIONS.AI_QUERY), agentRateLimiter, chat);

/**
 * @openapi
 * /api/v1/assistant/proposals:
 *   get:
 *     summary: List User's Active Action Proposals
 *     description: Retrieves pending action proposals awaiting human confirmation for the authenticated user.
 *     tags:
 *       - AI Operational Copilot
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of pending action proposals with TTL countdowns.
 */
router.get('/proposals', requirePermission(PERMISSIONS.AI_QUERY), getActiveProposals);

/**
 * @openapi
 * /api/v1/assistant/proposals/{id}/confirm:
 *   post:
 *     summary: Human Confirmation & ACID Financial Mutation Execution
 *     description: Validates 5-minute TTL, checks PBAC permissions, verifies SHA-256 payload integrity, executes database mutation in an ACID transaction, and writes an immutable before/after audit log.
 *     tags:
 *       - AI Operational Copilot
 *     security:
 *       - BearerAuth: []
 *       - IdempotencyKeyHeader: []
 *       - CorrelationIdHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Proposal successfully confirmed and executed.
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       410:
 *         description: Proposal has expired (5-minute TTL elapsed).
 *       422:
 *         description: Payload hash integrity verification failed.
 */
router.post(
  '/proposals/:id/confirm',
  requirePermission(PERMISSIONS.AI_ACTION_CONFIRM),
  idempotencyMiddleware({ required: false }),
  confirmProposal
);

/**
 * @openapi
 * /api/v1/assistant/proposals/{id}/dismiss:
 *   post:
 *     summary: Dismiss Action Proposal
 *     description: Dismisses a pending action proposal without mutating financial databases.
 *     tags:
 *       - AI Operational Copilot
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
 *         description: Proposal dismissed.
 */
router.post('/proposals/:id/dismiss', requirePermission(PERMISSIONS.AI_ACTION_PROPOSE), dismissProposal);

// Legacy action endpoints for backwards compatibility
router.post(
  '/actions/confirm',
  requirePermission(PERMISSIONS.AI_ACTION_CONFIRM),
  idempotencyMiddleware({ required: false }),
  (req, res, next) => {
    req.params.id = req.body.proposalId || req.body.proposal_id;
    return confirmProposal(req, res, next);
  }
);

router.post(
  '/actions/dismiss',
  requirePermission(PERMISSIONS.AI_ACTION_PROPOSE),
  (req, res, next) => {
    req.params.id = req.body.proposalId || req.body.proposal_id;
    return dismissProposal(req, res, next);
  }
);

router.get('/wake/:recordType/:recordId', requirePermission(PERMISSIONS.AI_QUERY), wakeContext);

export default router;
