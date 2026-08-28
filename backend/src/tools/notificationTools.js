import pool from '../config/db.js';

/**
 * Module: Agent 6 — Notification & Escalation Tools
 *
 * Purpose:
 *   Exposes controlled, narrow database functions for the SLA engine and Groq LLM.
 *   The LLM does NOT execute raw SQL — it calls these pre-defined tools only.
 *
 * Actual DB Schema Used:
 *   companies:           id, company_name, contact_name, contact_email (NO risk_level column)
 *   loans:               id, company_id, principal_amount, status ('active'/'completed'/'defaulted'/'cancelled')
 *   repayment_schedules: id, loan_id, due_date, scheduled_amount, paid_amount, status
 *
 * Called by:
 *   - backend/src/agents/notificationAgent.js
 */

// =============================================================================
// SECTION 1: Tool Schema Declarations (Groq Function Calling Specification)
// =============================================================================

export const notificationToolsDeclaration = [
  {
    type: 'function',
    function: {
      name: 'getOverdueLoans',
      description: 'Returns all companies with at least one overdue repayment installment.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'computeSLABreach',
      description: 'Returns the SLA breach detail for a specific company: days overdue and outstanding amount.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'Primary key ID of the company' }
        },
        required: ['companyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCompanyProfile',
      description: 'Returns a company profile including contact info and loan summary.',
      parameters: {
        type: 'object',
        properties: {
          companyId: { type: 'integer', description: 'Primary key ID of the company' }
        },
        required: ['companyId']
      }
    }
  }
];


// =============================================================================
// SECTION 2: Tool Execution Router
// =============================================================================

/**
 * Routes Groq tool calls to the correct database query function.
 *
 * @param {string} toolName - Tool name requested by Groq
 * @param {Object} args     - Arguments from Groq's tool call
 * @returns {Promise<Object>} Tool result to send back to Groq
 */
export const executeNotificationTool = async (toolName, args = {}) => {
  switch (toolName) {
    case 'getOverdueLoans':   return await _getOverdueLoans();
    case 'computeSLABreach':  return await _computeSLABreach(args.companyId);
    case 'getCompanyProfile': return await _getCompanyProfile(args.companyId);
    default: return { error: `Unknown notification tool: ${toolName}` };
  }
};


// =============================================================================
// SECTION 3: Individual Tool Functions
// =============================================================================

/**
 * Tool: getOverdueLoans (also exported for direct use by SLA engine)
 *
 * Purpose:
 *   Finds all companies with at least one overdue repayment installment.
 *   Pure SQL — no AI involved. This is the "detection" step.
 *
 * Schema notes:
 *   - companies has NO risk_level column → removed from SELECT
 *   - repayment_schedules.status = 'overdue' is the primary delinquency indicator
 *   - Use COALESCE on paid_amount since it defaults to 0
 *
 * Returns:
 *   Array of { company_id, company_name, contact_name, contact_email,
 *              loan_id, repayment_id, overdue_days, outstanding_amount }
 */
export const _getOverdueLoans = async () => {
  const [rows] = await pool.query(`
    SELECT
      c.id                                                       AS company_id,
      c.company_name,
      c.contact_name,
      c.contact_email,
      l.id                                                       AS loan_id,
      COUNT(rs.id)                                               AS overdue_installments_count,
      MAX(DATEDIFF(CURDATE(), rs.due_date))                      AS overdue_days,
      SUM(rs.scheduled_amount - COALESCE(rs.paid_amount, 0))    AS outstanding_amount,
      l.principal_amount                                         AS loan_principal
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.due_date < CURDATE()
      AND rs.status NOT IN ('paid', 'cancelled')
      AND (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) > 0
    GROUP BY c.id, c.company_name, c.contact_name, c.contact_email, l.id, l.principal_amount
    ORDER BY outstanding_amount DESC
    LIMIT 20;
  `);
  return rows;
};

/**
 * Tool: computeSLABreach
 *
 * Purpose:
 *   Detailed SLA breach breakdown for a specific company.
 *
 * @param {number} companyId - companies.id primary key
 */
const _computeSLABreach = async (companyId) => {
  const [rows] = await pool.query(`
    SELECT
      rs.id,
      rs.due_date,
      DATEDIFF(CURDATE(), rs.due_date)                           AS days_overdue,
      (rs.scheduled_amount - COALESCE(rs.paid_amount, 0))       AS amount_outstanding,
      rs.installment_number
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    WHERE l.company_id = ?
      AND rs.due_date < CURDATE()
      AND rs.status NOT IN ('paid', 'cancelled')
    ORDER BY rs.due_date ASC
  `, [companyId]);

  const totalOutstanding = rows.reduce((sum, r) => sum + parseFloat(r.amount_outstanding || 0), 0);
  const maxOverdueDays   = rows.length > 0 ? Math.max(...rows.map(r => r.days_overdue)) : 0;

  return {
    company_id:        companyId,
    installment_count: rows.length,
    max_overdue_days:  maxOverdueDays,
    total_outstanding: totalOutstanding,
    installments:      rows
  };
};

/**
 * Tool: getCompanyProfile
 *
 * Purpose:
 *   Fetches the company info and a summary of their loan history.
 *   Helps Groq understand the borrower's overall exposure without risk_level column.
 *
 * @param {number} companyId - companies.id primary key
 */
const _getCompanyProfile = async (companyId) => {
  const [compRows] = await pool.query(`
    SELECT id, company_name, contact_name, contact_email, status
    FROM companies WHERE id = ?
  `, [companyId]);

  if (compRows.length === 0) return { error: 'Company not found' };

  // Loan exposure summary — gives Groq context about total borrowing
  const [loanRows] = await pool.query(`
    SELECT
      COUNT(*)                   AS total_loans,
      SUM(principal_amount)      AS total_principal,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)    AS active_loans,
      SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) AS defaulted_loans
    FROM loans
    WHERE company_id = ?
  `, [companyId]);

  // Payment behavior history
  const [historyRows] = await pool.query(`
    SELECT
      COUNT(*) AS total_installments,
      SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS paid_installments,
      SUM(CASE WHEN rs.status = 'overdue'
               OR (rs.due_date < CURDATE() AND rs.status NOT IN ('paid','cancelled'))
               THEN 1 ELSE 0 END) AS currently_overdue
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    WHERE l.company_id = ?
  `, [companyId]);

  return {
    ...compRows[0],
    loan_summary:    loanRows[0]  || {},
    payment_history: historyRows[0] || {}
  };
};
