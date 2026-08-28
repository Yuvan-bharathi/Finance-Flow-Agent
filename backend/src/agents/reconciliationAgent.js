import pool from '../config/db.js';
import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { toolDefinitions, executeTool } from '../tools/reconciliationTools.js';
import { RECONCILIATION_SYSTEM_PROMPT, createReconciliationUserPrompt } from '../prompts/reconciliation.prompt.js';
import { findCaseById } from '../models/reconciliationCase.model.js';
import { insertAIRecommendation } from '../models/aiRecommendation.model.js';
import { createAgentRun, updateAgentRun } from '../models/agentRun.model.js';
import { logStep } from '../models/agentExecutionLog.model.js';
import { runPreCheckEngine } from '../engine/preCheckEngine.js';
import { previewWaterfallAllocation } from '../services/settlement.service.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Agent: Payment Reconciliation Agent (Agent 1)
 * Purpose: Investigates raw bank payments using controlled database tools and Groq LLM tool calling.
 * Incorporates Deterministic Pre-Check Engine, Token Tracking, Run Lock & Two-Level Execution Logging.
 */

/**
 * Fallback Rule-Based Matching Engine (used when Groq API key is unavailable or encounters errors)
 */
const runFallbackRuleBasedMatching = async (payment, agentRunId = null) => {
  let matchedCompany = null;
  let matchedLoan = null;
  let matchedSchedule = null;
  let confidence = 50.0;
  let reasoningLines = ['[Engine: Fallback Rule-Based Search]'];

  const searchResults = await executeTool('searchCompany', { query: payment.sender_account || payment.sender_name || '' });
  if (searchResults && searchResults.length > 0) {
    matchedCompany = searchResults[0];
    confidence += 25.0;
    reasoningLines.push(`Found company match: '${matchedCompany.company_name}' (ID: ${matchedCompany.id}) via sender details.`);

    const activeLoans = await executeTool('getActiveLoans', { companyId: matchedCompany.id });
    if (activeLoans && activeLoans.length > 0) {
      matchedLoan = activeLoans[0];
      confidence += 15.0;
      reasoningLines.push(`Identified active loan facility: '${matchedLoan.loan_number}' (ID: ${matchedLoan.id}).`);

      const dueInstallments = await executeTool('getDueRepayments', { loanId: matchedLoan.id });
      if (dueInstallments && dueInstallments.length > 0) {
        matchedSchedule = dueInstallments[0];
        const waterfallPreview = await previewWaterfallAllocation(payment.amount, matchedLoan.id);
        if (waterfallPreview && waterfallPreview.allocations.length > 0) {
          confidence += 10.0;
          const instNums = waterfallPreview.allocations.map(a => `#${a.installment_number}`);
          reasoningLines.push(`Continuous waterfall algorithm will allocate ₹${parseFloat(payment.amount).toLocaleString('en-IN')} across ${waterfallPreview.allocations.length} open milestones (${instNums.join(', ')}).`);
          reasoningLines.push(`Projected remaining overdue balance after settlement: ₹${waterfallPreview.post_settlement_overdue_exposure.toLocaleString('en-IN')}.`);
        } else {
          reasoningLines.push(`Identified anchor installment #${matchedSchedule.installment_number} due on ${matchedSchedule.due_date}.`);
        }
      }
    }
  } else {
    reasoningLines.push(`No direct company match found for sender '${payment.sender_name}' / account '${payment.sender_account}'. Flagged for manual accountant investigation.`);
    confidence = 35.0;
  }

  return {
    recommended_company_id: matchedCompany ? matchedCompany.id : null,
    recommended_loan_id: matchedLoan ? matchedLoan.id : null,
    recommended_schedule_id: matchedSchedule ? matchedSchedule.id : null,
    confidence_score: Math.min(100.0, confidence),
    reasoning: reasoningLines.join('\n')
  };
};

/**
 * Runs the Payment Reconciliation Agent workflow for a given case ID.
 * 
 * @param {number} caseId - Primary key ID of reconciliation_cases.
 * @param {number|null} triggeredBy - User ID triggering the run.
 * @param {string} triggerType - 'manual' | 'bulk_manual' | 'system' | 'retry'
 * @param {number|null} existingRunId - Pre-created agent_runs ID
 * @returns {Promise<Object>} Object containing generated recommendation and updated case details.
 */
