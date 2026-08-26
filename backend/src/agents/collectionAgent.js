import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { COLLECTION_AGENT_SYSTEM_PROMPT } from '../prompts/collection.prompt.js';
import { executeCollectionTool } from '../tools/collectionTools.js';
import pool from '../config/db.js';
import { createAgentRun, updateAgentRun } from '../models/agentRun.model.js';
import { logStep } from '../models/agentExecutionLog.model.js';
import { acquireAgentLock, releaseAgentLock } from '../utils/agentLock.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Agent 3: Automated Collection Follow-Up Agent
 * Drafts professional payment reminder emails for past-due/high-risk borrowers.
 * Protected by Global Run Lock.
 */
export const runCollectionAgent = async (companyId, triggeredBy = null) => {
  const agentId = 'agent_3_collection';
  const agentName = 'Automated Collection Follow-Up Agent';

  // 1. Acquire Run Lock to prevent duplicate concurrent runs
  if (!acquireAgentLock(agentId, companyId)) {
    console.warn(`[Collection Agent] Execution lock active for company #${companyId}. Duplicate request blocked.`);
    return {
      company_id: companyId,
      urgency_level: 'POLITE_REMINDER',
      subject: 'Payment Reminder Notice',
      email_body: 'Collection draft generation already in progress.',
      cached: true
    };
  }

  const startTime = Date.now();

  try {
    const [compRows] = await pool.query(`SELECT * FROM companies WHERE id = ?`, [companyId]);
    if (compRows.length === 0) {
      throw new Error(`Company ID ${companyId} not found for collection follow-up.`);
    }
    const company = compRows[0];

    const runId = await createAgentRun({
      agent_id: agentId,
      agent_name: agentName,
      triggered_by: triggeredBy,
      trigger_type: 'manual'
    });

    await logStep({
      agent_run_id: runId,
      agent_id: agentId,
      step_type: 'COLLECTION_INITIATED',
      step_name: 'OVERDUE_CHECK',
      status: 'completed',
      input_data: { company_id: companyId, company_name: company.company_name }
    });

    const overdueList = await executeCollectionTool('getOverdueInstallments', { companyId });

    let totalOverdue = 0;
    let oldestDueDate = new Date();
    
    if (overdueList.length > 0) {
      oldestDueDate = new Date(overdueList[0].due_date);
      overdueList.forEach(item => {
        const remaining = parseFloat(item.scheduled_amount) - parseFloat(item.paid_amount || 0);
        if (remaining > 0) totalOverdue += remaining;
      });
    }

    const daysOverdue = overdueList.length > 0
      ? Math.max(0, Math.floor((Date.now() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Guard: Do not generate collection notice if borrower has zero overdue
    if (overdueList.length === 0 || totalOverdue <= 0) {
      const skippedPayload = {
        status: 'SKIPPED',
        skipped: true,
        company_id: company.id,
        company_name: company.company_name,
        total_overdue_amount: 0,
        days_overdue: 0,
        message: `Borrower '${company.company_name}' has no pending or overdue installments. Account is in good standing (₹0.00 overdue). Collection notice was not generated.`
      };

      await updateAgentRun(runId, {
        status: 'completed',
        output_data: skippedPayload,
        total_duration_ms: Date.now() - startTime
      });

      return skippedPayload;
    }

    let urgencyLevel = 'POLITE_REMINDER';
    if (daysOverdue > 30 || company.risk_level === 'CRITICAL') {
      urgencyLevel = 'FINAL_DEMAND';
    } else if (daysOverdue > 7 || company.risk_level === 'HIGH') {
      urgencyLevel = 'URGENT_WARNING';
    }

    let finalDraft = {
      company_id: company.id,
      recipient_name: company.contact_name || 'Finance Department',
      recipient_email: `${company.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@borrower.com`,
      urgency_level: urgencyLevel,
      days_overdue: daysOverdue,
      total_overdue_amount: totalOverdue,
      subject: `[${urgencyLevel.replace('_', ' ')}] Payment Notice for ${company.company_name}`,
      email_body: `Dear ${company.contact_name || 'Finance Team'},\n\nOur records indicate an outstanding balance of ₹${totalOverdue.toLocaleString('en-IN')} for ${company.company_name}. Please arrange for settlement at your earliest convenience.\n\nBest regards,\nFinanceFlow AI Operations`
    };

    let groqCalled = false;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    // Groq LLM Email Drafting
    try {
      const userPrompt = `
Draft a collection reminder email for '${company.company_name}':
- Contact Name: ${company.contact_name}
- Total Overdue Amount: ₹${totalOverdue.toLocaleString('en-IN')}
- Days Overdue: ${daysOverdue} days
- Borrower Risk Level: ${company.risk_level || 'MEDIUM'}
- Urgency Level: ${urgencyLevel}

Output JSON format:
{
  "subject": "Email Subject Line",
  "email_body": "Full professional email body text",
  "urgency_level": "${urgencyLevel}"
}
`;

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: COLLECTION_AGENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      });

      groqCalled = true;
      if (completion.usage) {
        promptTokens = completion.usage.prompt_tokens || 0;
        completionTokens = completion.usage.completion_tokens || 0;
        totalTokens = completion.usage.total_tokens || 0;
      }

      const content = completion.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          finalDraft.subject = parsed.subject || finalDraft.subject;
          finalDraft.email_body = parsed.email_body || finalDraft.email_body;
        } catch (e) {
          // Fallback
        }
      }
    } catch (err) {
      console.warn('[Collection Agent Groq Fallback Triggered]:', err.message);
    }

    const durationMs = Date.now() - startTime;

    await updateAgentRun(runId, {
      status: 'completed',
      groq_called: groqCalled,
      duration_ms: durationMs,
      model: groqCalled ? GROQ_MODEL : 'rule-based-template-engine',
      input_tokens: promptTokens,
      output_tokens: completionTokens,
      total_tokens: totalTokens,
      confidence_score: 95.0,
      result_summary: `Drafted ${urgencyLevel} collection email for ${company.company_name}`
    });

    await logStep({
      agent_run_id: runId,
      agent_id: agentId,
      step_type: 'COLLECTION_DRAFT',
      step_name: 'NOTICE_GENERATED',
      status: 'completed',
      output_data: { urgency_level: urgencyLevel, subject: finalDraft.subject },
      duration_ms: durationMs
    });

    // Emit real-time WebSocket event
    emitSocketEvent('COLLECTION_DRAFTED', {
      company_id: company.id,
      company_name: company.company_name,
      urgency: urgencyLevel,
      subject: finalDraft.subject
    });

    return finalDraft;

  } finally {
    releaseAgentLock(agentId, companyId);
  }
};
