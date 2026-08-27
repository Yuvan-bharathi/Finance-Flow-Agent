import pool from '../config/db.js';

/**
 * Tools: Anomaly Detection Agent Data Retrieval Layer (Agent 7)
 *
 * All functions are READ-ONLY. No financial data is modified here.
 * Agent 7 never writes to repayment_schedules, payment_allocations, or payments.
 */

/**
 * Fetch last N payments for a company+loan to establish behavioral baseline.
 * Used for: timing deviation + partial payment pattern detection.
 */
export const getPaymentHistory = async (companyId, loanId, limit = 8) => {
  const [rows] = await pool.query(
    `SELECT
       p.id,
       p.amount,
       p.payment_date,
       p.sender_account,
       p.transaction_id,
       p.status,
       DAYOFMONTH(p.payment_date) AS day_of_month
     FROM payments p
     LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
     LEFT JOIN ai_recommendations ar ON ar.reconciliation_case_id = rc.id
     WHERE (ar.recommended_company_id = ? OR p.sender_name IN (SELECT company_name FROM companies WHERE id = ?))
       AND (? IS NULL OR ar.recommended_loan_id = ?)
       AND p.status IN ('matched','approved','partially_matched')
     ORDER BY p.payment_date DESC
     LIMIT ?`,
    [companyId, companyId, loanId, loanId, limit]
  );
  return rows;
};

/**
 * Get the expected EMI amount from the next pending installment.
 * Used for: amount deviation scoring.
 */
export const getExpectedEMI = async (loanId) => {
  if (!loanId) return null;
  const [rows] = await pool.query(
    `SELECT
       rs.id,
       rs.installment_number,
       rs.scheduled_amount,
       rs.due_date,
       rs.status,
       rs.paid_amount
     FROM repayment_schedules rs
     WHERE rs.loan_id = ?
       AND rs.status IN ('pending','overdue','partially_paid')
     ORDER BY rs.due_date ASC
     LIMIT 1`,
    [loanId]
  );
  return rows[0] || null;
};

/**
 * Get total outstanding balance (sum of all unpaid scheduled amounts) for a loan.
 * Used for: overpayment detection + smart amount anomaly (not just single EMI).
 */
export const getTotalOutstandingBalance = async (loanId) => {
  if (!loanId) return { total_outstanding: 0, overdue_count: 0 };
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(rs.scheduled_amount - rs.paid_amount), 0) AS total_outstanding,
       COUNT(*) AS overdue_count
     FROM repayment_schedules rs
     WHERE rs.loan_id = ?
       AND rs.status IN ('pending','overdue','partially_paid')`,
    [loanId]
  );
  return {
    total_outstanding: parseFloat(rows[0]?.total_outstanding || 0),
    overdue_count: parseInt(rows[0]?.overdue_count || 0, 10)
  };
};

/**
 * Check for duplicate payment fingerprints within ±1 day window.
 * Used for: duplicate payment detection.
 */
export const checkDuplicateFingerprint = async (amount, companyId, loanId, paymentDate, excludePaymentId = null) => {
  const [rows] = await pool.query(
    `SELECT
       p.id,
       p.transaction_id,
       p.amount,
       p.payment_date,
       p.sender_account,
       p.status
     FROM payments p
     LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
     LEFT JOIN ai_recommendations ar ON ar.reconciliation_case_id = rc.id
     WHERE ABS(p.amount - ?) < 1
       AND ABS(DATEDIFF(p.payment_date, ?)) <= 1
       AND (? IS NULL OR p.id != ?)
       AND (
         (? IS NOT NULL AND (ar.recommended_company_id = ? OR p.sender_name IN (SELECT company_name FROM companies WHERE id = ?)))
         OR (? IS NULL)
       )
       AND p.status NOT IN ('rejected','cancelled')
     LIMIT 5`,
    [amount, paymentDate, excludePaymentId, excludePaymentId, companyId, companyId, companyId, companyId]
  );
  return rows;
};

/**
 * Retrieve all registered bank account numbers for a company.
 * Used for: unknown payer account detection.
 */
export const getKnownPayerAccounts = async (companyId) => {
  if (!companyId) return [];
  const [rows] = await pool.query(
    `SELECT bank_account_number FROM companies WHERE id = ? AND bank_account_number IS NOT NULL`,
    [companyId]
  );
  return rows.map(r => String(r.bank_account_number).trim()).filter(Boolean);
};

/**
 * Fetch the payment record with enriched join data for full anomaly context.
 */
export const getPaymentWithContext = async (paymentId) => {
  const [rows] = await pool.query(
    `SELECT
       p.*,
       rc.id AS case_id,
       COALESCE(ar.recommended_company_id, l.company_id, c_direct.id) AS company_id,
       COALESCE(c_rec.company_name, c_loan.company_name, c_direct.company_name, p.sender_name) AS company_name,
       COALESCE(c_rec.bank_account_number, c_loan.bank_account_number, c_direct.bank_account_number) AS registered_account,
       COALESCE(ar.recommended_loan_id, l.id) AS loan_id,
       COALESCE(l_rec.loan_number, l.loan_number) AS loan_number,
       COALESCE(l_rec.principal_amount, l.principal_amount) AS principal_amount,
       COALESCE(l_rec.status, l.status) AS loan_status
     FROM payments p
     LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
     LEFT JOIN ai_recommendations ar ON ar.reconciliation_case_id = rc.id
     LEFT JOIN companies c_rec ON c_rec.id = ar.recommended_company_id
     LEFT JOIN loans l_rec ON l_rec.id = ar.recommended_loan_id
     LEFT JOIN companies c_direct ON (p.sender_account IS NOT NULL AND c_direct.bank_account_number = p.sender_account) OR (p.sender_name IS NOT NULL AND c_direct.company_name = p.sender_name)
     LEFT JOIN loans l ON l.company_id = c_direct.id
     LEFT JOIN companies c_loan ON c_loan.id = l.company_id
     WHERE p.id = ?
     ORDER BY ar.id DESC, l.id ASC
     LIMIT 1`,
    [paymentId]
  );
  return rows[0] || null;
};

/**
 * Fetch company details for payer account comparison (pre-match stage A, by account number).
 */
export const getCompanyByAccount = async (accountNumber) => {
  if (!accountNumber) return null;
  const [rows] = await pool.query(
    `SELECT id, company_name, bank_account_number FROM companies WHERE bank_account_number = ? LIMIT 1`,
    [String(accountNumber).trim()]
  );
  return rows[0] || null;
};

/**
 * Execute a named anomaly tool by key.
 */
export const executeAnomalyTool = async (toolName, args = {}) => {
  switch (toolName) {
    case 'getPaymentHistory':
      return getPaymentHistory(args.companyId, args.loanId, args.limit);
    case 'getExpectedEMI':
      return getExpectedEMI(args.loanId);
    case 'getTotalOutstandingBalance':
      return getTotalOutstandingBalance(args.loanId);
    case 'checkDuplicateFingerprint':
      return checkDuplicateFingerprint(args.amount, args.companyId, args.loanId, args.paymentDate, args.excludePaymentId);
    case 'getKnownPayerAccounts':
      return getKnownPayerAccounts(args.companyId);
    case 'getPaymentWithContext':
      return getPaymentWithContext(args.paymentId);
    case 'getCompanyByAccount':
      return getCompanyByAccount(args.accountNumber);
    default:
      throw new Error(`[AnomalyTools] Unknown tool: ${toolName}`);
  }
};
