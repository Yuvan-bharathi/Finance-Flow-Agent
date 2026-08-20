import pool from '../config/db.js';

/**
 * Model: Loan Model / Repository
 * Purpose: MySQL query execution for loan facilities and loan-repayment queries.
 * 
 * Data flow:
 * Loan Service ➔ Loan Model ➔ MySQL Pool ➔ `loans` & `companies` tables
 */

/**
 * Retrieves all loan facilities with company names.
 * 
 * Called by:
 * - loan.service.js (getLoans)
 * 
 * @param {string|null} status - Optional status filter.
 * @returns {Promise<Array>} List of loans.
 */
export const findAllLoans = async (status = null) => {
  let query = `
    SELECT l.*, c.company_name, c.bank_account_number
    FROM loans l
    JOIN companies c ON l.company_id = c.id
  `;
  const params = [];

  if (status) {
    query += ` WHERE l.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY l.created_at DESC;`;
  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Retrieves loan facility details by loan ID.
 * 
 * Called by:
 * - loan.service.js (getLoanById)
 * 
 * @param {number} loanId - Loan ID.
 * @returns {Promise<Object|null>} Loan details object.
 */
export const findLoanById = async (loanId) => {
  const query = `
    SELECT l.*, c.company_name, c.registration_number, c.bank_account_number
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    WHERE l.id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [loanId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Retrieves active loans belonging to a company.
 * 
 * Called by:
 * - loan.service.js
 * - tool: getActiveLoans() (for Groq AI agent)
 * 
 * @param {number} companyId - Company ID.
 * @returns {Promise<Array>} List of active loans.
 */
export const findActiveLoansByCompanyId = async (companyId) => {
  const query = `
    SELECT l.*, c.company_name
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    WHERE l.company_id = ? AND l.status = 'active'
    ORDER BY l.start_date ASC;
  `;
  const [rows] = await pool.execute(query, [companyId]);
  return rows;
};

/**
 * Inserts a new loan record into `loans`.
 * 
 * Called by:
 * - loan.service.js (createLoan)
 * 
 * @param {Object} loanData - Object containing loan fields.
 * @param {Object} [connection] - Optional MySQL transaction connection.
 * @returns {Promise<number>} Inserted loan primary key ID.
 */
export const insertLoan = async (loanData, connection = null) => {
  const executor = connection || pool;
  const {
    company_id,
    loan_number,
    principal_amount,
    interest_rate,
    total_payable,
    start_date,
    end_date = null,
    status = 'active'
  } = loanData;

  const query = `
    INSERT INTO loans (
      company_id, loan_number, principal_amount, interest_rate,
      total_payable, start_date, end_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const [result] = await executor.execute(query, [
    company_id, loan_number, principal_amount, interest_rate,
    total_payable, start_date, end_date, status
  ]);

  return result.insertId;
};
