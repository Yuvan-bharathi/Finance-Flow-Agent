import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { NOTIFICATION_AGENT_SYSTEM_PROMPT } from '../prompts/notification.prompt.js';
import { notificationToolsDeclaration, executeNotificationTool, _getOverdueLoans } from '../tools/notificationTools.js';
import pool from '../config/db.js';
import { createAgentRun, updateAgentRun } from '../models/agentRun.model.js';
import { logStep } from '../models/agentExecutionLog.model.js';
import { acquireAgentLock, releaseAgentLock } from '../utils/agentLock.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Agent 6: Notification & Escalation Agent
 *
 * Purpose:
 *   Detects SLA-breached repayments using the deterministic SLA engine (pure SQL),
 *   then uses Groq LLM to classify severity, recommend escalation recipients,
 *   and generate reasoning for each alert.
 *
 * Architecture (Hybrid — as approved):
 *
 *   Step 1 (SQL SLA Engine):
 *     MySQL → Find overdue loans → compute overdue_days, outstanding_amount
 *     This is DETERMINISTIC. SQL always computes dates accurately.
 *
 *   Step 2 (Groq Reasoning):
 *     Send breach records to Groq → Get severity + recipient + reasoning
 *     Groq does NOT check dates. It interprets context and assigns severity.
 *
 *   Step 3 (Human Approval Workflow):
 *     Alerts saved with status='pending' → Frontend shows [Approve] / [Dismiss]
 *     Agent does NOT send emails. Human decides whether to escalate.
 *
 * Execution Logs:
 *   RUN_STARTED → FETCH_OVERDUE_LOANS → SLA_CALCULATION → GROQ_ESCALATION_ANALYSIS
 *   → ALERTS_CREATED → WEBSOCKET_NOTIFICATION → RUN_COMPLETED
 *
 * Called by:
 *   - notification.controller.js → POST /api/notifications/escalate
 *
 * @param {number|null} triggeredBy - users.id of the user who triggered (from JWT)
 * @returns {Promise<Object>} Summary of alerts generated
 */
