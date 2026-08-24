import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { RISK_AGENT_SYSTEM_PROMPT } from '../prompts/risk.prompt.js';
import { riskToolsDeclaration, executeRiskTool } from '../tools/riskTools.js';
import pool from '../config/db.js';
import { createAgentRun, updateAgentRun } from '../models/agentRun.model.js';
import { logStep } from '../models/agentExecutionLog.model.js';
import { acquireAgentLock, releaseAgentLock } from '../utils/agentLock.js';
import { emitSocketEvent } from '../config/socket.js';

/**
 * Agent 2: Repayment Risk Assessment Agent
 * Computes risk scores, risk levels (LOW/MEDIUM/HIGH/CRITICAL), key risk factors, and recommended mitigation actions.
 * Protected by Global Run Lock & Deduplication Engine.
 */
export const runRiskAssessmentAgent = async (companyId, triggeredBy = null) => {
  const agentId = 'agent_2_risk';
  const agentName = 'Repayment Risk Assessment Agent';

  // 1. Acquire Run Lock to prevent duplicate concurrent runs
  if (!acquireAgentLock(agentId, companyId)) {
    console.warn(`[Risk Agent] Execution lock active for company #${companyId}. Returning active lock status.`);
    return {
      company_id: companyId,
      company_name: 'Borrower Company',
      risk_score: 15,
      risk_level: 'LOW',
      key_risk_factors: ['Execution lock active — duplicate request blocked'],
      recommended_actions: ['Monitor upcoming installments'],
      cached: true
    };
  }

  const startTime = Date.now();

  try {
    const [compRows] = await pool.query(`SELECT * FROM companies WHERE id = ?`, [companyId]);
    if (compRows.length === 0) {
      throw new Error(`Company ID ${companyId} not found for risk assessment.`);
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
      step_type: 'RISK_ASSESSMENT',
      step_name: 'COMPANY_LOOKUP',
      status: 'completed',
      input_data: { company_id: companyId, company_name: company.company_name }
    });

    const loanData = await executeRiskTool('getLoanScheduleStatus', { companyId });
    const paymentHistory = await executeRiskTool('getBorrowerPaymentHistory', { companyId });

    // Rule-based Risk Calculation Engine
    const overdueCount = loanData.overdue_installments.length;
    let totalOverdueAmount = 0;
    loanData.overdue_installments.forEach(item => {
      totalOverdueAmount += parseFloat(item.scheduled_amount) - parseFloat(item.paid_amount);
    });

    let riskScore = 15;
    let riskLevel = 'LOW';
    const keyRiskFactors = [];
    const recommendedActions = [];

    if (overdueCount === 1) {
      riskScore = 65;
      riskLevel = 'HIGH';
      keyRiskFactors.push(`1 Overdue installment totaling ₹${totalOverdueAmount.toLocaleString('en-IN')}`);
      recommendedActions.push('Send automated collection follow-up email');
      recommendedActions.push('Request formal payment promise date from borrower');
    } else if (overdueCount >= 2) {
      riskScore = 88;
      riskLevel = 'CRITICAL';
      keyRiskFactors.push(`${overdueCount} Overdue installments totaling ₹${totalOverdueAmount.toLocaleString('en-IN')}`);
      keyRiskFactors.push('Multiple SLA default breaches identified');
      recommendedActions.push('Issue formal default notice immediately');
      recommendedActions.push('Escalate to Senior Risk Officer for credit line review');
    } else if (paymentHistory.length > 0 && paymentHistory.some(p => p.allocation_type === 'override')) {
      riskScore = 45;
      riskLevel = 'MEDIUM';
      keyRiskFactors.push('History of manual accountant override allocations');
      recommendedActions.push('Review payment reference accuracy with borrower');
    } else {
      keyRiskFactors.push('All loan installments paid on time according to schedule');
      recommendedActions.push('Maintain standard repayment monitoring');
    }

    let finalAssessment = {
      company_id: company.id,
      company_name: company.company_name,
      risk_score: riskScore,
      risk_level: riskLevel,
      key_risk_factors: keyRiskFactors,
      recommended_actions: recommendedActions
    };

    let groqCalled = false;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    // Groq LLM Refinement Loop
    try {
      const userPrompt = `
Analyze credit risk profile for borrower '${company.company_name}' (ID #${company.id}):
- Active Loans Count: ${loanData.active_loans.length}
- Overdue Installments: ${overdueCount} (Total Overdue Amount: ₹${totalOverdueAmount})
- Payment History Records: ${paymentHistory.length}
- Initial Calculated Risk Score: ${riskScore} (${riskLevel})

Refine the risk factors and mitigation recommendations into a concise JSON object matching this structure:
{
  "risk_score": ${riskScore},
  "risk_level": "${riskLevel}",
  "key_risk_factors": ["factor 1", "factor 2"],
  "recommended_actions": ["action 1", "action 2"]
}
`;

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: RISK_AGENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1
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
          finalAssessment = {
            company_id: company.id,
            company_name: company.company_name,
            risk_score: parsed.risk_score || riskScore,
            risk_level: parsed.risk_level || riskLevel,
            key_risk_factors: parsed.key_risk_factors || keyRiskFactors,
            recommended_actions: parsed.recommended_actions || recommendedActions
          };
        } catch (e) {
          // Fallback to rule-based
        }
      }
    } catch (err) {
      console.warn('[Risk Agent Groq Fallback Triggered]:', err.message);
    }

    const durationMs = Date.now() - startTime;

    await updateAgentRun(runId, {
      status: 'completed',
      groq_called: groqCalled,
      duration_ms: durationMs,
      model: groqCalled ? GROQ_MODEL : 'rule-based-risk-engine',
      input_tokens: promptTokens,
      output_tokens: completionTokens,
      total_tokens: totalTokens,
      confidence_score: parseFloat(finalAssessment.risk_score),
      result_summary: `Assessed ${company.company_name}: Risk Level ${finalAssessment.risk_level} (${finalAssessment.risk_score}/100)`
    });

    await logStep({
      agent_run_id: runId,
      agent_id: agentId,
      step_type: 'RISK_CALCULATION',
      step_name: 'ASSESSMENT_COMPLETED',
      status: 'completed',
      output_data: { risk_level: finalAssessment.risk_level, risk_score: finalAssessment.risk_score },
      duration_ms: durationMs
    });

    // Emit real-time WebSocket event
    emitSocketEvent('RISK_ASSESSMENT_COMPLETED', {
      company_id: company.id,
      company_name: company.company_name,
      risk_level: finalAssessment.risk_level,
      risk_score: finalAssessment.risk_score
    });

    return finalAssessment;

  } finally {
    releaseAgentLock(agentId, companyId);
  }
};
