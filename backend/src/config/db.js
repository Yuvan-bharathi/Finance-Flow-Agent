import mysql from 'mysql2/promise';
import { config } from './env.js';

/**
 * Module: Database Connection Pool (MySQL)
 * Purpose: Initializes a MySQL pool using mysql2/promise for async/await database operations.
 * 
 * Called by:
 * - Repositories (user.repository.js, company.repository.js, payment.repository.js, etc.)
 * - Business services performing database transactions.
 * 
 * Data flow:
 * MySQL Server (localhost:3306)
 *   ▲
 *   │ (TCP Connection / Connection Pool)
 *   ▼
 * db.js (mysql2 pool)
 *   ▲
 *   │ (SQL Queries & Parameters)
 *   ▼
 * Repositories / Services
 * 
 * Returns: mysql2 PromisePool instance
 */

const poolConfig = config.db.url
  ? {
      uri: config.db.url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      ssl: config.db.ssl || (config.db.url.includes('ssl') ? { rejectUnauthorized: false } : undefined)
    }
  : {
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      port: config.db.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      ssl: config.db.ssl
    };

const pool = mysql.createPool(poolConfig);

/**
 * Function: testConnection
 * Purpose: Verifies database connectivity on application startup.
 * 
 * Called by:
 * - server.js (on server start)
 * 
 * Data flow:
 * Express server startup ➔ testConnection() ➔ pool.getConnection() ➔ MySQL Ping
 * 
 * Returns: {Promise<boolean>} True if connected, throws error if connection fails.
 */
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL database: ${config.db.name}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MySQL database: ${error.message}`);
    throw error;
  }
};

export default pool;