export const runReconciliationAgent = async (caseId, triggeredBy = null, triggerType = 'manual', existingRunId = null) => {
  const startTime = Date.now();
  const agentId = 'agent_1_reconciliation';
  const agentName = 'Payment Reconciliation Agent';

  // 1. Retrieve case details & Run Lock Check
  const caseDetails = await findCaseById(caseId);
  if (!caseDetails) {
    const error = new Error(`Reconciliation case with ID ${caseId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Run Lock check
  if (caseDetails.status === 'ai_processing' || caseDetails.status === 'ai_queued') {
    const error = new Error(`Case #${caseId} is currently being processed by an agent. Run lock active.`);
    error.statusCode = 409;
    throw error;
  }

  // Update status to ai_queued → ai_processing
  await pool.execute(`UPDATE reconciliation_cases SET status = 'ai_processing' WHERE id = ?;`, [caseId]);

  emitSocketEvent('RECONCILIATION_STARTED', {
    case_id: caseId,
    status: 'ai_processing'
  });

  // Create agent run record
  const runId = existingRunId || await createAgentRun({
    agent_id: agentId,
    agent_name: agentName,
    case_id: caseId,
    triggered_by: triggeredBy,
    trigger_type: triggerType
  });

  const payment = {
    id: caseDetails.payment_id,
    transaction_id: caseDetails.transaction_id,
    amount: caseDetails.amount,
    payment_date: caseDetails.payment_date,
    sender_name: caseDetails.sender_name,
    sender_account: caseDetails.sender_account,
    reference: caseDetails.reference,
    source: caseDetails.source || 'api'
  };

  try {
    // 2. Run Deterministic Pre-Check Engine
    const preCheckResult = await runPreCheckEngine(payment, runId);

    let finalRecommendation = null;
    let groqCalled = false;
    let toolsCalled = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    // 3. Decision Point: Clear Match vs Ambiguous
    if (preCheckResult.result === 'clear_match') {
      console.log(`[Reconciliation Agent] Case #${caseId}: Pre-Check Engine CLEAR_MATCH (Score: ${preCheckResult.score}). Skipping Groq call.`);
      
      finalRecommendation = {
        recommended_company_id: preCheckResult.recommendedCompany ? preCheckResult.recommendedCompany.id : null,
        recommended_loan_id: preCheckResult.recommendedLoan ? preCheckResult.recommendedLoan.id : null,
        recommended_schedule_id: preCheckResult.recommendedSchedule ? preCheckResult.recommendedSchedule.id : null,
        confidence_score: parseFloat(preCheckResult.score).toFixed(2),
        reasoning: preCheckResult.reasons.join('\n')
      };

      await logStep({
        agent_run_id: runId,
        agent_id: agentId,
        step_type: 'DECISION',
        step_name: 'GROQ_SKIPPED_CLEAR_MATCH',
        status: 'skipped',
        input_data: { score: preCheckResult.score, threshold: 85 },
        output_data: { reason: 'Pre-check threshold met. Zero LLM tokens consumed.' }
      });

    } else {
      // Ambiguous / Complex case -> Call Groq LLM tool calling loop
      console.log(`[Reconciliation Agent] Case #${caseId}: Pre-Check Score ${preCheckResult.score}. Triggering Groq Agent 1 tool loop...`);
      groqCalled = true;

      await logStep({
        agent_run_id: runId,
        agent_id: agentId,
        step_type: 'GROQ',
        step_name: 'GROQ_REQUEST_STARTED',
        status: 'started',
        input_data: { model: GROQ_MODEL, payment_id: payment.id }
      });

      const messages = [
        { role: 'system', content: RECONCILIATION_SYSTEM_PROMPT },
        { role: 'user', content: createReconciliationUserPrompt(payment) }
      ];

      let loopCounter = 0;
      const maxLoops = 5;

      while (loopCounter < maxLoops) {
        loopCounter++;

        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages,
          tools: toolDefinitions,
          temperature: 0.1
        });

        // Track token usage
        if (completion.usage) {
          promptTokens += completion.usage.prompt_tokens || 0;
          completionTokens += completion.usage.completion_tokens || 0;
          totalTokens += completion.usage.total_tokens || 0;
        }

        const responseMessage = completion.choices[0].message;
        messages.push(responseMessage);

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          for (const toolCall of responseMessage.tool_calls) {
            const toolName = toolCall.function.name;
            let toolArgs = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments || '{}');
            } catch (e) {
              toolArgs = {};
            }

            if (toolArgs.query !== undefined) toolArgs.query = String(toolArgs.query);
            if (toolArgs.companyId !== undefined) toolArgs.companyId = parseInt(toolArgs.companyId, 10);
            if (toolArgs.loanId !== undefined) toolArgs.loanId = parseInt(toolArgs.loanId, 10);
            if (toolArgs.transactionId !== undefined) toolArgs.transactionId = String(toolArgs.transactionId);
            
            if (!toolsCalled.includes(toolName)) toolsCalled.push(toolName);

            const toolStart = Date.now();
            const toolResult = await executeTool(toolName, toolArgs);

            await logStep({
              agent_run_id: runId,
              agent_id: agentId,
              step_type: 'TOOL_CALL',
              step_name: toolName,
              status: 'completed',
              input_data: toolArgs,
              output_data: toolResult,
              duration_ms: Date.now() - toolStart
            });

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          }
        } else {
          // Final LLM answer
          const contentText = responseMessage.content || '';
          try {
            const jsonMatch = contentText.match(/\{[\s\S]*\}/);
            finalRecommendation = JSON.parse(jsonMatch ? jsonMatch[0] : contentText);
          } catch (parseError) {
            console.warn('[Reconciliation Agent] JSON parse failed, using rule-based recommendation.');
            finalRecommendation = await runFallbackRuleBasedMatching(payment, runId);
          }
          break;
        }
      }

      if (!finalRecommendation) {
        finalRecommendation = await runFallbackRuleBasedMatching(payment, runId);
      }

      await logStep({
        agent_run_id: runId,
        agent_id: agentId,
        step_type: 'GROQ',
        step_name: 'GROQ_RESPONSE_RECEIVED',
        status: 'completed',
        output_data: { confidence_score: finalRecommendation.confidence_score, tokens: totalTokens }
      });
    }

    // 4. Save Recommendation to ai_recommendations table
    const recId = await insertAIRecommendation({
      reconciliation_case_id: caseId,
      agent_name: 'PaymentReconciliationAgent',
      recommended_company_id: finalRecommendation.recommended_company_id,
      recommended_loan_id: finalRecommendation.recommended_loan_id,
      recommended_schedule_id: finalRecommendation.recommended_schedule_id,
      confidence_score: parseFloat(finalRecommendation.confidence_score).toFixed(2),
      reasoning: finalRecommendation.reasoning,
      status: 'pending'
    });

    // 5. Update reconciliation_cases status to pending_review
    await pool.execute(
      `UPDATE reconciliation_cases SET status = 'pending_review' WHERE id = ?;`,
      [caseId]
    );

    const durationMs = Date.now() - startTime;

    // 6. Update agent_runs record to completed
    await updateAgentRun(runId, {
      status: 'completed',
      pre_check_result: preCheckResult.result,
      groq_called: groqCalled,
      duration_ms: durationMs,
      model: groqCalled ? GROQ_MODEL : 'precheck-engine',
      input_tokens: promptTokens,
      output_tokens: completionTokens,
      total_tokens: totalTokens,
      tools_called: toolsCalled,
      confidence_score: parseFloat(finalRecommendation.confidence_score),
      result_summary: `Recommended Match (Confidence: ${finalRecommendation.confidence_score}%)`
    });

    await logStep({
      agent_run_id: runId,
      agent_id: agentId,
      step_type: 'RECOMMENDATION',
      step_name: 'RECOMMENDATION_CREATED',
      status: 'completed',
      output_data: { recommendation_id: recId, case_status: 'pending_review' },
      duration_ms: durationMs
    });

    const updatedCase = await findCaseById(caseId);

    // Emit real-time WebSocket completion event
    emitSocketEvent('RECONCILIATION_COMPLETED', {
      case_id: caseId,
      recommendation: finalRecommendation,
      precheck: preCheckResult,
      groq_called: groqCalled,
      tokens: { total: totalTokens },
      case: updatedCase
    });

    return {
      run_id: runId,
      recommendation_id: recId,
      case: updatedCase,
      recommendation: finalRecommendation,
      precheck: preCheckResult,
      groq_called: groqCalled,
      tokens: { input: promptTokens, output: completionTokens, total: totalTokens }
    };

  } catch (error) {
    console.error(`[Reconciliation Agent Error] Case #${caseId} failed:`, error.message);

    // Revert case status to open
    try {
      await pool.execute(`UPDATE reconciliation_cases SET status = 'open' WHERE id = ?;`, [caseId]);
    } catch (revertErr) {
      console.error('Failed to revert case status:', revertErr.message);
    }

    if (runId) {
      try {
        await updateAgentRun(runId, {
          status: 'failed',
          duration_ms: Date.now() - startTime,
          error_message: error.message
        });
      } catch (runErr) {
        console.error('Failed to update agent run:', runErr.message);
      }
    }

    throw error;
  }
};
