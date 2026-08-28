import pool from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Model: Idempotency Key Repository
 * Purpose: Provides MySQL data access methods for managing idempotency locks,
 *          payload verification hashes, and cached response payloads.
 * 
 * Called by:
 * - idempotency.middleware.js
 * 
 * Data flow:
 * Idempotency Middleware ➔ idempotency.model.js ➔ MySQL pool ➔ `idempotency_keys` table
 */

/**
 * Finds an idempotency record by its unique key.
 * 
 * @param {string} idempotencyKey - Unique idempotency string token
 * @returns {Promise<Object|null>} Found record or null
 */
export const findIdempotencyKey = async (idempotencyKey) => {
  const query = `
    SELECT id, idempotency_key, user_id, request_method, request_path,
           request_hash, status, response_status, response_body,
           created_at, updated_at, expires_at
    FROM idempotency_keys
    WHERE idempotency_key = ? AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1;
  `;
  const [rows] = await pool.execute(query, [idempotencyKey]);
  if (rows.length === 0) return null;

  const record = rows[0];
  return {
    ...record,
    response_body: typeof record.response_body === 'string' ? JSON.parse(record.response_body) : record.response_body
  };
};

/**
 * Creates an in-flight processing lock for a new idempotency key.
 * 
 * @param {Object} data - `{ key, userId, method, path, requestHash, ttlHours }`
 * @returns {Promise<number>} Inserted row ID
 */
export const createIdempotencyLock = async ({
  key,
  userId = null,
  method,
  path,
  requestHash,
  ttlHours = 24
}) => {
  const query = `
    INSERT INTO idempotency_keys (
      idempotency_key, user_id, request_method, request_path,
      request_hash, status, expires_at
    ) VALUES (?, ?, ?, ?, ?, 'processing', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? HOUR));
  `;

  const [result] = await pool.execute(query, [
    key,
    userId,
    method,
    path,
    requestHash,
    ttlHours
  ]);

  return result.insertId;
};

/**
 * Completes an idempotency transaction by recording the HTTP status and response payload.
 * 
 * @param {Object} data - `{ key, responseStatus, responseBody }`
 * @returns {Promise<boolean>} True if updated
 */
export const completeIdempotencyKey = async ({ key, responseStatus, responseBody }) => {
  const query = `
    UPDATE idempotency_keys
    SET status = 'completed',
        response_status = ?,
        response_body = ?
    WHERE idempotency_key = ?;
  `;

  const bodyJson = JSON.stringify(responseBody);
  const [result] = await pool.execute(query, [responseStatus, bodyJson, key]);
  return result.affectedRows > 0;
};

/**
 * Marks an idempotency key as failed or purges it, allowing the client to retry with corrected data.
 * 
 * @param {string} key - Idempotency key
 * @returns {Promise<boolean>} True if released
 */
export const releaseIdempotencyLock = async (key) => {
  const query = `DELETE FROM idempotency_keys WHERE idempotency_key = ? AND status = 'processing';`;
  try {
    const [result] = await pool.execute(query, [key]);
    return result.affectedRows > 0;
  } catch (error) {
    logger.error('Failed to release idempotency lock:', error, { key });
    return false;
  }
};

export default {
  findIdempotencyKey,
  createIdempotencyLock,
  completeIdempotencyKey,
  releaseIdempotencyLock
};
