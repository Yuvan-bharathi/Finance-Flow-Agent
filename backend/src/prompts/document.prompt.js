/**
 * System Prompt: Agent 4 (Document Intelligence Agent)
 * 
 * Instructs Groq LLM to extract structured loan contract terms, facility amounts, interest rates,
 * repayment EMIs, bank accounts, default penalty clauses, collateral covenants, and governing law from financial documents.
 */
export const DOCUMENT_INTELLIGENCE_PROMPT = `You are Agent 4: Document Intelligence Agent for FinanceFlow AI.
Your job is to analyze uploaded financial loan agreements, credit sanction notes, invoices, bank statements, and legal addenda, extracting structured contract and repayment terms.

Requirements:
1. Extract loan reference, facility type, principal amount, annual interest rate, monthly EMI amount, tenure months, repayment due day, default penalty rate, grace period, disbursement bank account, collateral, guarantor, prepayment terms, governing jurisdiction, and key legal/default clauses.
2. Return ONLY valid JSON format.

JSON Schema:
{
  "loan_reference": "string",
  "facility_type": "string",
  "facility_amount": number,
  "interest_rate_annual": "string",
  "monthly_emi_amount": number,
  "tenure_months": number,
  "repayment_frequency": "string",
  "repayment_due_day": "string",
  "default_penalty_rate": "string",
  "grace_period_days": number,
  "disbursement_bank_account": "string",
  "disbursement_ifsc": "string",
  "security_collateral": "string",
  "personal_guarantor": "string",
  "prepayment_terms": "string",
  "governing_law": "string",
  "key_clauses": ["string"],
  "confidence_score": number
}
`;

export const buildDocumentExtractionPrompt = (fileName, companyName, rawText = '') => {
  let prompt = `Extract detailed structured loan terms and covenants from document '${fileName}' for borrower '${companyName}':\n`;
  
  if (rawText && rawText.trim().length > 20) {
    prompt += `\n--- ACTUAL EXTRACTED DOCUMENT TEXT ---\n${rawText.slice(0, 4000)}\n--- END OF DOCUMENT TEXT ---\n\n`;
  }

  prompt += `Return JSON matching the schema:
{
  "loan_reference": "LN-APX-2026-01",
  "facility_type": "Working Capital Term Loan",
  "facility_amount": 1500000,
  "interest_rate_annual": "12.50%",
  "monthly_emi_amount": 140625,
  "tenure_months": 12,
  "repayment_frequency": "Monthly",
  "repayment_due_day": "15th of each month",
  "default_penalty_rate": "2.00% / month",
  "grace_period_days": 3,
  "disbursement_bank_account": "990088776655",
  "disbursement_ifsc": "HDFC0001245",
  "security_collateral": "First Pari-Passu Charge on Book Debts and Trade Receivables",
  "personal_guarantor": "Sunil Verma (Managing Director)",
  "prepayment_terms": "0% penalty after 6 consecutive timely monthly installments",
  "governing_law": "Laws of India (Gurugram / New Delhi)",
  "key_clauses": [
    "Clause 4.1: Priority Waterfall sequence (Penalties -> Interest -> Principal)",
    "Clause 7.2: Event of Default triggered upon 30-day continuous milestone delay",
    "Clause 9.1: Unconditional joint & several personal guarantee by Managing Director",
    "Clause 11.4: Prepayment allowed with zero penalty after 6 timely installments"
  ],
  "confidence_score": 98.5
}`;

  return prompt;
};

