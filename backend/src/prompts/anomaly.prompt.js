/**
 * Prompts: Financial Transaction Anomaly Detection Agent (Agent 7)
 *
 * IMPORTANT: Groq is used ONLY to explain deterministic findings.
 * The anomaly score is computed by the deterministic engine, NOT by Groq.
 */

export const ANOMALY_AGENT_SYSTEM_PROMPT = `You are Agent 7 — the Financial Transaction Anomaly Detection Analyst for FinanceFlow AI, an enterprise lending platform for NBFCs and corporate loan service desks.

## Your Role
You receive a structured JSON payload containing:
- Payment details (amount, date, payer account, sender name, transaction ID)
- Deterministic anomaly check results & numerical evidence ratios
- The final numeric anomaly score and deterministic recommended action (already calculated — you do NOT change this)
- Borrower history, loan balance, expected EMI, and registered accounts

## Your Task
Write a specific, evidence-based, professional explanation and actionable recommendation for the HUMAN REVIEWER:
1. Summarize what was found in plain language citing the exact financial numbers and ratios.
2. Explain WHY each detected anomaly is flagged with evidence (e.g., received account vs registered account, payment amount vs expected EMI / total outstanding balance).
3. Provide a concrete, anomaly-specific recommendation (e.g., "Verify payer account ownership", "Verify duplicate transaction against bank UTR", "Manual verification required before releasing surplus credit").
4. Provide a 1-3 item action checklist for the operations team.

## Critical Boundaries — YOU MUST NEVER:
- Suggest changes to repayment_schedules, paid_amount, or payment_allocations
- Override the deterministic anomaly score or recommended action
- Make final monetary decisions or execute fund movements
- Claim certainty about fraud — only flag for audit/verification

## Output Format (strict JSON)
Return ONLY this JSON with no markdown, no code fences, no preamble:
{
  "explanation": "2-4 sentence evidence-backed explanation citing exact amounts and accounts",
  "recommendation": "1 specific, actionable operational recommendation",
  "action_checklist": [
    "Specific check 1 (e.g. Verify payer account ownership)",
    "Specific check 2 (e.g. Confirm payment authorization for excess amount)"
  ]
}

## Tone
Professional, precise, auditable, and neutral.`;

/**
 * Builds the user prompt for Agent 7 based on payment, check results, evidence, and context.
 */
export const createAnomalyUserPrompt = (payment, checks, scoreBreakdown, anomalyScore, severity, company = null, loan = null, evidence = {}) => {
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

FINANCIAL EVIDENCE CONTEXT:
- Expected Monthly EMI: ${formatAmount(evidence.expected_emi)}
- Total Outstanding Balance: ${formatAmount(evidence.outstanding_balance)}
- Overdue Installments: ${evidence.overdue_installments_count || 0}
- Payment vs EMI Ratio: ${evidence.payment_vs_emi_ratio ? `${evidence.payment_vs_emi_ratio}x` : 'N/A'}
- Payment vs Outstanding Ratio: ${evidence.payment_vs_outstanding_ratio ? `${evidence.payment_vs_outstanding_ratio}x` : 'N/A'}
- Payer Account Received: ${evidence.payer_account || payment.sender_account || 'N/A'}
- Registered Company Account: ${evidence.registered_account || company?.bank_account_number || 'None'}
- Duplicate Matching Payment ID: ${evidence.duplicate_payment_id || 'None'}

DETERMINISTIC CHECK RESULTS:
${detectedTypes || '- No anomalies detected by any check.'}

SCORE BREAKDOWN (computed by deterministic engine):
${breakdownLines || '  (no points assigned)'}
Total Anomaly Score: ${anomalyScore.toFixed(2)} / 100
Severity: ${severity}
Deterministic Recommended Action: ${evidence.recommended_action || 'REVIEW'}

Please provide your JSON explanation, specific recommendation, and action checklist based on the above evidence.`;
};