export const runNotificationAgent = async (triggeredBy = null) => {
  const agentId   = 'agent_6_notification';
  const agentName = 'Notification & Escalation Agent';

  // ─── Step 1: Acquire Run Lock ─────────────────────────────────────────────
  // Global lock key — escalation scan covers all companies.
  // Prevents duplicate concurrent scans from creating duplicate alerts.
  if (!acquireAgentLock(agentId, 'GLOBAL')) {
    console.warn('[Notification Agent] Execution lock active. Duplicate scan blocked.');
    return {
      cached: true,
      message: 'Escalation scan already running. Please wait for the current scan to complete.'
    };
  }

  const startTime = Date.now();
  let runId = null;

  try {
    // ─── Step 2: Create Agent Run Record ─────────────────────────────────────
    runId = await createAgentRun({
      agent_id:     agentId,
      agent_name:   agentName,
      triggered_by: triggeredBy,
      trigger_type: 'manual'
    });

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'RUN_STARTED', step_name: 'ESCALATION_SCAN_INITIATED',
      status: 'completed',
      input_data: { triggered_by: triggeredBy, timestamp: new Date().toISOString() }
    });

    // ─── Step 3: Deterministic SLA Engine — Find Overdue Loans ───────────────
    // This is PURE SQL — no AI involved.
    // _getOverdueLoans() finds all companies with past-due installments.
    // It returns: company_id, overdue_days, outstanding_amount, risk_level
    const overdueLoans = await _getOverdueLoans();

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'TOOL_EXECUTED', step_name: 'FETCH_OVERDUE_LOANS',
      status: 'completed',
      output_data: { overdue_count: overdueLoans.length }
    });

    // If no overdue loans are found, the scan completes with zero alerts.
    // This is a valid clean result — no Groq tokens consumed.
    if (overdueLoans.length === 0) {
      const durationMs = Date.now() - startTime;
      await updateAgentRun(runId, {
        status:        'completed',
        groq_called:   false,
        duration_ms:   durationMs,
        result_summary: 'Escalation scan complete — no overdue loans found.'
      });
      await logStep({
        agent_run_id: runId, agent_id: agentId,
        step_type: 'RUN_COMPLETED', step_name: 'NO_BREACHES_FOUND',
        status: 'completed', duration_ms: durationMs
      });

      emitSocketEvent('ESCALATION_SCAN_COMPLETE', {
        alerts_created: 0,
        message: 'No SLA breaches found at this time.'
      });

      releaseAgentLock(agentId, 'GLOBAL');
      return { alerts_created: 0, message: 'No overdue loans found. No alerts generated.' };
    }

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'SLA_ENGINE', step_name: 'SLA_BREACH_DETECTED',
      status: 'completed',
      output_data: {
        breach_count: overdueLoans.length,
        companies: overdueLoans.map(l => ({ company_id: l.company_id, overdue_days: l.overdue_days }))
      }
    });

    // ─── Step 4: Groq Escalation Analysis ────────────────────────────────────
    // Now we send the breach records to Groq for intelligent classification.
    // Groq receives: company, overdue_days, outstanding_amount, risk_level
    // Groq returns: severity, recommended_recipient, recommended_action, ai_reasoning
    //
    // Data flow:
    //   overdueLoans array → userPrompt → Groq API → JSON array → parsed alerts

    let groqCalled    = false;
    let promptTokens  = 0;
    let completionTokens = 0;
    let totalTokens   = 0;

    // Build a structured summary of breaches for the Groq user prompt
    const breachSummary = overdueLoans.map(l => ({
      company_id:         l.company_id,
      company_name:       l.company_name,
      loan_principal:     parseFloat(l.loan_principal || 0),
      overdue_days:       parseInt(l.overdue_days || 0),
      outstanding_amount: parseFloat(l.outstanding_amount || 0),
      contact_name:       l.contact_name || 'Finance Department'
    }));

    const userPrompt = `
Analyze the following SLA breach records and classify each one.

SLA BREACH RECORDS (detected by deterministic SQL engine):
${JSON.stringify(breachSummary, null, 2)}

For each record, provide severity, recommended_recipient, recommended_action, and ai_reasoning.

Output ONLY a valid JSON array:
[
  {
    "company_id": <integer>,
    "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
    "recommended_recipient": "<role title>",
    "recommended_action": "<specific action>",
    "ai_reasoning": "<2-3 sentence reasoning>"
  }
]
`;

    // Default fallback alerts if Groq fails
    let groqAlerts = overdueLoans.map(l => ({
      company_id:            l.company_id,
      severity:              parseInt(l.overdue_days) > 30 ? 'HIGH' : 'MEDIUM',
      recommended_recipient: 'Finance Manager',
      recommended_action:    'Review overdue installment and contact borrower.',
      ai_reasoning:          `Fallback: Payment is ${l.overdue_days} days overdue with ₹${parseFloat(l.outstanding_amount || 0).toLocaleString('en-IN')} outstanding.`
    }));

    try {
      const messages = [
        { role: 'system', content: NOTIFICATION_AGENT_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt }
      ];

      let response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        tools: notificationToolsDeclaration,
        tool_choice: 'auto',
        temperature: 0.1
      });

      groqCalled = true;

      // ─── Groq Tool-Calling Loop ───────────────────────────────────────────
      // If Groq needs additional company data (e.g. risk profile), it can call tools.
      while (response.choices[0]?.message?.tool_calls?.length > 0) {
        const toolCalls = response.choices[0].message.tool_calls;
        messages.push(response.choices[0].message);

        for (const tc of toolCalls) {
          const toolName   = tc.function.name;
          const toolArgs   = JSON.parse(tc.function.arguments || '{}');
          const toolResult = await executeNotificationTool(toolName, toolArgs);

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult)
          });
        }

        response = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages,
          temperature: 0.1
        });
      }

      if (response.usage) {
        promptTokens     = response.usage.prompt_tokens     || 0;
        completionTokens = response.usage.completion_tokens || 0;
        totalTokens      = response.usage.total_tokens      || 0;
      }

      // Parse Groq's JSON array response
      const content   = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          groqAlerts = parsed;
        }
      }
    } catch (groqErr) {
      console.warn('[Notification Agent] Groq analysis failed. Using rule-based fallback.', groqErr.message);
    }

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'GROQ_ANALYSIS', step_name: 'GROQ_ESCALATION_ANALYSIS',
      status: groqCalled ? 'completed' : 'skipped',
      output_data: { alerts_classified: groqAlerts.length }
    });

    // ─── Step 5: Save Alerts to notification_alerts Table ────────────────────
    // Each alert is saved with status='pending' — waiting for human approval.
    // The human can then [Approve & Send] or [Dismiss] from the frontend.
    const savedAlerts = [];

    for (const loan of overdueLoans) {
      // Find the matching Groq classification for this company
      const groqAlert = groqAlerts.find(a => a.company_id === loan.company_id) || {
        severity:              'MEDIUM',
        recommended_recipient: 'Finance Manager',
        recommended_action:    'Review and contact borrower.',
        ai_reasoning:          'Rule-based fallback classification.'
      };

      const [insertResult] = await pool.execute(`
        INSERT INTO notification_alerts (
          agent_run_id, company_id, loan_id, repayment_id,
          severity, overdue_days, outstanding_amount,
          recommended_recipient, recommended_action, ai_reasoning,
          notification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        runId,
        loan.company_id,
        loan.loan_id || null,
        loan.repayment_id || null,
        groqAlert.severity,
        parseInt(loan.overdue_days || 0),
        parseFloat(loan.outstanding_amount || 0),
        groqAlert.recommended_recipient,
        groqAlert.recommended_action,
        groqAlert.ai_reasoning
      ]);

      savedAlerts.push({
        id:                   insertResult.insertId,
        company_id:           loan.company_id,
        company_name:         loan.company_name,
        severity:             groqAlert.severity,
        overdue_days:         parseInt(loan.overdue_days || 0),
        outstanding_amount:   parseFloat(loan.outstanding_amount || 0),
        recommended_recipient: groqAlert.recommended_recipient,
        recommended_action:   groqAlert.recommended_action,
        ai_reasoning:         groqAlert.ai_reasoning
      });
    }

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'ALERTS_CREATED', step_name: 'NOTIFICATION_ALERTS_SAVED',
      status: 'completed',
      output_data: { alerts_count: savedAlerts.length }
    });

    // ─── Step 6: Update Agent Run as Completed ────────────────────────────────
    const durationMs = Date.now() - startTime;
    const criticalCount = savedAlerts.filter(a => a.severity === 'CRITICAL').length;
    const highCount     = savedAlerts.filter(a => a.severity === 'HIGH').length;

    await updateAgentRun(runId, {
      status:           'completed',
      groq_called:      groqCalled,
      duration_ms:      durationMs,
      model:            groqCalled ? GROQ_MODEL : 'rule-based-sla-engine',
      input_tokens:     promptTokens,
      output_tokens:    completionTokens,
      total_tokens:     totalTokens,
      confidence_score: 90.0,
      result_summary:   `Generated ${savedAlerts.length} alerts (${criticalCount} CRITICAL, ${highCount} HIGH)`
    });

    await logStep({
      agent_run_id: runId, agent_id: agentId,
      step_type: 'RUN_COMPLETED', step_name: 'ESCALATION_SCAN_COMPLETE',
      status: 'completed', duration_ms: durationMs,
      output_data: { total_alerts: savedAlerts.length, critical: criticalCount, high: highCount }
    });

    // ─── Step 7: Emit WebSocket Events ────────────────────────────────────────
    // Broadcasts NEW_ESCALATION_ALERTS to all frontend clients.
    // The frontend notification panel listens to this event and refreshes.
    emitSocketEvent('NEW_ESCALATION_ALERTS', {
      alerts_count:   savedAlerts.length,
      critical_count: criticalCount,
      high_count:     highCount,
      alerts:         savedAlerts
    });

    return {
      run_id:         runId,
      alerts_created: savedAlerts.length,
      critical_count: criticalCount,
      high_count:     highCount,
      alerts:         savedAlerts,
      groq_called:    groqCalled,
      total_tokens:   totalTokens,
      duration_ms:    durationMs
    };

  } catch (err) {
    console.error('[Notification Agent Error]', err.message);

    if (runId) {
      await updateAgentRun(runId, {
        status:        'failed',
        error_message: err.message,
        duration_ms:   Date.now() - startTime
      });
      await logStep({
        agent_run_id: runId, agent_id: agentId,
        step_type: 'RUN_FAILED', step_name: 'ESCALATION_SCAN_FAILED',
        status: 'failed', error_message: err.message
      });
    }

    throw err;

  } finally {
    // Always release lock whether success or failure
    releaseAgentLock(agentId, 'GLOBAL');
  }
};
