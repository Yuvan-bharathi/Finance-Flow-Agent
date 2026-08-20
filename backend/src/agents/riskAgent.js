import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { RISK_AGENT_SYSTEM_PROMPT } from '../prompts/risk.prompt.js';
import { riskToolsDeclaration, executeRiskTool } from '../tools/riskTools.js';
import pool from '../config/db.js';

/**
 * Agent 2: Repayment Risk Assessment Agent
 * Computes risk scores, risk levels (LOW/MEDIUM/HIGH/CRITICAL), key risk factors, and recommended mitigation actions.
 * 
 * Called by:
 * - risk.service.js
 * 
 * @param {number} companyId - Target Company ID.
 * @returns {Promise<Object>} Structured risk assessment report object.
 */
export const runRiskAssessmentAgent = async (companyId) => {
  // Fetch base company & loan info directly from MySQL
  const [compRows] = await pool.query(`SELECT * FROM companies WHERE id = ?`, [companyId]);
  if (compRows.length === 0) {
    throw new Error(`Company ID ${companyId} not found for risk assessment.`);
  }
  const company = compRows[0];

  const loanData = await executeRiskTool('getLoanScheduleStatus', { companyId });
  const paymentHistory = await executeRiskTool('getBorrowerPaymentHistory', { companyId });

  // Fallback / Rule-based Risk Calculation Engine
  const overdueCount = loanData.overdue_installments.length;
  let totalOverdueAmount = 0;
  loanData.overdue_installments.forEach(item => {
    totalOverdueAmount += parseFloat(item.scheduled_amount) - parseFloat(item.paid_amount);
  });

  let riskScore = 15; // Base low risk
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
    keyRiskFactors.push('Delinquency duration exceeds 30+ days');
    recommendedActions.push('Initiate immediate legal notice / senior collection escalation');
    recommendedActions.push('Pause further credit facility extensions');
  } else {
    keyRiskFactors.push('All historical installments settled on schedule');
    recommendedActions.push('Maintain standard monthly repayment monitoring');
  }

  const fallbackAssessment = {
    company_id: company.id,
    company_name: company.company_name,
    risk_score: riskScore,
    risk_level: riskLevel,
    overdue_installments_count: overdueCount,
    total_overdue_amount: totalOverdueAmount,
    key_risk_factors: keyRiskFactors,
    recommended_actions: recommendedActions,
    reasoning_summary: `${company.company_name} currently displays a ${riskLevel} risk profile with ${overdueCount} overdue installment(s) totaling ₹${totalOverdueAmount.toLocaleString('en-IN')}.`
  };

  // Attempt Groq LLM tool-calling enhancement
  try {
    const messages = [
      { role: 'system', content: RISK_AGENT_SYSTEM_PROMPT },
      { role: 'user', content: `Perform a comprehensive credit risk assessment for Company ID ${companyId} (${company.company_name}). Data context: ${JSON.stringify({ loanData, paymentHistory })}` }
    ];

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: riskToolsDeclaration,
      tool_choice: 'auto',
      temperature: 0.1
    });

    const choice = response.choices[0].message;
    if (choice.content) {
      try {
        const parsed = JSON.parse(choice.content);
        return {
          ...fallbackAssessment,
          ...parsed,
          risk_score: parsed.risk_score || riskScore,
          risk_level: parsed.risk_level || riskLevel
        };
      } catch (e) {
        // Content not raw JSON, return fallback
      }
    }
  } catch (err) {
    console.warn('[Risk Agent Groq Fallback Triggered]:', err.message);
  }

  return fallbackAssessment;
};
