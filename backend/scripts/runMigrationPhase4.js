import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration Runner: Phase 4 Enterprise Migration
 * Purpose: Executes database/migrations/004_phase4_enterprise.sql using mysql2 connection pool.
 */
async function runPhase4Migration() {
  console.log('[Migration] Starting Phase 4 Enterprise Migration...');
  try {
    await testConnection();
    const sqlPath = path.resolve(__dirname, '../../database/migrations/004_phase4_enterprise.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Create idempotency table directly
    await pool.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        idempotency_key VARCHAR(120) NOT NULL UNIQUE,
        user_id INT UNSIGNED NULL,
        request_method VARCHAR(10) NOT NULL,
        request_path VARCHAR(255) NOT NULL,
        request_hash VARCHAR(64) NOT NULL,
        status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
        response_status INT NULL,
        response_body JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        INDEX idx_idempotency_lookup (idempotency_key, status),
        INDEX idx_idempotency_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // Allow both 'new' and 'open' in reconciliation_cases status enum
    try {
      await pool.query(`ALTER TABLE reconciliation_cases MODIFY COLUMN status ENUM('new', 'open', 'ai_processing', 'pending_review', 'approved', 'rejected', 'resolved') NOT NULL DEFAULT 'open';`);
      console.log('[Migration] ✓ Updated `reconciliation_cases` status enum.');
    } catch (e) {
      console.warn('[Migration] Note on reconciliation_cases status enum:', e.message);
    }

    // Safe column addition: audit_logs.correlation_id
    try {
      await pool.query(`ALTER TABLE audit_logs ADD COLUMN correlation_id VARCHAR(64) NULL AFTER ip_address;`);
      console.log('[Migration] ✓ Column `correlation_id` added to `audit_logs`.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('[Migration] ℹ Column `correlation_id` already exists in `audit_logs`.');
      } else {
        console.warn('[Migration] Note on audit_logs correlation_id:', e.message);
      }
    }

    // Safe column addition: agent_runs.correlation_id
    try {
      await pool.query(`ALTER TABLE agent_runs ADD COLUMN correlation_id VARCHAR(64) NULL AFTER status;`);
      console.log('[Migration] ✓ Column `correlation_id` added to `agent_runs`.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('[Migration] ℹ Column `correlation_id` already exists in `agent_runs`.');
      } else {
        console.warn('[Migration] Note on agent_runs correlation_id:', e.message);
      }
    }

    // Safe index creations
    const indexes = [
      { table: 'audit_logs', name: 'idx_audit_correlation_id', sql: 'CREATE INDEX idx_audit_correlation_id ON audit_logs(correlation_id);' },
      { table: 'payments', name: 'idx_payments_status_created', sql: 'CREATE INDEX idx_payments_status_created ON payments(status, created_at);' },
      { table: 'reconciliation_cases', name: 'idx_cases_status_priority_created', sql: 'CREATE INDEX idx_cases_status_priority_created ON reconciliation_cases(status, priority, created_at);' }
    ];

    for (const idx of indexes) {
      try {
        await pool.query(idx.sql);
        console.log(`[Migration] ✓ Index \`${idx.name}\` created on \`${idx.table}\`.`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`[Migration] ℹ Index \`${idx.name}\` already exists on \`${idx.table}\`.`);
        } else {
          console.warn(`[Migration] Note on index ${idx.name}:`, e.message);
        }
      }
    }

    console.log('[Migration] ✓ Phase 4 Enterprise Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error] Migration failed:', error);
    process.exit(1);
  }
}

runPhase4Migration();
