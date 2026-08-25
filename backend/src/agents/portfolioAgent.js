import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { PORTFOLIO_AGENT_SYSTEM_PROMPT } from '../prompts/portfolio.prompt.js';
import { portfolioToolsDeclaration, executePortfolioTool } from '../tools/portfolioTools.js';
import pool from '../config/db.js';
import { createAgentRun, updateAgentRun } from '../models/agentRun.model.js';
import { logStep } from '../models/agentExecutionLog.model.js';
import { acquireAgentLock, releaseAgentLock } from '../utils/agentLock.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Agent 5: Portfolio Analytics Agent
 *
 * Purpose:
 *   Computes portfolio health metrics using deterministic SQL calculations,
 *   then uses Groq LLM to interpret those metrics and produce a health grade,
 *   AI-written interpretation, and actionable recommendations.
 *
 * Design Decision (Hybrid Architecture):
 *   Step 1 — Deterministic SQL: MySQL calculates collection_efficiency, delinquency_rate,
 *             concentration_risk. Numbers are facts — SQL is reliable for arithmetic.
 *   Step 2 — Groq LLM: Interprets what those numbers mean for business risk.
 *             LLM gives us language, reasoning, and recommendations — not numbers.
 *   This approach is more defensible to a mentor than using LLM for everything.
 *
 * Run Lock:
 *   Lock key: 'agent_5_portfolio_GLOBAL' (portfolio is a global snapshot, not per-entity)
 *   Prevents duplicate concurrent portfolio runs from consuming Groq tokens.
 *
 * Execution Log Steps:
 *   RUN_STARTED → FETCH_PORTFOLIO_SUMMARY → FETCH_DELINQUENCY → FETCH_COLLECTION_EFFICIENCY
 *   → FETCH_CONCENTRATION → GROQ_ANALYSIS → SNAPSHOT_SAVED → RUN_COMPLETED
 *
 * Called by:
 *   - portfolio.controller.js → POST /api/portfolio/analyze
 *
 * @param {number|null} triggeredBy - users.id of the user who triggered this run (from JWT)
 * @returns {Promise<Object>} Portfolio health snapshot object
 */
