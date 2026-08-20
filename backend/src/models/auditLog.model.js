import pool from '../config/db.js';

/**
 * Model: Audit Log Model / Repository
 * Purpose: MySQL query execution for immutable compliance logging in `audit_logs` table.
 * 
 * Data flow:
 * Settlement Service / Middleware ➔ Audit Model ➔ MySQL Pool ➔ `audit_logs` table
 */

/**
 * Inserts an immutable audit log entry.
 * 
 * Called by:
 * - settlement.service.js (approve, reject, override)
 * 
 * @param {Object} auditData - Object `{ user_id, action, entity_type, entity_id, old_values, new_values, ip_address }`.
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
    ip_address = null
  } = auditData;

  const query = `
    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id, old_values, new_values, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?);
  `;

  const [result] = await executor.execute(query, [
    user_id,
    action,
    entity_type,
    entity_id,
    old_values ? JSON.stringify(old_values) : null,
    new_values ? JSON.stringify(new_values) : null,
    ip_address
  ]);

  return result.insertId;
};

/**
 * Retrieves audit log entries with optional action or entity filters.
 * 
 * Called by:
 * - audit.controller.js
 * 
 * @param {Object} filters - Optional filters `{ entity_type, action }`.
 * @returns {Promise<Array>} List of audit logs.
 */
export const findAllAuditLogs = async (filters = {}) => {
  let query = `
    SELECT al.*, u.name AS user_name, u.email AS user_email, r.name AS role_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
  `;
  const params = [];

  if (filters.entity_type) {
    query += ` WHERE al.entity_type = ?`;
    params.push(filters.entity_type);
  }

  query += ` ORDER BY al.created_at DESC LIMIT 100;`;
  const [rows] = await pool.execute(query, params);

  // Parse JSON values if returned as string
  return rows.map(row => ({
    ...row,
    old_values: typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values,
    new_values: typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values
  }));
};
