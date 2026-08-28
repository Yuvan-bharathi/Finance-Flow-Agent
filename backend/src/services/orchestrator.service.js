import { agentQueue, PRIORITY } from './agentQueue.service.js';
import {
  insertPipelineExecution,
  insertPipelineStep,
  startPipelineStep,
  completePipelineStep,
  finalizePipelineExecution,
  findPipelineWithSteps
} from '../models/pipeline.model.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import { runRiskAssessmentAgent } from '../agents/riskAgent.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';
import { runDocumentIntelligenceAgent } from '../agents/documentAgent.js';
import { runPortfolioAnalyticsAgent } from '../agents/portfolioAgent.js';
import { runNotificationAgent } from '../agents/notificationAgent.js';
import { runAnomalyAgentStageB } from '../agents/anomalyAgent.js';
import { emitSocketEvent } from '../config/socket.js';
import { logger } from '../utils/logger.js';
import { findCaseById } from '../models/reconciliationCase.model.js';
import pool from '../config/db.js';

/**
 * Service: Multi-Agent Pipeline Orchestrator (Phase 5)
 * Purpose: Defines, validates, sequences, and executes multi-agent workflows
 *          with step-by-step telemetry, failure isolation, and real-time WebSocket events.
 * 
 * Data flow:
 * Trigger ➔ orchestrator.runPipeline() ➔ agentQueue.addJob() ➔ Step Execution Loop ➔ MySQL + WebSockets ➔ Client UI
 */

export const PIPELINE_WORKFLOWS = {
  RECONCILIATION_AND_RISK: 'RECONCILIATION_AND_RISK',
  PORTFOLIO_AND_ESCALATION: 'PORTFOLIO_AND_ESCALATION',
  END_TO_END_COMPLIANCE: 'END_TO_END_COMPLIANCE'
};

/**
 * Executes a defined multi-agent orchestration pipeline.
 * 
 * Called by:
 * - agentControl.controller.js (runPipelineWorkflow)
 * - payment.service.js (optional automated trigger)
 * 
 * @param {Object} options
 * @param {string} options.workflow - One of PIPELINE_WORKFLOWS
 * @param {Object} options.contextData - Payload context (e.g. `{ caseId: 20, companyId: 5 }`)
 * @param {number} [options.userId] - Requesting user ID
 * @param {number} [options.priority] - PRIORITY band (default PRIORITY.CRITICAL for UI)
 * @param {string} [options.triggerSource] - 'manual_ui' | 'event_webhook' | 'scheduled_cron'
 * @param {string} [options.correlationId] - Distributed tracing correlation ID
 * @returns {Promise<Object>} Completed pipeline execution object with step results
 */
export const runPipelineWorkflow = async ({
  workflow = PIPELINE_WORKFLOWS.RECONCILIATION_AND_RISK,
  contextData = {},
  userId = null,
  priority = PRIORITY.CRITICAL,
  triggerSource = 'manual_ui',
  correlationId = null
}) => {
  logger.info(`[Orchestrator] Initializing multi-agent pipeline: ${workflow}`, {
    workflow,
    contextData,
    correlationId,
    userId
  });

  // 1. Create parent pipeline execution in MySQL
  const pipelineId = await insertPipelineExecution({
    pipeline_name: workflow,
    trigger_source: triggerSource,
    triggered_by: userId,
    context_data: contextData,
    correlation_id: correlationId
  });

  // 2. Define workflow steps based on pipeline type
  const plannedSteps = _getPlannedSteps(workflow, contextData);

  // 3. Pre-create all planned steps in MySQL
  const stepRecords = [];
  for (const step of plannedSteps) {
    const stepId = await insertPipelineStep({
      pipeline_id: pipelineId,
      step_index: step.step_index,
      agent_id: step.agent_id,
      agent_name: step.agent_name,
      input_payload: step.input_payload,
      status: 'pending'
    });
    stepRecords.push({ ...step, id: stepId });
  }

  // 4. Broadcast PIPELINE_STARTED over WebSocket
  emitSocketEvent('PIPELINE_STARTED', {
    pipeline_id: pipelineId,
    pipeline_name: workflow,
    correlation_id: correlationId,
    steps: stepRecords.map(s => ({
      id: s.id,
      step_index: s.step_index,
      agent_name: s.agent_name,
      status: 'pending'
    }))
  });

  // 5. Enqueue execution through the priority concurrency queue
  const taskFunction = async () => {
    return await _executePipelineSteps(pipelineId, workflow, stepRecords, contextData, userId, correlationId);
  };

  return await agentQueue.addJob({
    name: `Pipeline-${workflow}#${pipelineId}`,
    priority,
    task: taskFunction,
    correlationId,
    metadata: { pipelineId, workflow, contextData }
  });
};

