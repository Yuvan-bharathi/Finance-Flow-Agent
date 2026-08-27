/**
 * Prompts: Financial Transaction Anomaly Detection Agent (Agent 7)
 *
 * IMPORTANT: Groq is used ONLY to explain deterministic findings.
 * The anomaly score is computed by the deterministic engine, NOT by Groq.
 */

export const ANOMALY_AGENT_SYSTEM_PROMPT = `You are Agent 7 — the Financial Transaction Anomaly Detection Analyst for FinanceFlow AI, an enterprise lending platform for NBFCs and corporate loan service desks.

## Your Role
You receive a structured JSON payload containing:
- Payment details (amount, date, payer account, sender name)
- Deterministic anomaly check results (already computed by the scoring engine)
- The final numeric anomaly score (already calculated — you do NOT change this)
- Borrower history and loan context

## Your Task
Write a clear, concise, professional explanation for the HUMAN REVIEWER that:
1. Summarizes what was found in plain language
2. Explains WHY each detected anomaly is flagged (using the specific numbers provided)
3. States whether the payment appears safe to proceed based on the available information
4. Provides one actionable recommendation for the accountant or operations team

## Critical Boundaries — YOU MUST NEVER:
- Suggest changes to repayment_schedules, paid_amount, or payment_allocations
- Recommend approving or rejecting specific installments
- Override the deterministic anomaly score
- Make final monetary decisions
- Claim certainty about fraud — only flag for review

## Output Format (strict JSON)
Return ONLY this JSON with no markdown, no code fences, no preamble:
{
  "explanation": "2-4 sentence plain-English summary of the anomaly findings",
  "recommendation": "1 specific action for the operations team to take"
}

## Tone
Professional, precise, neutral. Do not alarm unnecessarily. Do not dismiss concerns. You are an analyst, not a decision-maker.`;

/**
 * Builds the user prompt for Agent 7 based on payment, check results, and context.
 *
 * @param {Object} payment - Raw payment record
 * @param {Object} checks - Results from each deterministic check
 * @param {Object} scoreBreakdown - Points per check
 * @param {number} anomalyScore - Final computed score
 * @param {string} severity - CLEAR|LOW|MEDIUM|HIGH|CRITICAL
 * @param {Object|null} company - Company record (may be null in Stage A)
 * @param {Object|null} loan - Loan record (may be null in Stage A)
 * @returns {string}
 */
export const createAnomalyUserPrompt = (payment, checks, scoreBreakdown, anomalyScore, severity, company = null, loan = null) => {
  const formatAmount = (n) => {
    if (n == null) return '—';
    return `₹${parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const detectedTypes = Object.entries(checks)
    .filter(([, v]) => v.triggered)
    .map(([k, v]) => `- ${k}: ${v.detail}`)
    .join('\n');

  const breakdownLines = Object.entries(scoreBreakdown)
    .map(([k, pts]) => `  ${k}: +${pts}`)
    .join('\n');

  const companyLine = company
    ? `Company: ${company.company_name} (ID: ${company.id})\n  Registered Account: ${company.bank_account_number || 'not on file'}`
    : 'Company: Unknown (pre-match stage)';

  const loanLine = loan
    ? `Loan: ${loan.loan_number} (ID: ${loan.id}), Principal: ${formatAmount(loan.principal_amount)}`
    : 'Loan: Not yet matched (Stage A detection)';

  return `PAYMENT ANOMALY ANALYSIS REQUEST

Payment ID: ${payment.id}
Transaction Reference: ${payment.transaction_id || 'N/A'}
Amount Received: ${formatAmount(payment.amount)}
Payment Date: ${payment.payment_date}
Sender Name: ${payment.sender_name || 'Unknown'}
Sender Account: ${payment.sender_account || 'Not provided'}
${companyLine}
${loanLine}

DETERMINISTIC CHECK RESULTS:
${detectedTypes || '- No anomalies detected by any check.'}

SCORE BREAKDOWN (computed by deterministic engine — do not change):
${breakdownLines || '  (no points assigned)'}
Total Anomaly Score: ${anomalyScore.toFixed(2)} / 100
Severity: ${severity}
Safe to Proceed: ${anomalyScore < 70 ? 'YES' : 'PENDING HUMAN REVIEW'}

Please provide your JSON explanation and recommendation based on the above findings.`;
};
