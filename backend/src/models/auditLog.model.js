import pool from '../config/db.js';
import { parsePagination, buildPaginatedResponse } from '../utils/paginationHelper.js';

/**
 * Model: Audit Log Model / Repository
 * Purpose: MySQL query execution for immutable compliance logging in `audit_logs` table.
 *          Supports correlation ID distributed tracing and standardized pagination.
 * 
 * Data flow:
 * Settlement Service / Middleware ➔ Audit Model ➔ MySQL Pool ➔ `audit_logs` table
 */

/**
 * Inserts an immutable audit log entry.
 * 
 * Called by:
 * - settlement.service.js (approve, reject, override)
 * - assistantAgent.js (AI action confirmation)
 * 
 * @param {Object} auditData - Object `{ user_id, action, entity_type, entity_id, old_values, new_values, ip_address, correlation_id }`.
 * @param {Object} [connection] - Optional MySQL transaction connection.
 * @returns {Promise<number>} Inserted log ID.
 */
export const insertAuditLog = async (auditData, connection = null) => {
  const executor = connection || pool;
  const {
    user_id = null,
    action,
    entity_type,
    entity_id = null,
    old_values = null,
    new_values = null,
    ip_address = null,
    correlation_id = null
  } = auditData;

  const query = `
    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id, old_values, new_values, ip_address, correlation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const [result] = await executor.execute(query, [
    user_id,
    action,
    entity_type,
    entity_id,
    old_values ? JSON.stringify(old_values) : null,
    new_values ? JSON.stringify(new_values) : null,
    ip_address,
    correlation_id
  ]);

  return result.insertId;
};

/**
 * Retrieves audit log entries with optional action, entity, or correlation ID filters,
 * returning a standardized paginated response envelope.
 * 
 * Called by:
 * - audit.controller.js
 * 
 * @param {Object} queryParams - Express req.query object (`page`, `limit`, `entity_type`, `action`, `correlation_id`).
 * @returns {Promise<Object>} Paginated envelope `{ data: [...], pagination: { ... } }`
 */
export const findAllAuditLogs = async (queryParams = {}) => {
  const { page, limit, offset, sortBy, order } = parsePagination(
    queryParams,
    ['id', 'created_at', 'action', 'entity_type', 'user_id'],
    'created_at'
  );

  let whereClauses = [];
  let params = [];

  if (queryParams.entity_type) {
    whereClauses.push('al.entity_type = ?');
    params.push(queryParams.entity_type);
  }

  if (queryParams.action) {
    whereClauses.push('al.action = ?');
    params.push(queryParams.action);
  }

  if (queryParams.correlation_id) {
    whereClauses.push('al.correlation_id = ?');
    params.push(queryParams.correlation_id);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Total Count Query
  const countQuery = `SELECT COUNT(*) AS total FROM audit_logs al ${whereSql};`;
  const [countRows] = await pool.execute(countQuery, params);
  const totalRecords = countRows[0]?.total || 0;

  // 2. Paginated Data Query
  const dataQuery = `
    SELECT al.*, u.name AS user_name, u.email AS user_email, r.name AS role_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    ${whereSql}
    ORDER BY al.${sortBy} ${order}
    LIMIT ? OFFSET ?;
  `;

  // Note: mysql2 execute requires limit and offset as numbers
  const [rows] = await pool.query(dataQuery, [...params, limit, offset]);

  // Parse JSON values
  const formattedRows = rows.map(row => ({
    ...row,
    old_values: typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values,
    new_values: typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values
  }));

  return buildPaginatedResponse(formattedRows, totalRecords, { page, limit });
};

export default {
  insertAuditLog,
  findAllAuditLogs
};