/**
 * Executes steps sequentially and conditionally.
 * @private
 */
const _executePipelineSteps = async (pipelineId, workflow, stepRecords, initialContext, userId, correlationId) => {
  const startTime = Date.now();
  let accumulatedTokens = 0;
  const runtimeContext = { ...initialContext };
  let pipelineFailed = false;
  let finalErrorMessage = null;

  for (const step of stepRecords) {
    const stepStartTime = Date.now();

    // Check if previous critical step failed and subsequent step cannot run
    if (pipelineFailed) {
      await completePipelineStep(step.id, {
        status: 'skipped',
        error_message: 'Skipped due to upstream pipeline failure'
      });
      emitSocketEvent('PIPELINE_STEP_COMPLETED', {
        pipeline_id: pipelineId,
        step_id: step.id,
        step_index: step.step_index,
        agent_name: step.agent_name,
        status: 'skipped'
      });
      continue;
    }

    // Step Precondition: Check if Agent 3 (Collection) is eligible to run
    if (step.agent_name === 'AutomatedCollectionFollowUpAgent') {
      const companyId = runtimeContext.companyId || runtimeContext.company_id || runtimeContext.recommended_company_id || 1;
      const eligibility = await _checkCollectionFollowUpEligibility(companyId, runtimeContext);

      if (!eligibility.eligible) {
        logger.info(`[Orchestrator] Skipping Step ${step.step_index} (${step.agent_name}): ${eligibility.reason}`, {
          pipelineId,
          stepIndex: step.step_index,
          companyId
        });

        const skippedPayload = {
          status: 'SKIPPED',
          skipped: true,
          reason: eligibility.reason,
          company_id: companyId,
          company_name: eligibility.company_name,
          total_overdue_amount: 0,
          days_overdue: 0,
          urgency_level: 'NONE'
        };

        await completePipelineStep(step.id, {
          status: 'skipped',
          output_payload: skippedPayload,
          tokens_used: 0,
          duration_ms: 0
        });

        emitSocketEvent('PIPELINE_STEP_COMPLETED', {
          pipeline_id: pipelineId,
          step_id: step.id,
          step_index: step.step_index,
          agent_name: step.agent_name,
          status: 'skipped',
          duration_ms: 0,
          tokens_used: 0,
          output_payload: skippedPayload
        });

        Object.assign(runtimeContext, { collectionFollowUp: skippedPayload });
        continue;
      }
    }

    try {
      logger.info(`[Orchestrator] Executing Step ${step.step_index}: ${step.agent_name}`, {
        pipelineId,
        stepIndex: step.step_index,
        correlationId
      });

      // Update step status to running
      await startPipelineStep(step.id, runtimeContext);
      emitSocketEvent('PIPELINE_STEP_STARTED', {
        pipeline_id: pipelineId,
        step_id: step.id,
        step_index: step.step_index,
        agent_name: step.agent_name,
        status: 'running'
      });

      // Execute specific agent logic
      const stepResult = await _dispatchAgentStep(step.agent_name, runtimeContext, userId, correlationId);

      const stepDurationMs = Date.now() - stepStartTime;
      const tokensUsed = stepResult?.tokens_used || stepResult?.total_tokens || 350; // Fallback token estimation
      accumulatedTokens += tokensUsed;

      // Merge step outputs into runtimeContext for downstream steps
      Object.assign(runtimeContext, stepResult);

      // Complete step record in database
      await completePipelineStep(step.id, {
        status: 'completed',
        output_payload: stepResult,
        tokens_used: tokensUsed,
        duration_ms: stepDurationMs
      });

      emitSocketEvent('PIPELINE_STEP_COMPLETED', {
        pipeline_id: pipelineId,
        step_id: step.id,
        step_index: step.step_index,
        agent_name: step.agent_name,
        status: 'completed',
        duration_ms: stepDurationMs,
        tokens_used: tokensUsed,
        output_payload: stepResult
      });

    } catch (stepError) {
      const stepDurationMs = Date.now() - stepStartTime;
      logger.error(`[Orchestrator] Step ${step.step_index} (${step.agent_name}) failed: ${stepError.message}`, {
        pipelineId,
        stepIndex: step.step_index,
        correlationId,
        error: stepError.message
      });

      await completePipelineStep(step.id, {
        status: 'failed',
        error_message: stepError.message,
        duration_ms: stepDurationMs
      });

      emitSocketEvent('PIPELINE_STEP_FAILED', {
        pipeline_id: pipelineId,
        step_id: step.id,
        step_index: step.step_index,
        agent_name: step.agent_name,
        status: 'failed',
        error_message: stepError.message,
        duration_ms: stepDurationMs
      });

      // Determine if step failure is fatal for this workflow
      pipelineFailed = true;
      finalErrorMessage = `Failed at Step ${step.step_index} (${step.agent_name}): ${stepError.message}`;
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const finalStatus = pipelineFailed ? 'failed' : 'completed';

  // Finalize master execution in MySQL
  await finalizePipelineExecution(pipelineId, {
    status: finalStatus,
    total_tokens: accumulatedTokens,
    duration_ms: totalDurationMs,
    error_message: finalErrorMessage
  });

  emitSocketEvent('PIPELINE_COMPLETED', {
    pipeline_id: pipelineId,
    status: finalStatus,
    duration_ms: totalDurationMs,
    total_tokens: accumulatedTokens,
    error_message: finalErrorMessage
  });

  return await findPipelineWithSteps(pipelineId);
};

/**
 * Dispatches individual agent function by name.
 * @private
 */
const _dispatchAgentStep = async (agentName, context, userId, correlationId) => {
  switch (agentName) {
    case 'PaymentReconciliationAgent': {
      const caseId = context.caseId || context.case_id || 1;
      return await runReconciliationAgent(caseId, userId, 'auto');
    }

    case 'AnomalyDetectionAgent': {
      let paymentId = context.paymentId || context.payment_id;
      const caseId = context.caseId || context.case_id;
      if (!paymentId && caseId) {
        const c = await findCaseById(caseId);
        paymentId = c?.payment_id;
      }
      if (!paymentId) {
        return { skipped: true, reason: 'No payment ID available for anomaly inspection.' };
      }
      return await runAnomalyAgentStageB(paymentId, caseId, userId);
    }

    case 'RepaymentRiskAssessmentAgent': {
      // Resolve company ID from context or lookup from case
      let companyId = context.companyId || context.company_id || context.recommended_company_id;
      if (!companyId && (context.caseId || context.case_id)) {
        const c = await findCaseById(context.caseId || context.case_id);
        companyId = c?.company_id || 1;
      }
      return await runRiskAssessmentAgent(companyId || 1, userId);
    }

    case 'AutomatedCollectionFollowUpAgent': {
      let companyId = context.companyId || context.company_id || context.recommended_company_id || 1;
      return await runCollectionAgent(companyId, userId);
    }

    case 'DocumentIntelligenceAgent': {
      const docId = context.documentId || context.document_id || 1;
      return await runDocumentIntelligenceAgent(docId, userId);
    }

    case 'PortfolioAnalyticsAgent': {
      return await runPortfolioAnalyticsAgent(userId);
    }

    case 'NotificationEscalationAgent': {
      return await runNotificationAgent(userId);
    }

    default:
      throw new Error(`Unknown agent name in pipeline step: ${agentName}`);
  }
};

/**
 * Helper to build planned step definitions.
 * @private
 */
const _getPlannedSteps = (workflow, context) => {
  switch (workflow) {
    case PIPELINE_WORKFLOWS.RECONCILIATION_AND_RISK:
      return [
        { step_index: 1, agent_id: 1, agent_name: 'PaymentReconciliationAgent', input_payload: { caseId: context.caseId } },
        { step_index: 2, agent_id: 7, agent_name: 'AnomalyDetectionAgent', input_payload: { caseId: context.caseId, paymentId: context.paymentId } },
        { step_index: 3, agent_id: 2, agent_name: 'RepaymentRiskAssessmentAgent', input_payload: { companyId: context.companyId } },
        { step_index: 4, agent_id: 3, agent_name: 'AutomatedCollectionFollowUpAgent', input_payload: { companyId: context.companyId } }
      ];

    case PIPELINE_WORKFLOWS.PORTFOLIO_AND_ESCALATION:
      return [
        { step_index: 1, agent_id: 5, agent_name: 'PortfolioAnalyticsAgent', input_payload: {} },
        { step_index: 2, agent_id: 6, agent_name: 'NotificationEscalationAgent', input_payload: {} }
      ];

    case PIPELINE_WORKFLOWS.END_TO_END_COMPLIANCE:
      return [
        { step_index: 1, agent_id: 1, agent_name: 'PaymentReconciliationAgent', input_payload: { caseId: context.caseId } },
        { step_index: 2, agent_id: 7, agent_name: 'AnomalyDetectionAgent', input_payload: { caseId: context.caseId, paymentId: context.paymentId } },
        { step_index: 3, agent_id: 2, agent_name: 'RepaymentRiskAssessmentAgent', input_payload: { companyId: context.companyId } },
        { step_index: 4, agent_id: 3, agent_name: 'AutomatedCollectionFollowUpAgent', input_payload: { companyId: context.companyId } },
        { step_index: 5, agent_id: 4, agent_name: 'DocumentIntelligenceAgent', input_payload: { documentId: context.documentId } },
        { step_index: 6, agent_id: 5, agent_name: 'PortfolioAnalyticsAgent', input_payload: {} },
        { step_index: 7, agent_id: 6, agent_name: 'NotificationEscalationAgent', input_payload: {} }
      ];

    default:
      return [
        { step_index: 1, agent_id: 1, agent_name: 'PaymentReconciliationAgent', input_payload: context }
      ];
  }
};

/**
 * Evaluates whether a borrower is eligible for Automated Collection Follow-Up.
 * Collection notices are only permitted for borrowers with actual pending or overdue debt obligations.
 *
 * @private
 * @param {number} companyId - Borrower company ID
 * @param {Object} runtimeContext - Pipeline execution context
 * @returns {Promise<{ eligible: boolean, reason: string, company_name: string, total_overdue: number }>}
 */
const _checkCollectionFollowUpEligibility = async (companyId, runtimeContext) => {
  try {
    const [compRows] = await pool.query(`SELECT id, company_name FROM companies WHERE id = ?`, [companyId]);
    const companyName = compRows[0]?.company_name || `Company #${companyId}`;

    // Query active overdue or unpaid repayment schedules
    const [overdueSchedules] = await pool.query(`
      SELECT rs.id, rs.due_date, rs.scheduled_amount, rs.paid_amount, rs.status
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      WHERE l.company_id = ?
        AND (
          LOWER(rs.status) = 'overdue'
          OR (rs.due_date < CURRENT_DATE AND (rs.paid_amount IS NULL OR rs.paid_amount < rs.scheduled_amount) AND LOWER(rs.status) != 'paid')
        )
    `, [companyId]);

    // Compute remaining unpaid balance
    let totalOverdue = 0;
    for (const item of overdueSchedules) {
      const remaining = parseFloat(item.scheduled_amount) - parseFloat(item.paid_amount || 0);
      if (remaining > 0) totalOverdue += remaining;
    }

    if (overdueSchedules.length === 0 || totalOverdue <= 0) {
      return {
        eligible: false,
        reason: `Borrower '${companyName}' has zero pending or overdue payments. Account is in good standing (₹0.00).`,
        company_name: companyName,
        total_overdue: 0
      };
    }

    return {
      eligible: true,
      reason: `Found ${overdueSchedules.length} pending/overdue installment(s) totaling ₹${totalOverdue.toFixed(2)}.`,
      company_name: companyName,
      total_overdue: totalOverdue
    };
  } catch (err) {
    logger.warn(`[Orchestrator] Error checking collection eligibility: ${err.message}`);
    return {
      eligible: true,
      reason: 'Eligibility verification bypassed on error.',
      company_name: `Company #${companyId}`,
      total_overdue: 0
    };
  }
};
