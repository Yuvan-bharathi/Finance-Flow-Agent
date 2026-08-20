import pool from '../config/db.js';

/**
 * Model: Repayment Schedule Model / Repository
 * Purpose: MySQL query execution for `repayment_schedules` expected installments.
 * 
 * Data flow:
 * Loan Service / Repayment Service ➔ Repayment Model ➔ MySQL Pool ➔ `repayment_schedules` table
 */

/**
 * Batch inserts repayment schedule installments for a loan (ACID transaction compatible).
 * 
 * Called by:
 * - loan.service.js (createLoan)
 * 
 * @param {Array<Object>} installments - Array of installment objects `{ loan_id, installment_number, due_date, scheduled_amount, status }`.
 * @param {Object} connection - MySQL transaction connection.
 */
export const insertRepaymentScheduleBatch = async (installments, connection) => {
  const query = `
    INSERT INTO repayment_schedules (
      loan_id, installment_number, due_date, scheduled_amount, paid_amount, status
    ) VALUES (?, ?, ?, ?, 0.00, ?);
  `;

  for (const inst of installments) {
    await connection.execute(query, [
      inst.loan_id,
      inst.installment_number,
      inst.due_date,
      inst.scheduled_amount,
      inst.status || 'pending'
    ]);
  }
};

/**
 * Retrieves repayment schedule installments for a specific loan ID.
 * 
 * Called by:
 * - repayment.service.js (getScheduleByLoanId)
 * - tool: getDueRepayments() (Groq AI Agent)
 * 
 * @param {number} loanId - Loan ID.
 * @returns {Promise<Array>} List of schedule installments.
 */
export const findScheduleByLoanId = async (loanId) => {
  const query = `
    SELECT rs.*, l.loan_number, c.company_name
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.loan_id = ?
    ORDER BY rs.installment_number ASC;
  `;
  const [rows] = await pool.execute(query, [loanId]);
  return rows;
};

/**
 * Retrieves pending or overdue installments for a company or loan.
 * 
 * Called by:
 * - repayment.service.js (getDueInstallments)
 * - tool: getDueRepayments() (Groq AI Agent)
 * 
 * @param {number|null} companyId - Optional company filter.
 * @param {number|null} loanId - Optional loan filter.
 * @returns {Promise<Array>} List of pending/overdue installments.
 */
export const findDueInstallments = async (companyId = null, loanId = null) => {
  let query = `
    SELECT rs.*, l.loan_number, c.id AS company_id, c.company_name
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.status IN ('pending', 'partially_paid', 'overdue')
  `;
  const params = [];

  if (companyId) {
    query += ` AND c.id = ?`;
    params.push(companyId);
  }

  if (loanId) {
    query += ` AND l.id = ?`;
    params.push(loanId);
  }

  query += ` ORDER BY rs.due_date ASC;`;
  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Finds a specific repayment schedule installment by ID.
 * 
 * Called by:
 * - repayment.service.js
 * - reconciliation.service.js
 * 
 * @param {number} scheduleId - Schedule primary key ID.
 * @returns {Promise<Object|null>} Schedule installment object or null.
 */
export const findScheduleById = async (scheduleId) => {
  const query = `
    SELECT rs.*, l.loan_number, l.company_id, c.company_name
    FROM repayment_schedules rs
    JOIN loans l ON rs.loan_id = l.id
    JOIN companies c ON l.company_id = c.id
    WHERE rs.id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [scheduleId]);
  return rows.length > 0 ? rows[0] : null;
};
