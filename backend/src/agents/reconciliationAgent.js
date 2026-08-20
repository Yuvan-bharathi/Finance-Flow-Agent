import pool from '../config/db.js';
import { groq, GROQ_MODEL } from '../config/groq.config.js';
import { toolDefinitions, executeTool } from '../tools/reconciliationTools.js';
import { RECONCILIATION_SYSTEM_PROMPT, createReconciliationUserPrompt } from '../prompts/reconciliation.prompt.js';
import { findCaseById } from '../models/reconciliationCase.model.js';
import { insertAIRecommendation } from '../models/aiRecommendation.model.js';

/**
 * Agent: Payment Reconciliation Agent (Agent 1)
 * Purpose: Investigates raw incoming bank payments using controlled database tools and Groq LLM tool calling.
 * 
 * Called by:
 * - backend/src/services/reconciliation.service.js
 * 
 * Data flow:
 * Ingested Payment Case ID ➔ Fetch Payment Details ➔ Groq LLM Tool Calling Loop ➔ Backend Tools Execution ➔ MySQL ➔ Candidate Match & Confidence Score ➔ Save to ai_recommendations ➔ Update reconciliation_cases status
 */

/**
 * Fallback Rule-Based Matching Engine
 * Used when Groq API key is unavailable or encounters network timeouts.
 */
const runFallbackRuleBasedMatching = async (payment) => {
  let matchedCompany = null;
  let matchedLoan = null;
  let matchedSchedule = null;
  let confidence = 50.0;
  let reasoningLines = ['[Engine: Fallback Rule-Based Search]'];

  // Signal 1: Search company by sender name or account
  const searchResults = await executeTool('searchCompany', { query: payment.sender_account || payment.sender_name || '' });
  if (searchResults && searchResults.length > 0) {
    matchedCompany = searchResults[0];
    confidence += 25.0;
    reasoningLines.push(`Found company match: '${matchedCompany.company_name}' (ID: ${matchedCompany.id}) via sender details.`);

    // Signal 2: Find active loans for company
    const activeLoans = await executeTool('getActiveLoans', { companyId: matchedCompany.id });
    if (activeLoans && activeLoans.length > 0) {
      matchedLoan = activeLoans[0];
      confidence += 15.0;
      reasoningLines.push(`Identified active loan facility: '${matchedLoan.loan_number}' (ID: ${matchedLoan.id}).`);

      // Signal 3: Find due repayment installments
      const dueInstallments = await executeTool('getDueRepayments', { loanId: matchedLoan.id });
      if (dueInstallments && dueInstallments.length > 0) {
        // Match exact or closest amount
        const exactAmountMatch = dueInstallments.find(inst => parseFloat(inst.scheduled_amount) === parseFloat(payment.amount));
        if (exactAmountMatch) {
          matchedSchedule = exactAmountMatch;
          confidence += 10.0;
          reasoningLines.push(`Exact amount match found for Installment #${matchedSchedule.installment_number} due on ${matchedSchedule.due_date} for amount ₹${payment.amount}.`);
        } else {
          matchedSchedule = dueInstallments[0];
          reasoningLines.push(`Selected nearest pending Installment #${matchedSchedule.installment_number} due on ${matchedSchedule.due_date}.`);
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
 * @returns {Promise<Object>} Object containing generated recommendation and updated case details.
 */
export const runReconciliationAgent = async (caseId) => {
  // 1. Retrieve case & payment details
  const caseDetails = await findCaseById(caseId);
  if (!caseDetails) {
    const error = new Error(`Reconciliation case with ID ${caseId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Set case status to 'ai_processing'
  await pool.execute(`UPDATE reconciliation_cases SET status = 'ai_processing' WHERE id = ?;`, [caseId]);

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

  let finalRecommendation = null;

  // 3. Groq LLM Tool Calling Loop
  try {
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

      const responseMessage = completion.choices[0].message;
      messages.push(responseMessage);

      // Check if Groq requested tool calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(`[Reconciliation Agent] Loop ${loopCounter}: Groq requested ${responseMessage.tool_calls.length} tool call(s)...`);
        
        for (const toolCall of responseMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          console.log(`[Reconciliation Agent Executing Tool] '${toolName}':`, toolArgs);
          const toolResult = await executeTool(toolName, toolArgs);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
      } else {
        // Groq produced final text recommendation
        const contentText = responseMessage.content || '';
        console.log('[Reconciliation Agent Output]:', contentText);

        try {
          // Attempt to extract JSON payload
          const jsonMatch = contentText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            finalRecommendation = JSON.parse(jsonMatch[0]);
          } else {
            finalRecommendation = JSON.parse(contentText);
          }
        } catch (parseError) {
          console.warn('[Reconciliation Agent] Failed to parse JSON from Groq text output, utilizing fallback engine:', parseError.message);
          finalRecommendation = await runFallbackRuleBasedMatching(payment);
        }
        break;
      }
    }

    if (!finalRecommendation) {
      finalRecommendation = await runFallbackRuleBasedMatching(payment);
    }
  } catch (error) {
    console.warn('[Reconciliation Agent Groq Fallback Triggered]:', error.message);
    finalRecommendation = await runFallbackRuleBasedMatching(payment);
  }

  // 4. Save recommendation into `ai_recommendations` table
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

  // 5. Update `reconciliation_cases` container status based on confidence score threshold
  const score = parseFloat(finalRecommendation.confidence_score);
  let newCaseStatus = 'pending_review';
  if (score < 70.0) {
    newCaseStatus = 'under_review'; // Low confidence flagged for manual investigation
  }

  await pool.execute(
    `UPDATE reconciliation_cases 
     SET status = ? 
     WHERE id = ?;`,
    [
      newCaseStatus,
      caseId
    ]
  );

  const updatedCase = await findCaseById(caseId);

  return {
    recommendation_id: recId,
    case: updatedCase,
    recommendation: finalRecommendation
  };
};
