import pool from '../config/db.js';

/**
 * Module: Agent 5 — Portfolio Analytics Tools
 *
 * Purpose:
 *   Exposes controlled, narrow database query functions for the Groq LLM to call.
 *   The LLM cannot execute arbitrary SQL — it can only call these pre-defined functions.
 *
 * Design Decision (Rule 15 — AI Tool Functions Must Be Simple):
 *   Each function does ONE thing: fetch one specific metric set.
 *   This keeps the agent architecture safe, auditable, and understandable.
 *
 * Actual DB Schema Used:
 *   loans:               id, company_id, principal_amount, total_payable, status (active/completed/defaulted/cancelled)
 *   repayment_schedules: id, loan_id, installment_number, due_date, scheduled_amount, paid_amount, status (pending/partially_paid/paid/overdue/cancelled)
 *   companies:           id, company_name, contact_name, contact_email, status
 *
 * Data flow:
 *   Groq LLM → tool request → executePortfolioTool() → SQL query → MySQL → result → Groq
 *
 * Called by:
 *   - backend/src/agents/portfolioAgent.js
 */

// =============================================================================
// SECTION 1: Tool Schema Declarations (Groq Function Calling Specification)
// =============================================================================

export const portfolioToolsDeclaration = [
  {
    type: 'function',
    function: {
      name: 'getPortfolioSummary',
      description: 'Retrieves aggregate portfolio statistics: total principal amount, active loan count, and total payable amount across all active loans.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDelinquencyTrends',
      description: 'Retrieves delinquency data: count of overdue installments, total overdue amount, and breakdown by overdue bucket (1-30 days, 31-60 days, 60+ days).',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCollectionEfficiency',
      description: 'Retrieves payment collection efficiency: percentage of scheduled repayments that have been paid vs still pending/overdue.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getConcentrationRisk',
      description: 'Retrieves borrower concentration risk: the single largest borrower principal as a percentage of total portfolio, and top-3 borrower breakdown.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  }
];


// =============================================================================
// SECTION 2: Tool Execution Router
// =============================================================================

/**
 * Routes a Groq tool call to the correct database query function.
 *
 * @param {string} toolName - Name of the tool Groq requested
 * @param {Object} args - Arguments parsed from Groq's tool call
 * @returns {Promise<Object>} Tool result object returned back to Groq
 */
export const executePortfolioTool = async (toolName, args = {}) => {
  switch (toolName) {
    case 'getPortfolioSummary':       return await _getPortfolioSummary();
    case 'getDelinquencyTrends':      return await _getDelinquencyTrends();
    case 'getCollectionEfficiency':   return await _getCollectionEfficiency();
    case 'getConcentrationRisk':      return await _getConcentrationRisk();
    default: return { error: `Unknown portfolio tool: ${toolName}` };
  }
};


// =============================================================================
// SECTION 3: Individual Tool Functions
// =============================================================================

/**
 * Tool: getPortfolioSummary
 *
 * Purpose:
 *   Retrieves total principal, loan count, and payable amount for active loans.
 *
 * Real column mapping:
 *   loans.principal_amount  = original loan principal disbursed
 *   loans.total_payable     = total amount borrower must repay (principal + interest)
 *   loans.status            = 'active' | 'completed' | 'defaulted' | 'cancelled'
 */
const _getPortfolioSummary = async () => {
  const [rows] = await pool.query(`
    SELECT
      COALESCE(SUM(principal_amount), 0)   AS total_portfolio_value,
      COUNT(*)                              AS active_loan_count,
      COALESCE(SUM(total_payable), 0)       AS total_payable_amount,
      COALESCE(AVG(principal_amount), 0)    AS avg_loan_size
    FROM loans
    WHERE status = 'active'
  `);
  return rows[0] || {};
};

/**
 * Tool: getDelinquencyTrends
 *
 * Purpose:
 *   Counts overdue repayment installments and outstanding amounts.
 *   Buckets by overdue days (1-30, 31-60, 60+).
 *
 * Real column mapping:
 *   repayment_schedules.status = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
 *   A row is delinquent when: status = 'overdue' OR (due_date < TODAY AND status NOT IN ('paid', 'cancelled'))
 */
const _getDelinquencyTrends = async () => {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*)                                                                              AS total_overdue_count,
      COALESCE(SUM(scheduled_amount - paid_amount), 0)                                    AS total_overdue_amount,
      SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1  AND 30  THEN 1 ELSE 0 END)  AS bucket_1_30_days,
      SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60  THEN 1 ELSE 0 END)  AS bucket_31_60_days,
      SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 60                THEN 1 ELSE 0 END)  AS bucket_60_plus_days
    FROM repayment_schedules
    WHERE status = 'overdue'
       OR (due_date < CURDATE() AND status NOT IN ('paid', 'cancelled'))
  `);
  return rows[0] || {};
};

/**
 * Tool: getCollectionEfficiency
 *
 * Purpose:
 *   Calculates what percentage of due installments have been paid.
 *   Collection Efficiency = (paid count / total due count) × 100
 *
 * Note: repayment_schedules has no paid_date column. We use status = 'paid' as the
 *       indicator that payment was completed. On-time vs late distinction is not
 *       available in this schema, so we report paid vs unpaid ratio.
 */
const _getCollectionEfficiency = async () => {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*)                                                          AS total_scheduled,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)                AS total_paid,
      SUM(CASE WHEN status IN ('pending','partially_paid','overdue') AND due_date <= CURDATE() THEN 1 ELSE 0 END) AS total_unpaid_due,
      ROUND(
        100.0 * SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0),
      2) AS collection_efficiency_pct
    FROM repayment_schedules
    WHERE due_date <= CURDATE()
  `);
  return rows[0] || {};
};

/**
 * Tool: getConcentrationRisk
 *
 * Purpose:
 *   Identifies the top 3 borrowers by total principal amount.
 *   Concentration = (largest borrower principal / total portfolio principal) × 100
 *
 * Real column mapping:
 *   loans.principal_amount  — used as the measure of exposure per borrower
 */
const _getConcentrationRisk = async () => {
  const [totalRows] = await pool.query(`
    SELECT COALESCE(SUM(principal_amount), 0) AS grand_total
    FROM loans WHERE status = 'active'
  `);
  const grandTotal = parseFloat(totalRows[0]?.grand_total || 0);

  const [top3] = await pool.query(`
    SELECT
      c.company_name,
      SUM(l.principal_amount) AS total_exposure
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    WHERE l.status = 'active'
    GROUP BY c.id, c.company_name
    ORDER BY total_exposure DESC
    LIMIT 3
  `);

  const top3WithPct = top3.map(r => ({
    name:              r.company_name,
    amount:            parseFloat(r.total_exposure || 0),
    concentration_pct: grandTotal > 0
      ? parseFloat(((r.total_exposure / grandTotal) * 100).toFixed(2))
      : 0
  }));

  return {
    grand_total_portfolio:          grandTotal,
    top_borrower_name:              top3WithPct[0]?.name || 'N/A',
    top_borrower_amount:            top3WithPct[0]?.amount || 0,
    top_borrower_concentration_pct: top3WithPct[0]?.concentration_pct || 0,
    top_3_borrowers:                top3WithPct
  };
};