export const runPortfolioAnalyticsAgent = async (triggeredBy = null) => {
  const agentId   = 'agent_5_portfolio';
  const agentName = 'Portfolio Analytics Agent';

  // ─── Step 1: Acquire Run Lock ─────────────────────────────────────────────
  // Lock key uses 'GLOBAL' because portfolio analysis covers all companies.
  // If a run is already in progress, we block the duplicate immediately.
  if (!acquireAgentLock(agentId, 'GLOBAL')) {
    console.warn('[Portfolio Agent] Execution lock active. Duplicate request blocked.');
    return {
      cached: true,
      message: 'Portfolio analysis already running. Please wait for the current run to complete.'
    };
  }

  const startTime = Date.now();
  let runId = null;

  try {
    // ─── Step 2: Create Agent Run Record ─────────────────────────────────────
    // This creates the parent record in agent_runs table.
    // All step logs reference this runId as agent_run_id.
    runId = await createAgentRun({
      agent_id: agentId,
      agent_name: agentName,
      triggered_by: triggeredBy,
      trigger_type: 'manual'
    });

    await logStep({
      agent_run_id: runId,
      agent_id: agentId,
      step_type: 'RUN_STARTED',
      step_name: 'PORTFOLIO_ANALYSIS_INITIATED',
      status: 'completed',
      input_data: { triggered_by: triggeredBy, timestamp: new Date().toISOString() }
    });

    // ─── Step 3: Deterministic SQL Calculations ───────────────────────────────
    // We call each tool function directly here (not via Groq) because we want
    // accurate numbers before sending them to the LLM for interpretation.

    // 3a. Portfolio Summary
    const portfolioSummary = await executePortfolioTool('getPortfolioSummary');
    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'TOOL_EXECUTED', step_name: 'FETCH_PORTFOLIO_SUMMARY',
      status: 'completed', output_data: portfolioSummary
    });

    // 3b. Delinquency Trends
    const delinquencyData = await executePortfolioTool('getDelinquencyTrends');
    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'TOOL_EXECUTED', step_name: 'FETCH_DELINQUENCY',
      status: 'completed', output_data: delinquencyData
    });

    // 3c. Collection Efficiency
    const collectionData = await executePortfolioTool('getCollectionEfficiency');
    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'TOOL_EXECUTED', step_name: 'FETCH_COLLECTION_EFFICIENCY',
      status: 'completed', output_data: collectionData
    });

    // 3d. Concentration Risk
    const concentrationData = await executePortfolioTool('getConcentrationRisk');
    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'TOOL_EXECUTED', step_name: 'FETCH_CONCENTRATION_RISK',
      status: 'completed', output_data: concentrationData
    });

    // ─── Step 4: Compute Delinquency Rate ────────────────────────────────────
    // Delinquency Rate = (overdue loans / total active loans) × 100
    // This is arithmetic — we do it here in Node.js, not in the LLM.
    const activeLoanCount     = parseInt(portfolioSummary.active_loan_count || 0);
    const overdueCount        = parseInt(delinquencyData.total_overdue_count || 0);
    const collectionEffPct    = parseFloat(collectionData.collection_efficiency_pct || 0);
    const delinquencyRatePct  = activeLoanCount > 0
      ? parseFloat(((overdueCount / activeLoanCount) * 100).toFixed(2))
      : 0;
    const topConcentrationPct = parseFloat(concentrationData.top_borrower_concentration_pct || 0);

    // ─── Step 5: Groq LLM Analysis ───────────────────────────────────────────
    // Now we give the LLM the computed numbers and ask it to:
    //   a) Assign a health_score (0-100) based on its system prompt thresholds
    //   b) Write an ai_interpretation paragraph
    //   c) List ai_recommendations
    //   d) Summarize its reasoning
    //
    // Data flow:
    //   Computed metrics → userPrompt → Groq API → JSON response → parsed result
    //
    // Groq API Reference: groq.chat.completions.create()
    // Model: GROQ_MODEL (from .env GROQ_MODEL, e.g. llama-3.3-70b-versatile)
    // Temperature: 0.1 — low temperature for consistent financial analysis

    let groqCalled    = false;
    let promptTokens  = 0;
    let completionTokens = 0;
    let totalTokens   = 0;

    // Default fallback result if Groq fails
    let analysisResult = {
      health_score: 50,
      health_grade: 'FAIR',
      ai_interpretation: 'Portfolio analytics computed via deterministic SQL engine. Groq interpretation unavailable.',
      ai_recommendations: ['Review overdue accounts', 'Monitor collection efficiency'],
      reasoning_summary: 'Fallback: Groq API unavailable. Metrics calculated deterministically.'
    };

    const userPrompt = `
Analyze the following FinanceFlow loan portfolio metrics and provide your assessment.

PORTFOLIO METRICS (computed by deterministic SQL engine):
- Total Portfolio Value: ₹${parseFloat(portfolioSummary.total_portfolio_value || 0).toLocaleString('en-IN')}
- Active Loan Count: ${activeLoanCount}
- Collection Efficiency: ${collectionEffPct}%
- Delinquency Rate: ${delinquencyRatePct}% (${overdueCount} overdue installments)
- Total Overdue Amount: ₹${parseFloat(delinquencyData.total_overdue_amount || 0).toLocaleString('en-IN')}
- Top Borrower Concentration: ${topConcentrationPct}% (${concentrationData.top_borrower_name})
- Overdue 1-30 days: ${delinquencyData.bucket_1_30_days || 0}
- Overdue 31-60 days: ${delinquencyData.bucket_31_60_days || 0}
- Overdue 60+ days: ${delinquencyData.bucket_60_plus_days || 0}

Output ONLY valid JSON:
{
  "health_score": <integer 0-100>,
  "health_grade": "<EXCELLENT|GOOD|FAIR|POOR|CRITICAL>",
  "ai_interpretation": "<2-3 sentence plain language interpretation>",
  "ai_recommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "reasoning_summary": "<1 paragraph analytical reasoning>"
}
`;

    try {
      // Send computed metrics to Groq for interpretation.
      // We pass portfolioToolsDeclaration so Groq can call tools if needed.
      const messages = [
        { role: 'system', content: PORTFOLIO_AGENT_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt }
      ];

      let response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        tools: portfolioToolsDeclaration,
        tool_choice: 'auto',
        temperature: 0.1
      });

      groqCalled = true;

      // ─── Groq Tool-Calling Loop ───────────────────────────────────────────
      // If Groq decides it needs more data before answering,
      // it will request a tool call. We execute the tool and feed the result back.
      while (response.choices[0]?.message?.tool_calls?.length > 0) {
        const toolCalls = response.choices[0].message.tool_calls;
        messages.push(response.choices[0].message);

        for (const tc of toolCalls) {
          const toolName = tc.function.name;
          const toolArgs = JSON.parse(tc.function.arguments || '{}');
          const toolResult = await executePortfolioTool(toolName, toolArgs);

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult)
          });
        }

        // Request Groq's final answer after receiving tool results
        response = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages,
          temperature: 0.1
        });
      }

      // Track token consumption for audit trail
      if (response.usage) {
        promptTokens     = response.usage.prompt_tokens     || 0;
        completionTokens = response.usage.completion_tokens || 0;
        totalTokens      = response.usage.total_tokens      || 0;
      }

      // Parse the JSON response from Groq's final message
      const content   = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysisResult = {
          health_score:       parseInt(parsed.health_score, 10)    || 50,
          health_grade:       parsed.health_grade                   || 'FAIR',
          ai_interpretation:  parsed.ai_interpretation              || '',
          ai_recommendations: Array.isArray(parsed.ai_recommendations) ? parsed.ai_recommendations : [],
          reasoning_summary:  parsed.reasoning_summary              || ''
        };
      }
    } catch (groqErr) {
      // Groq failure is non-fatal — we still save the deterministic metrics
      console.warn('[Portfolio Agent] Groq interpretation failed. Using fallback.', groqErr.message);
    }

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'GROQ_ANALYSIS', step_name: 'PORTFOLIO_INTERPRETATION',
      status: groqCalled ? 'completed' : 'skipped',
      output_data: { health_grade: analysisResult.health_grade, health_score: analysisResult.health_score }
    });

    // ─── Step 6: Save Portfolio Snapshot to Database ──────────────────────────
    // Persists the full result (SQL metrics + Groq interpretation) to portfolio_snapshots.
    // This snapshot can be retrieved by the frontend for historical trending.
    const [insertResult] = await pool.execute(`
      INSERT INTO portfolio_snapshots (
        agent_run_id, snapshot_date,
        total_active_loans, total_principal_deployed, total_interest_expected,
        total_repaid_amount, total_overdue_amount, overdue_loans_count,
        npa_ratio_pct, collection_efficiency_pct,
        risk_tier_breakdown, insights_summary, ai_recommendations
      ) VALUES (?, CURDATE(), ?, ?, 0.00, 0.00, ?, ?, ?, ?, ?, ?, ?)
    `, [
      runId,
      activeLoanCount,
      parseFloat(portfolioSummary.total_portfolio_value || 0),
      parseFloat(delinquencyData.total_overdue_amount || 0),
      overdueCount,
      delinquencyRatePct,
      collectionEffPct,
      JSON.stringify({ concentration_pct: topConcentrationPct, top_borrower: concentrationData.top_borrower_name || 'N/A' }),
      analysisResult.ai_interpretation || analysisResult.reasoning_summary,
      JSON.stringify(analysisResult.ai_recommendations || [])
    ]);

    const snapshotId = insertResult.insertId;

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'SNAPSHOT_SAVED', step_name: 'PORTFOLIO_SNAPSHOT_CREATED',
      status: 'completed', output_data: { snapshot_id: snapshotId }
    });

    // ─── Step 7: Update Agent Run Record as Completed ────────────────────────
    const durationMs = Date.now() - startTime;
    await updateAgentRun(runId, {
      status:           'completed',
      groq_called:      groqCalled,
      duration_ms:      durationMs,
      model:            groqCalled ? GROQ_MODEL : 'sql-deterministic',
      input_tokens:     promptTokens,
      output_tokens:    completionTokens,
      total_tokens:     totalTokens,
      confidence_score: analysisResult.health_score,
      result_summary:   `Portfolio ${analysisResult.health_grade} | Health: ${analysisResult.health_score}/100 | Efficiency: ${collectionEffPct}% | Delinquency: ${delinquencyRatePct}%`
    });

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'RUN_COMPLETED', step_name: 'PORTFOLIO_ANALYSIS_COMPLETE',
      status: 'completed',
      duration_ms: durationMs,
      output_data: { health_grade: analysisResult.health_grade, snapshot_id: snapshotId }
    });

    // ─── Step 8: Emit WebSocket Event ────────────────────────────────────────
    // Notifies all connected frontend clients that a new portfolio snapshot is ready.
    // The frontend LiveToastNotifications component listens to PORTFOLIO_SNAPSHOT_READY.
    emitSocketEvent('PORTFOLIO_SNAPSHOT_READY', {
      health_grade:       analysisResult.health_grade,
      health_score:       analysisResult.health_score,
      collection_efficiency: collectionEffPct,
      delinquency_rate:   delinquencyRatePct,
      snapshot_id:        snapshotId
    });

    // ─── Final Return ─────────────────────────────────────────────────────────
    return {
      run_id:                 runId,
      snapshot_id:            snapshotId,
      health_score:           analysisResult.health_score,
      health_grade:           analysisResult.health_grade,
      collection_efficiency:  collectionEffPct,
      delinquency_rate:       delinquencyRatePct,
      top_borrower_concentration: topConcentrationPct,
      total_overdue_amount:   parseFloat(delinquencyData.total_overdue_amount || 0),
      active_loan_count:      activeLoanCount,
      total_portfolio_value:  parseFloat(portfolioSummary.total_portfolio_value || 0),
      ai_interpretation:      analysisResult.ai_interpretation,
      ai_recommendations:     analysisResult.ai_recommendations,
      reasoning_summary:      analysisResult.reasoning_summary,
      groq_called:            groqCalled,
      total_tokens_used:      totalTokens,
      duration_ms:            durationMs
    };

  } catch (err) {
    // ─── Error Handling ───────────────────────────────────────────────────────
    // If any step fails, we mark the agent run as failed in the database.
    // The run lock is always released in the finally block.
    console.error('[Portfolio Agent Error]', err.message);

    if (runId) {
      await updateAgentRun(runId, {
        status:        'failed',
        error_message: err.message,
        duration_ms:   Date.now() - startTime
      });
      await logStep({
        agent_run_id: runId, agent_id: agentId,
        step_type: 'RUN_FAILED', step_name: 'PORTFOLIO_ANALYSIS_FAILED',
        status: 'failed', error_message: err.message
      });
    }

    throw err;

  } finally {
    // ─── Always Release Run Lock ──────────────────────────────────────────────
    // The finally block runs whether the try succeeded or caught an error.
    // This guarantees the lock is never left in a stuck state.
    releaseAgentLock(agentId, 'GLOBAL');
  }
};
