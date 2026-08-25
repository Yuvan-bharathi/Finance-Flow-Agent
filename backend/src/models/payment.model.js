import pool from '../config/db.js';
import { parsePagination, buildPaginatedResponse } from '../utils/paginationHelper.js';

/**
 * Model: Payment Model / Repository
 * Purpose: MySQL query execution for raw `payments` bank deposits.
 * 
 * Data flow:
 * Payment Service ➔ Payment Model ➔ MySQL Pool ➔ `payments` table
 */

/**
 * Finds a payment by unique transaction_id reference.
 * 
 * Called by:
 * - payment.service.js (duplicate check)
 * 
 * @param {string} transactionId - External transaction ID string.
 * @returns {Promise<Object|null>} Payment record if exists.
 */
export const findPaymentByTransactionId = async (transactionId) => {
  const query = `
    SELECT * FROM payments 
    WHERE transaction_id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [transactionId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Checks for potential pattern-based duplicate payments (sender + amount + payment_date).
 * 
 * Called by:
 * - payment.service.js (duplicate pattern check)
 * - tool: checkDuplicateTransactions() (Groq AI Agent)
 * 
 * @param {string} senderName - Sender name string.
 * @param {number} amount - Monetary amount.
 * @param {string} paymentDate - Payment date string (YYYY-MM-DD).
 * @returns {Promise<Array>} List of matching historical payments.
 */
export const findPatternDuplicatePayments = async (senderName, amount, paymentDate) => {
  const query = `
    SELECT * FROM payments 
    WHERE sender_name = ? AND amount = ? AND payment_date = ?
    ORDER BY created_at DESC;
  `;
  const [rows] = await pool.execute(query, [senderName, amount, paymentDate]);
  return rows;
};

/**
 * Inserts a raw ingested payment record into `payments` table.
 * 
 * Called by:
 * - payment.service.js (ingestPayment)
 * 
 * @param {Object} paymentData - Payment details object.
 * @param {Object} [connection] - Optional MySQL transaction connection.
 * @returns {Promise<number>} Inserted payment primary key ID.
 */
export const insertPayment = async (paymentData, connection = null) => {
  const executor = connection || pool;
  const {
    transaction_id,
    amount,
    payment_date,
    sender_name = null,
    sender_account = null,
    reference = null,
    source = 'api',
    status = 'unmatched',
    created_by = null
  } = paymentData;

  const query = `
    INSERT INTO payments (
      transaction_id, amount, payment_date, sender_name, sender_account,
      reference, source, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const [result] = await executor.execute(query, [
    transaction_id, amount, payment_date, sender_name, sender_account,
    reference, source, status, created_by
  ]);

  return result.insertId;
};

/**
 * Retrieves payment records with status filtering, search, and pagination.
 * 
 * Called by:
 * - payment.service.js (getPayments)
 * 
 * @param {Object|string|null} filterOrQuery - Status string or req.query object.
 * @returns {Promise<Object|Array>} Paginated envelope or list of payments.
 */
export const findAllPayments = async (filterOrQuery = null) => {
  // If called with a simple string status (legacy), wrap as object
  const query = typeof filterOrQuery === 'string' ? { status: filterOrQuery } : (filterOrQuery || {});

  const { page, limit, offset, sortBy, order } = parsePagination(
    query,
    ['id', 'created_at', 'amount', 'payment_date', 'status', 'sender_name'],
    'created_at'
  );

  let whereClauses = [];
  let params = [];

  if (query.status) {
    whereClauses.push('p.status = ?');
    params.push(query.status);
  }

  if (query.search) {
    whereClauses.push('(p.transaction_id LIKE ? OR p.sender_name LIKE ? OR p.reference LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Total Count Query
  const countQuery = `SELECT COUNT(*) AS total FROM payments p ${whereSql};`;
  const [countRows] = await pool.execute(countQuery, params);
  const totalRecords = countRows[0]?.total || 0;

  // 2. Paginated Data Query
  const dataQuery = `
    SELECT p.*, rc.id AS case_id, rc.status AS case_status
    FROM payments p
    LEFT JOIN reconciliation_cases rc ON p.id = rc.payment_id
    ${whereSql}
    ORDER BY p.${sortBy} ${order}
    LIMIT ? OFFSET ?;
  `;

  const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

  // If client passed specific pagination query params, return envelope; otherwise return array with pagination metadata attached
  const paginatedResult = buildPaginatedResponse(rows, totalRecords, { page, limit });

  if (query.page || query.limit) {
    return paginatedResult;
  }

  // Backwards compatibility: attach pagination object to array
  rows.pagination = paginatedResult.pagination;
  return rows;
};

/**
 * Finds a payment by primary key ID.
 * 
 * Called by:
 * - payment.service.js
 * 
 * @param {number} paymentId - Payment ID.
 * @returns {Promise<Object|null>} Payment details or null.
 */
export const findPaymentById = async (paymentId) => {
  const query = `
    SELECT p.*, rc.id AS case_id, rc.status AS case_status
    FROM payments p
    LEFT JOIN reconciliation_cases rc ON p.id = rc.payment_id
    WHERE p.id = ?
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [paymentId]);
  return rows.length > 0 ? rows[0] : null;
};
