import pool from '../config/db.js';

/**
 * Model: Reconciliation Case Model / Repository
 * Purpose: MySQL query execution for `reconciliation_cases` investigation containers.
 * 
 * Data flow:
 * Payment Service / Reconciliation Service ➔ Case Model ➔ MySQL Pool ➔ `reconciliation_cases` table
 */

/**
 * Inserts a new reconciliation case record.
 * 
 * Called by:
 * - payment.service.js (ingestPayment)
 * 
 * @param {Object} caseData - Object `{ payment_id, assigned_to, status, priority }`.
 * @param {Object} [connection] - Optional MySQL transaction connection.
 * @returns {Promise<number>} Inserted case primary key ID.
 */
export const insertReconciliationCase = async (caseData, connection = null) => {
  const executor = connection || pool;
  const {
    payment_id,
    assigned_to = null,
    status = 'new',
    priority = 'medium'
  } = caseData;

  // Explicitly compute next sequential ID to avoid distributed serverless jumps
  const [maxRows] = await executor.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM reconciliation_cases;`);
  const nextId = (maxRows[0]?.max_id || 0) + 1;

  const query = `
    INSERT INTO reconciliation_cases (id, payment_id, assigned_to, status, priority, created_at)
    VALUES (?, ?, ?, ?, ?, NOW());
  `;

  await executor.execute(query, [nextId, payment_id, assigned_to, status, priority]);
  return nextId;
};

/**
 * Finds a reconciliation case by case ID or payment ID.
 * 
 * Called by:
 * - reconciliation.service.js
 * 
 * @param {number} caseId - Case ID.
 * @returns {Promise<Object|null>} Case details object or null.
 */
export const findCaseById = async (caseId) => {
  const query = `
    SELECT rc.*, p.transaction_id, p.amount, p.payment_date, p.sender_name, p.sender_account, p.reference, p.status AS payment_status, u.name AS assigned_accountant_name
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id
    LEFT JOIN users u ON rc.assigned_to = u.id
    WHERE rc.id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [caseId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Retrieves all pending/new reconciliation cases needing AI analysis with their payment and matched company info.
 * Displays newest at the top.
 */
export const findOpenCases = async (limit = 50) => {
  const query = `
    SELECT rc.id, rc.status, rc.priority, rc.created_at,
           p.id as payment_id, p.transaction_id, p.amount, p.payment_date, p.sender_name, p.sender_account, p.reference,
           COALESCE(
             (SELECT c.company_name FROM companies c WHERE p.sender_name = c.company_name OR p.sender_name LIKE CONCAT('%', c.company_name, '%') LIMIT 1),
             p.sender_name
           ) as company_name,
           (SELECT c.id FROM companies c WHERE p.sender_name = c.company_name OR p.sender_name LIKE CONCAT('%', c.company_name, '%') LIMIT 1) as company_id
    FROM reconciliation_cases rc
    JOIN payments p ON rc.payment_id = p.id
    WHERE rc.status IN ('new', 'open')
      AND (SELECT COUNT(*) FROM ai_recommendations ar WHERE ar.reconciliation_case_id = rc.id) = 0
    ORDER BY rc.created_at DESC, rc.id DESC
    LIMIT ?;
  `;
  const [rows] = await pool.query(query, [limit]);
  return rows;
};
