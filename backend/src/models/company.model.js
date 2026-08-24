import pool from '../config/db.js';

/**
 * Model: Company Model / Repository
 * Purpose: Executes MySQL queries for borrowing company records and financial loan aggregations.
 */

/**
 * Retrieves all borrowing companies with real-time loan totals, EMI progress, and monthly installment metrics.
 * 
 * @param {string|null} status - Optional status filter ('active', 'inactive', 'blacklisted').
 * @returns {Promise<Array>} List of company objects with loan and EMI summary stats.
 */
export const findAllCompanies = async (status = null) => {
  let query = `
    SELECT 
      c.id, 
      c.company_name, 
      c.registration_number, 
      c.tax_identifier, 
      c.bank_account_number, 
      c.contact_name, 
      c.contact_email, 
      c.contact_phone, 
      c.address, 
      c.status, 
      c.created_at, 
      c.updated_at,
      COALESCE(loan_agg.total_borrowed, 0) AS total_borrowed,
      COALESCE(loan_agg.total_payable, 0) AS total_payable,
      COALESCE(loan_agg.active_loans_count, 0) AS active_loans_count,
      COALESCE(sched_agg.total_emis, 0) AS total_emis,
      COALESCE(sched_agg.emis_paid, 0) AS emis_paid,
      COALESCE(sched_agg.emis_pending, 0) AS emis_pending,
      COALESCE(sched_agg.monthly_installment, 0) AS monthly_installment,
      COALESCE(sched_agg.total_amount_paid, 0) AS total_amount_paid,
      COALESCE(sched_agg.remaining_balance, 0) AS remaining_balance
    FROM companies c
    LEFT JOIN (
      SELECT 
        company_id,
        SUM(principal_amount) AS total_borrowed,
        SUM(total_payable) AS total_payable,
        COUNT(id) AS active_loans_count
      FROM loans
      GROUP BY company_id
    ) loan_agg ON c.id = loan_agg.company_id
    LEFT JOIN (
      SELECT 
        l.company_id,
        COUNT(rs.id) AS total_emis,
        SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS emis_paid,
        SUM(CASE WHEN rs.status != 'paid' THEN 1 ELSE 0 END) AS emis_pending,
        AVG(rs.scheduled_amount) AS monthly_installment,
        SUM(rs.paid_amount) AS total_amount_paid,
        SUM(rs.scheduled_amount - rs.paid_amount) AS remaining_balance
      FROM loans l
      JOIN repayment_schedules rs ON l.id = rs.loan_id
      GROUP BY l.company_id
    ) sched_agg ON c.id = sched_agg.company_id
  `;
  const params = [];

  if (status) {
    query += ` WHERE c.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY c.id ASC;`;
  const [rows] = await pool.query(query, params);
  return rows;
};

/**
 * Retrieves a single company by primary key ID along with loan list and detailed repayment schedules.
 * 
 * @param {number} companyId - Primary key ID in `companies` table.
 * @returns {Promise<Object|null>} Company details with loan schedules or null.
 */
export const findCompanyById = async (companyId) => {
  const query = `
    SELECT 
      c.*,
      COALESCE(loan_agg.total_borrowed, 0) AS total_borrowed,
      COALESCE(loan_agg.total_payable, 0) AS total_payable,
      COALESCE(loan_agg.active_loans_count, 0) AS active_loans_count,
      COALESCE(sched_agg.total_emis, 0) AS total_emis,
      COALESCE(sched_agg.emis_paid, 0) AS emis_paid,
      COALESCE(sched_agg.emis_pending, 0) AS emis_pending,
      COALESCE(sched_agg.monthly_installment, 0) AS monthly_installment,
      COALESCE(sched_agg.total_amount_paid, 0) AS total_amount_paid,
      COALESCE(sched_agg.remaining_balance, 0) AS remaining_balance
    FROM companies c
    LEFT JOIN (
      SELECT 
        company_id,
        SUM(principal_amount) AS total_borrowed,
        SUM(total_payable) AS total_payable,
        COUNT(id) AS active_loans_count
      FROM loans
      GROUP BY company_id
    ) loan_agg ON c.id = loan_agg.company_id
    LEFT JOIN (
      SELECT 
        l.company_id,
        COUNT(rs.id) AS total_emis,
        SUM(CASE WHEN rs.status = 'paid' THEN 1 ELSE 0 END) AS emis_paid,
        SUM(CASE WHEN rs.status != 'paid' THEN 1 ELSE 0 END) AS emis_pending,
        AVG(rs.scheduled_amount) AS monthly_installment,
        SUM(rs.paid_amount) AS total_amount_paid,
        SUM(rs.scheduled_amount - rs.paid_amount) AS remaining_balance
      FROM loans l
      JOIN repayment_schedules rs ON l.id = rs.loan_id
      GROUP BY l.company_id
    ) sched_agg ON c.id = sched_agg.company_id
    WHERE c.id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.query(query, [companyId]);
  if (rows.length === 0) return null;

  const company = rows[0];

  // Fetch individual loan facilities & schedules
  const [loans] = await pool.query(`
    SELECT 
      l.*,
      (SELECT COUNT(*) FROM repayment_schedules WHERE loan_id = l.id) AS total_emis,
      (SELECT COUNT(*) FROM repayment_schedules WHERE loan_id = l.id AND status = 'paid') AS emis_paid,
      (SELECT COUNT(*) FROM repayment_schedules WHERE loan_id = l.id AND status != 'paid') AS emis_pending,
      (SELECT scheduled_amount FROM repayment_schedules WHERE loan_id = l.id ORDER BY installment_number ASC LIMIT 1) AS monthly_installment,
      (SELECT COALESCE(SUM(paid_amount), 0) FROM repayment_schedules WHERE loan_id = l.id) AS total_amount_paid
    FROM loans l
    WHERE l.company_id = ?
    ORDER BY l.id ASC;
  `, [companyId]);

  company.loans = loans;
  return company;
};

/**
 * Inserts a new borrowing company into `companies`.
 */
export const insertCompany = async (companyData) => {
  const {
    company_name,
    registration_number = null,
    tax_identifier = null,
    bank_account_number = null,
    contact_name = null,
    contact_email = null,
    contact_phone = null,
    address = null,
    status = 'active'
  } = companyData;

  const query = `
    INSERT INTO companies (
      company_name, registration_number, tax_identifier, bank_account_number,
      contact_name, contact_email, contact_phone, address, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const [result] = await pool.execute(query, [
    company_name, registration_number, tax_identifier, bank_account_number,
    contact_name, contact_email, contact_phone, address, status
  ]);

  return result.insertId;
};

/**
 * Updates an existing company's fields.
 */
export const updateCompanyById = async (companyId, companyData) => {
  const {
    company_name,
    registration_number,
    tax_identifier,
    bank_account_number,
    contact_name,
    contact_email,
    contact_phone,
    address,
    status
  } = companyData;

  const query = `
    UPDATE companies
    SET company_name = ?,
        registration_number = ?,
        tax_identifier = ?,
        bank_account_number = ?,
        contact_name = ?,
        contact_email = ?,
        contact_phone = ?,
        address = ?,
        status = ?
    WHERE id = ?;
  `;

  const [result] = await pool.execute(query, [
    company_name, registration_number, tax_identifier, bank_account_number,
    contact_name, contact_email, contact_phone, address, status, companyId
  ]);

  return result.affectedRows > 0;
};
