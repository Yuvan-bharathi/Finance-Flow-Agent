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
    SELECT
      l.id,
      l.company_id,
      l.loan_number,
      l.principal_amount,
      l.interest_rate,
      l.total_payable,
      l.start_date,
      l.end_date,
      l.status,
      l.created_at,
      c.company_name,
      c.registration_number,
      c.contact_name,
      c.contact_email,
      c.bank_account_number,

      COUNT(rs.id) AS total_installments,
      SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS paid_installments,
      SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_installments_count,

      COALESCE(SUM(rs.scheduled_amount), l.total_payable) AS total_scheduled_amount,
      COALESCE(SUM(rs.paid_amount), 0) AS total_paid_amount,
      COALESCE(SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') THEN (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) ELSE 0 END), 0) AS remaining_scheduled_balance,
      COALESCE(SUM(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date < CURDATE() THEN (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) ELSE 0 END), 0) AS overdue_amount,

      COALESCE(MAX(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date < CURDATE() THEN DATEDIFF(CURDATE(), rs.due_date) ELSE 0 END), 0) AS max_days_overdue,
      MIN(CASE WHEN rs.status NOT IN ('paid', 'cancelled') AND rs.due_date >= CURDATE() THEN rs.due_date ELSE NULL END) AS next_due_date

    FROM loans l
    JOIN companies c ON l.company_id = c.id
    LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
  `;
  const params = [];

  if (status) {
    query += ` WHERE l.status = ?`;
    params.push(status);
  }

  query += `
    GROUP BY l.id, c.id, c.company_name, c.registration_number, c.contact_name, c.contact_email, c.bank_account_number
    ORDER BY l.id ASC;
  `;

  const [rows] = await pool.query(query, params);

  // Compute normalized health statuses and progress rates
  return rows.map(r => {
    const totalInst = r.total_installments || 1;
    const paidInst = r.paid_installments || 0;
    const progressPercentage = Math.min(100, Math.round((paidInst / totalInst) * 100));
    const remaining = parseFloat(r.remaining_scheduled_balance || 0);
    const maxOverdue = parseInt(r.max_days_overdue || 0, 10);

    let healthStatus = 'HEALTHY';
    if (remaining <= 0) {
      healthStatus = 'FULLY_RECOVERED';
    } else if (maxOverdue > 30) {
      healthStatus = 'CRITICAL';
    } else if (maxOverdue > 0) {
      healthStatus = 'WATCHLIST';
    }

    return {
      ...r,
      progress_percentage: progressPercentage,
      health_status: healthStatus
    };
  });
};

/**
 * Retrieves loan facility details along with complete amortization repayment schedule and payment matches.
 * 
 * Called by:
 * - loan.service.js (getLoanById)
 * 
 * @param {number} loanId - Loan ID.
 * @returns {Promise<Object|null>} Loan details with `schedules: []`.
 */
export const findLoanById = async (loanId) => {
  const query = `
    SELECT l.*, c.company_name, c.registration_number, c.contact_name, c.contact_email, c.bank_account_number
    FROM loans l
    JOIN companies c ON l.company_id = c.id
    WHERE l.id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.query(query, [loanId]);
  if (rows.length === 0) return null;

  const loan = rows[0];

  // Retrieve amortization schedule with matched payment transactions
  const [schedules] = await pool.query(`
    SELECT
      rs.id,
      rs.loan_id,
      rs.installment_number,
      rs.due_date,
      rs.scheduled_amount,
      rs.principal_amount,
      rs.interest_amount,
      rs.paid_amount,
      (rs.scheduled_amount - COALESCE(rs.paid_amount, 0)) AS remaining_amount,
      rs.status,
      GREATEST(0, DATEDIFF(CURDATE(), rs.due_date)) AS days_overdue,
      p.transaction_id,
      p.payment_date AS matched_payment_date
    FROM repayment_schedules rs
    LEFT JOIN payment_allocations pa ON rs.id = pa.repayment_schedule_id
    LEFT JOIN payments p ON pa.payment_id = p.id
    WHERE rs.loan_id = ?
    ORDER BY rs.installment_number ASC;
  `, [loanId]);

  loan.schedules = schedules;
  return loan;
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
