import pool from '../config/db.js';

/**
 * Model: User Model / Repository
 * Purpose: Executes raw MySQL queries for user authentication, role joins, and user lookup.
 * 
 * Data flow:
 * Controller / Service ➔ User Model methods ➔ MySQL Pool ➔ `users` & `roles` tables
 */

/**
 * Finds a user by their unique email address, joining their security role name.
 * 
 * Called by:
 * - auth.service.js (during login validation)
 * 
 * @param {string} email - User login email address.
 * @returns {Promise<Object|null>} Returns user object with role details if found, or null.
 */
export const findUserByEmail = async (email) => {
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.password_hash,
      u.is_active,
      u.role_id,
      r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = ?
    LIMIT 1;
  `;
  
  const [rows] = await pool.execute(query, [email]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Finds a user by their primary key ID.
 * 
 * Called by:
 * - auth.service.js (get user profile)
 * - auth.middleware.js
 * 
 * @param {number} userId - Primary key ID in `users` table.
 * @returns {Promise<Object|null>} Returns user object without password hash.
 */
export const findUserById = async (userId) => {
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.is_active,
      u.role_id,
      r.name AS role_name,
      u.last_login_at,
      u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
    LIMIT 1;
  `;
  
  const [rows] = await pool.execute(query, [userId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Updates a user's `last_login_at` timestamp.
 * 
 * Called by:
 * - auth.service.js (after successful password verification)
 * 
 * @param {number} userId - Primary key ID in `users` table.
 */
export const updateLastLogin = async (userId) => {
  const query = `
    UPDATE users 
    SET last_login_at = CURRENT_TIMESTAMP 
    WHERE id = ?;
  `;
  await pool.execute(query, [userId]);
};
