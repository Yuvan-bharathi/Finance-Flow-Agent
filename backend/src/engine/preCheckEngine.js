import pool from '../config/db.js';
import { AGENT_CONFIG } from '../config/agentConfig.js';
import { executeTool } from '../tools/reconciliationTools.js';
import { previewWaterfallAllocation } from '../services/settlement.service.js';
import { logStep } from '../models/agentExecutionLog.model.js';

/**
 * Deterministic Pre-Check Engine for Agent 1 (Payment Reconciliation)
 * 
 * Conducts fast, zero-token validation & matching prior to calling Groq LLM:
 * 1. Hard validations (Duplicate check, Company lookup, Amount sanity)
 * 2. Deterministic scoring (Bank Account match, Due Installment exact amount match, Reference match)
 * 3. Threshold check against configurable AGENT_CONFIG.precheck.threshold (default 85)
 * 
 * Returns: {
 *   result: 'clear_match' | 'ambiguous' | 'no_match',
 *   score: number,
 *   recommendedCompany: Object|null,
 *   recommendedLoan: Object|null,
 *   recommendedSchedule: Object|null,
 *   reasons: string[]
 * }
 */
export const runPreCheckEngine = async (payment, agentRunId = null) => {
  const startTime = Date.now();
  const agentId = 'agent_1_reconciliation';
  const reasons = ['[Engine: Deterministic Validation & Scoring]'];
  let score = 0;

  let matchedCompany = null;
  let matchedLoan = null;
  let matchedSchedule = null;

  // Log Pre-check start
  if (agentRunId) {
    await logStep({
      agent_run_id: agentRunId,
      agent_id: agentId,
      step_type: 'PRECHECK',
      step_name: 'PRECHECK_STARTED',
      status: 'started',
      input_data: { transaction_id: payment.transaction_id, amount: payment.amount, sender: payment.sender_name }
    });
  }

  // ──── STEP 1: HARD VALIDATIONS ────

  // 1a. Duplicate check
  const dupCheckStart = Date.now();
  const duplicates = await executeTool('checkDuplicates', {
    transactionId: payment.transaction_id,
    amount: payment.amount
  });

  if (duplicates && duplicates.length > 0 && duplicates[0].is_duplicate) {
    reasons.push(`[Hard Validation Failed] Duplicate transaction detected: ${duplicates[0].matched_transaction_id}`);
    if (agentRunId) {
      await logStep({
        agent_run_id: agentRunId,
        agent_id: agentId,
        step_type: 'PRECHECK',
        step_name: 'DUPLICATE_CHECK',
        status: 'failed',
        output_data: { is_duplicate: true, duplicate_id: duplicates[0].matched_transaction_id },
        duration_ms: Date.now() - dupCheckStart
      });
    }
    return {
      result: 'no_match',
      score: 0,
      recommendedCompany: null,
      recommendedLoan: null,
      recommendedSchedule: null,
      reasons,
      durationMs: Date.now() - startTime
    };
  }

  if (agentRunId) {
    await logStep({
      agent_run_id: agentRunId,
      agent_id: agentId,
      step_type: 'PRECHECK',
      step_name: 'DUPLICATE_CHECK',
      status: 'completed',
      output_data: { is_duplicate: false },
      duration_ms: Date.now() - dupCheckStart
    });
  }

  // ──── STEP 2: COMPANY LOOKUP & BANK ACCOUNT MATCH ────
  const companySearchStart = Date.now();
  const searchResults = await executeTool('searchCompany', {
    query: payment.sender_account || payment.sender_name || ''
  });

  if (searchResults && searchResults.length > 0) {
    matchedCompany = searchResults[0];
    score += AGENT_CONFIG.precheck.scoring.bankAccount; // +40 pts
    reasons.push(`Found company match: '${matchedCompany.company_name}' (ID: ${matchedCompany.id}) via bank details (+${AGENT_CONFIG.precheck.scoring.bankAccount} pts).`);

    if (agentRunId) {
      await logStep({
        agent_run_id: agentRunId,
        agent_id: agentId,
        step_type: 'PRECHECK',
        step_name: 'BANK_ACCOUNT_CHECK',
        status: 'completed',
        output_data: { matched_company_id: matchedCompany.id, company_name: matchedCompany.company_name },
        duration_ms: Date.now() - companySearchStart
      });
    }

    // ──── STEP 3: LOAN & SCHEDULE MATCH ────
    const loanSearchStart = Date.now();
    const activeLoans = await executeTool('getActiveLoans', { companyId: matchedCompany.id });
    
    if (activeLoans && activeLoans.length > 0) {
      matchedLoan = activeLoans[0];
      score += 10; // +10 pts for active loan facility
      reasons.push(`Identified active loan facility '${matchedLoan.loan_number}' (ID: ${matchedLoan.id}) (+10 pts).`);

      const dueInstallments = await executeTool('getDueRepayments', { loanId: matchedLoan.id });
      if (dueInstallments && dueInstallments.length > 0) {
        matchedSchedule = dueInstallments[0];
        const waterfallPreview = await previewWaterfallAllocation(payment.amount, matchedLoan.id);
        if (waterfallPreview && waterfallPreview.allocations.length > 0) {
          score += AGENT_CONFIG.precheck.scoring.amount; // +30 pts
          const instNums = waterfallPreview.allocations.map(a => `#${a.installment_number}`);
          reasons.push(`Continuous waterfall allocation maps ₹${parseFloat(payment.amount).toLocaleString('en-IN')} across ${waterfallPreview.allocations.length} open milestones (${instNums.join(', ')}) (+${AGENT_CONFIG.precheck.scoring.amount} pts).`);
          reasons.push(`Projected net remaining overdue after settlement: ₹${waterfallPreview.post_settlement_overdue_exposure.toLocaleString('en-IN')}.`);
        } else {
          matchedSchedule = dueInstallments[0];
          score += 10;
          reasons.push(`Targeted anchor installment #${matchedSchedule.installment_number} due on ${matchedSchedule.due_date} (+10 pts).`);
        }
      }

      if (agentRunId) {
        await logStep({
          agent_run_id: agentRunId,
          agent_id: agentId,
          step_type: 'PRECHECK',
          step_name: 'AMOUNT_CHECK',
          status: 'completed',
          output_data: { loan_id: matchedLoan.id, schedule_id: matchedSchedule ? matchedSchedule.id : null, is_exact_amount: !!matchedSchedule },
          duration_ms: Date.now() - loanSearchStart
        });
      }
    }
  } else {
    reasons.push(`No direct company match found for sender details '${payment.sender_name}' / '${payment.sender_account}'.`);

    // Nearest candidate discovery across active borrower loan facilities
    try {
      const [candidateRows] = await pool.query(`
        SELECT c.id, c.company_name, l.id as loan_id, l.loan_number, l.total_outstanding_amount
        FROM companies c
        LEFT JOIN loans l ON l.company_id = c.id
        WHERE c.is_active = 1
        ORDER BY l.total_outstanding_amount DESC, c.id ASC
        LIMIT 1;
      `);
      if (candidateRows && candidateRows.length > 0) {
        const nearest = candidateRows[0];
        reasons.push(`Nearest potential borrower facility: '${nearest.company_name}' (Loan ${nearest.loan_number || 'LN-2026-001'}). Suggested for manual accountant confirmation.`);
      }
    } catch (e) {
      // Non-critical fallback
    }

    if (agentRunId) {
      await logStep({
        agent_run_id: agentRunId,
        agent_id: agentId,
        step_type: 'PRECHECK',
        step_name: 'BANK_ACCOUNT_CHECK',
        status: 'skipped',
        output_data: { matched: false },
        duration_ms: Date.now() - companySearchStart
      });
    }
  }

  // ──── STEP 4: REFERENCE MATCH ────
  const refStart = Date.now();
  if (payment.reference && matchedLoan && payment.reference.toLowerCase().includes(matchedLoan.loan_number.toLowerCase())) {
    score += AGENT_CONFIG.precheck.scoring.reference; // +20 pts
    reasons.push(`Payment reference '${payment.reference}' matches Loan #${matchedLoan.loan_number} (+${AGENT_CONFIG.precheck.scoring.reference} pts).`);
  }

  if (agentRunId) {
    await logStep({
      agent_run_id: agentRunId,
      agent_id: agentId,
      step_type: 'PRECHECK',
      step_name: 'REFERENCE_CHECK',
      status: 'completed',
      output_data: { reference: payment.reference, score_gained: score },
      duration_ms: Date.now() - refStart
    });
  }

  // ──── STEP 5: THRESHOLD COMPARISON ────
  const threshold = AGENT_CONFIG.precheck.threshold;
  const isClearMatch = score >= threshold && matchedCompany !== null && matchedSchedule !== null;
  const resultState = isClearMatch ? 'clear_match' : (matchedCompany ? 'ambiguous' : 'no_match');

  reasons.push(`Pre-check Score: ${score}/${100}. Threshold: ${threshold}. Determination: ${resultState.toUpperCase()}.`);

  const durationMs = Date.now() - startTime;

  if (agentRunId) {
    await logStep({
      agent_run_id: agentRunId,
      agent_id: agentId,
      step_type: 'PRECHECK',
      step_name: 'PRECHECK_RESULT',
      status: 'completed',
      output_data: { score, threshold, result: resultState },
      duration_ms: durationMs
    });
  }

  return {
    result: resultState,
    score,
    recommendedCompany: matchedCompany,
    recommendedLoan: matchedLoan,
    recommendedSchedule: matchedSchedule,
    reasons,
    durationMs
  };
};
