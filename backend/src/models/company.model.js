import pool from '../config/db.js';

/**
 * Model: Company Model / Repository
 * Purpose: Executes MySQL queries for borrowing company records.
 * 
 * Data flow:
 * Controller ➔ Company Service ➔ Company Model ➔ MySQL Pool ➔ `companies` table
 */

/**
 * Retrieves all borrowing companies with optional status filtering.
 * 
 * Called by:
 * - company.service.js (getCompanies)
 * 
 * @param {string|null} status - Optional status filter ('active', 'inactive', 'blacklisted').
 * @returns {Promise<Array>} List of company objects.
 */
export const findAllCompanies = async (status = null) => {
  let query = `
    SELECT id, company_name, registration_number, tax_identifier, bank_account_number, 
           contact_name, contact_email, contact_phone, address, status, created_at, updated_at
    FROM companies
  `;
  const params = [];

  if (status) {
    query += ` WHERE status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC;`;
  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Retrieves a single company by primary key ID along with loan count.
 * 
 * Called by:
 * - company.service.js (getCompanyById)
 * 
 * @param {number} companyId - Primary key ID in `companies` table.
 * @returns {Promise<Object|null>} Company details or null.
 */
export const findCompanyById = async (companyId) => {
  const query = `
    SELECT c.*, COUNT(l.id) AS total_loans
    FROM companies c
    LEFT JOIN loans l ON c.id = l.company_id
    WHERE c.id = ?
    GROUP BY c.id
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [companyId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Inserts a new borrowing company into `companies`.
 * 
 * Called by:
 * - company.service.js (createCompany)
 * 
 * @param {Object} companyData - Object containing company details.
 * @returns {Promise<number>} Inserted company primary key ID.
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
 * 
 * Called by:
 * - company.service.js (updateCompany)
 * 
 * @param {number} companyId - Company ID.
 * @param {Object} companyData - Fields to update.
 * @returns {Promise<boolean>} True if updated.
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
