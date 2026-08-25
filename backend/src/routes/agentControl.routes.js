import { Router } from 'express';
import {
  getAgentStatus,
  getAgentRunHistory,
  getRunDetail,
  getRecentAgentActivity,
  triggerPipeline,
  getPipelineExecutions,
  getPipelineExecutionById,
  getQueueStatus
} from '../controllers/agentControl.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware.js';
import { agentRateLimiter } from '../middleware/rateLimit.middleware.js';

/**
 * Express Router: Agent Control Center & Multi-Agent Orchestrator Routes (Phase 6 OpenAPI Annotated)
 * Base Path: /api/v1/agents
 */
const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/agents/status:
 *   get:
 *     summary: Get Aggregate Status & Performance KPIs for All 6 Agents
 *     description: Returns runtime health, execution counts, success rates, average duration, and token usage for all 6 AI agents in a single optimized DB query.
 *     tags:
 *       - Multi-Agent Orchestrator
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Overview stats and agent telemetry array.
 */
router.get('/status', requirePermission(PERMISSIONS.AGENT_VIEW), getAgentStatus);

/**
 * @openapi
 * /api/v1/agents/queue/status:
 *   get:
 *     summary: Get Priority Queue Telemetry
 *     description: Returns active worker count, queued jobs depth, concurrency limits, and lifetime completed tasks.
 *     tags:
 *       - Multi-Agent Orchestrator
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: In-process queue depth and concurrency metrics.
 */
router.get('/queue/status', requirePermission(PERMISSIONS.AGENT_VIEW), getQueueStatus);

router.get('/activity', requirePermission(PERMISSIONS.AGENT_VIEW), getRecentAgentActivity);

/**
 * @openapi
 * /api/v1/agents/pipeline/run:
 *   post:
 *     summary: Trigger Multi-Agent Workflow Pipeline
 *     description: Enqueues a multi-agent orchestration workflow (`RECONCILIATION_AND_RISK`, `PORTFOLIO_AND_ESCALATION`, or `END_TO_END_COMPLIANCE`) with priority scheduling and step-by-step telemetry.
 *     tags:
 *       - Multi-Agent Orchestrator
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
 *               - pipeline_name
 *             properties:
 *               pipeline_name:
 *                 type: string
 *                 enum: [RECONCILIATION_AND_RISK, PORTFOLIO_AND_ESCALATION, END_TO_END_COMPLIANCE]
 *                 example: RECONCILIATION_AND_RISK
 *               case_id:
 *                 type: integer
 *                 example: 1
 *               priority:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *                 default: HIGH
 *                 example: HIGH
 *     responses:
 *       200:
 *         description: Pipeline workflow queued or executed with live step telemetry.
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/pipeline/run',
  requirePermission(PERMISSIONS.AGENT_RUN),
  agentRateLimiter,
  idempotencyMiddleware(),
  triggerPipeline
);

/**
 * @openapi
 * /api/v1/agents/pipeline/executions:
 *   get:
 *     summary: List Historical Pipeline Executions
 *     description: Returns paginated historical multi-agent pipeline runs recorded in `pipeline_executions`.
 *     tags:
 *       - Multi-Agent Orchestrator
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated pipeline execution list.
 */
router.get('/pipeline/executions', requirePermission(PERMISSIONS.AGENT_VIEW), getPipelineExecutions);

/**
 * @openapi
 * /api/v1/agents/pipeline/executions/{id}:
 *   get:
 *     summary: Inspect Full Pipeline Step Tree
 *     description: Retrieves the parent pipeline execution and all child `pipeline_steps` with input/output payloads, duration, and token breakdown.
 *     tags:
 *       - Multi-Agent Orchestrator
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
 *         description: Complete pipeline execution and nested step tree.
 */
router.get('/pipeline/executions/:id', requirePermission(PERMISSIONS.AGENT_VIEW), getPipelineExecutionById);

router.get('/:agentId/runs', requirePermission(PERMISSIONS.AGENT_VIEW), getAgentRunHistory);
router.get('/:agentId/runs/:runId', requirePermission(PERMISSIONS.AGENT_VIEW), getRunDetail);

export default router;
