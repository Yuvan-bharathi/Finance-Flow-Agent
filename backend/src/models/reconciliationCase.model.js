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

  const query = `
    INSERT INTO reconciliation_cases (payment_id, assigned_to, status, priority)
    VALUES (?, ?, ?, ?);
  `;

  const [result] = await executor.execute(query, [payment_id, assigned_to, status, priority]);
  return result.insertId;
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
