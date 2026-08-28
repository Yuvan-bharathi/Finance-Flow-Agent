import {
  getRunsByAgent,
  getRecentActivity,
  getAgentStats,
  getAllAgentsOverview,
  getAllAgentStatsGrouped
} from '../models/agentRun.model.js';
import { getLogsByRunId } from '../models/agentExecutionLog.model.js';
import {
  findPipelineWithSteps,
  findHistoricalPipelines
} from '../models/pipeline.model.js';
import { findOpenCases } from '../models/reconciliationCase.model.js';
import { runPipelineWorkflow, PIPELINE_WORKFLOWS } from '../services/orchestrator.service.js';
import { agentQueue, PRIORITY } from '../services/agentQueue.service.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/apiResponse.js';
import { parsePagination, buildPaginatedResponse } from '../utils/paginationHelper.js';
import pool from '../config/db.js';

/**
 * Controller: Agent Control Center & Multi-Agent Orchestrator Controller
 * Purpose: Provides observability endpoints for agent stat cards, run history,
 *          multi-agent workflow triggers, pipeline step tracing, and live queue telemetry.
 */

/**
 * Retrieves aggregate statistics for all 6 agents in a single optimized DB round-trip.
 */
export const getAgentStatus = async (req, res, next) => {
  try {
    const [overview, statsMap] = await Promise.all([
      getAllAgentsOverview(),
      getAllAgentStatsGrouped()
    ]);

    const defaultMetric = { total_runs: 0, successful_runs: 0, failed_runs: 0, success_rate: 100, avg_confidence: 0, avg_duration_ms: 320, total_tokens: 0 };
    const agent1Stats = statsMap['agent_1_reconciliation'] || defaultMetric;
    const agent7Stats = statsMap['agent_7_anomaly'] || defaultMetric;
    const agent2Stats = statsMap['agent_2_risk'] || defaultMetric;
    const agent3Stats = statsMap['agent_3_collection'] || defaultMetric;
    const agent4Stats = statsMap['agent_4_document'] || defaultMetric;
    const agent5Stats = statsMap['agent_5_portfolio'] || defaultMetric;
    const agent6Stats = statsMap['agent_6_notification'] || defaultMetric;

    const agents = [
      {
        id: 'agent_1_reconciliation',
        name: 'Payment Reconciliation Agent',
        status: 'READY',
        is_active: true,
        metrics: agent1Stats
      },
      {
        id: 'agent_7_anomaly',
        name: 'Anomaly Detection Agent',
        status: 'READY',
        is_active: true,
        metrics: agent7Stats
      },
      {
        id: 'agent_2_risk',
        name: 'Repayment Risk Assessment Agent',
        status: 'READY',
        is_active: true,
        metrics: agent2Stats
      },
      {
        id: 'agent_3_collection',
        name: 'Automated Collection Follow-Up Agent',
        status: 'READY',
        is_active: true,
        metrics: agent3Stats
      },
      {
        id: 'agent_4_document',
        name: 'Document Intelligence Agent',
        status: 'READY',
        is_active: true,
        metrics: agent4Stats
      },
      {
        id: 'agent_5_portfolio',
        name: 'Portfolio Analytics Agent',
        status: 'READY',
        is_active: true,
        metrics: agent5Stats
      },
      {
        id: 'agent_6_notification',
        name: 'Notification & Escalation Agent',
        status: 'READY',
        is_active: true,
        metrics: agent6Stats
      }
    ];

    return sendSuccessResponse(res, 200, 'Agent status retrieved successfully', {
      overview,
      agents,
      queue: agentQueue.getStatus()
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves run history for a given agent.
 */
export const getAgentRunHistory = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const runs = await getRunsByAgent(agentId, limit);
    return sendSuccessResponse(res, 200, `Run history retrieved for ${agentId}`, runs);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves full details and execution step logs for a specific agent run.
 */
export const getRunDetail = async (req, res, next) => {
  try {
    const runId = parseInt(req.params.runId, 10);
    const logs = await getLogsByRunId(runId);
    return sendSuccessResponse(res, 200, 'Run execution logs retrieved', logs);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves recent agent activity feed across all agents.
 */
export const getRecentAgentActivity = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const activity = await getRecentActivity(limit);
    return sendSuccessResponse(res, 200, 'Recent agent activity retrieved', activity);
  } catch (error) {
    return next(error);
  }
};

/**
 * Triggers a single agent manually by ID.
 * POST /api/v1/agents/:agentId/trigger (also mapped to /api/agents/:agentId/trigger)
 */
export const triggerSingleAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const userId = req.user ? req.user.id : null;

    let result;
    switch (agentId) {
      case 'agent_1_reconciliation':
      case '1': {
        const { analyzeAllPendingService } = await import('../services/reconciliation.service.js');
        result = await analyzeAllPendingService(userId);
        break;
      }
      case 'agent_7_anomaly':
      case '7': {
        const [recentPayments] = await pool.query(
          `SELECT p.id, rc.id AS case_id FROM payments p
           LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
           ORDER BY p.id DESC LIMIT 5`
        );
        const { runAnomalyAgentStageB } = await import('../agents/anomalyAgent.js');
        const anomalyResults = [];
        for (const p of recentPayments) {
          const resB = await runAnomalyAgentStageB(p.id, p.case_id, userId).catch(() => null);
          if (resB) anomalyResults.push(resB);
        }
        result = {
          scanned: recentPayments.length,
          anomalies_evaluated: anomalyResults.length,
          results: anomalyResults
        };
        break;
      }
      case 'agent_2_risk':
      case '2': {
        const { runRiskAssessmentAgent } = await import('../agents/riskAgent.js');
        const [comps] = await pool.query(`SELECT id FROM companies LIMIT 1`);
        result = await runRiskAssessmentAgent(comps[0]?.id || 1, userId);
        break;
      }
      case 'agent_3_collection':
      case '3': {
        const { runCollectionAgent } = await import('../agents/collectionAgent.js');
        const [comps] = await pool.query(`SELECT id FROM companies LIMIT 1`);
        result = await runCollectionAgent(comps[0]?.id || 1, userId);
        break;
      }
      case 'agent_4_document':
      case '4': {
        const { runDocumentIntelligenceAgent } = await import('../agents/documentAgent.js');
        result = await runDocumentIntelligenceAgent(1, userId);
        break;
      }
      case 'agent_5_portfolio':
      case '5': {
        const { triggerPortfolioAnalysisService } = await import('../services/portfolio.service.js');
        result = await triggerPortfolioAnalysisService(userId);
        break;
      }
      case 'agent_6_notification':
      case '6': {
        const { triggerEscalationScanService } = await import('../services/notification.service.js');
        result = await triggerEscalationScanService(userId);
        break;
      }
      default:
        return sendErrorResponse(res, 400, `Unknown agent ID: ${agentId}`);
    }

    return sendSuccessResponse(res, 200, `Agent ${agentId} executed successfully`, result);
  } catch (error) {
    return next(error);
  }
};

// =============================================================================
// Phase 5 Multi-Agent Pipeline Endpoints
// =============================================================================

/**
 * Triggers a multi-agent orchestration pipeline.
 * POST /api/v1/agents/pipeline/run
 */
export const triggerPipeline = async (req, res, next) => {
  try {
    const {
      workflow = PIPELINE_WORKFLOWS.RECONCILIATION_AND_RISK,
      contextData = {},
      priority = PRIORITY.CRITICAL
    } = req.body;

    const userId = req.user?.id || null;
    const correlationId = req.correlationId || null;

    const result = await runPipelineWorkflow({
      workflow,
      contextData,
      userId,
      priority,
      triggerSource: 'manual_ui',
      correlationId
    });

    return sendSuccessResponse(res, 200, `Pipeline workflow '${workflow}' executed successfully`, result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Lists historical pipeline executions with pagination.
 * GET /api/v1/agents/pipeline/executions
 */
export const getPipelineExecutions = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const status = req.query.status || null;

    const { data, total } = await findHistoricalPipelines({ page, limit, status });
    const paginated = buildPaginatedResponse(data, total, page, limit);

    return sendSuccessResponse(res, 200, 'Pipeline executions retrieved successfully', paginated);
  } catch (error) {
    return next(error);
  }
};

/**
 * Retrieves a single pipeline execution along with all ordered child steps.
 * GET /api/v1/agents/pipeline/executions/:id
 */
export const getPipelineExecutionById = async (req, res, next) => {
  try {
    const pipelineId = parseInt(req.params.id, 10);
    const pipeline = await findPipelineWithSteps(pipelineId);

    if (!pipeline) {
      return sendErrorResponse(res, 404, `Pipeline execution #${pipelineId} not found.`);
    }

    return sendSuccessResponse(res, 200, `Pipeline #${pipelineId} details retrieved`, pipeline);
  } catch (error) {
    return next(error);
  }
};

/**
 * Returns live status and depth of the agent priority queue.
 * GET /api/v1/agents/queue/status
 */
export const getQueueStatus = async (req, res, next) => {
  try {
    const status = agentQueue.getStatus();
    return sendSuccessResponse(res, 200, 'Agent queue status retrieved', status);
  } catch (error) {
    return next(error);
  }
};

/**
 * Returns available pending / open targets (cases/payments) that can be processed by pipelines.
 * GET /api/v1/agents/pipeline/pending-targets
 */
export const getPendingPipelineTargets = async (req, res, next) => {
  try {
    const openCases = await findOpenCases(50);
    return sendSuccessResponse(res, 200, 'Pending pipeline targets retrieved', openCases);
  } catch (error) {
    return next(error);
  }
};

/**
 * Executes a multi-agent pipeline across all pending cases or a specified list of case IDs in batch.
 * POST /api/v1/agents/pipeline/batch-run
 */
export const batchTriggerPipeline = async (req, res, next) => {
  try {
    const {
      workflow = PIPELINE_WORKFLOWS.RECONCILIATION_AND_RISK,
      caseIds = [],
      priority = PRIORITY.HIGH
    } = req.body;

    const userId = req.user?.id || 1;

    let targetCases = [];
    if (Array.isArray(caseIds) && caseIds.length > 0) {
      targetCases = caseIds.map(id => ({ id: Number(id) }));
    } else {
      targetCases = await findOpenCases(50);
    }

    if (targetCases.length === 0) {
      return sendSuccessResponse(res, 200, 'No pending cases available for batch execution.', { executed: 0, pipelines: [] });
    }

    const results = [];
    for (const target of targetCases) {
      const execResult = await runPipelineWorkflow({
        workflow,
        contextData: { caseId: target.id },
        userId,
        priority,
        triggerSource: 'batch_ui'
      });
      results.push({
        caseId: target.id,
        pipelineId: execResult.id,
        status: execResult.status,
        duration_ms: execResult.duration_ms
      });
    }

    return sendSuccessResponse(res, 200, `Batch execution completed for ${results.length} cases`, {
      executed: results.length,
      pipelines: results
    });
  } catch (error) {
    return next(error);
  }
};
