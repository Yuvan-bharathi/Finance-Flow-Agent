import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration Runner: Phase 5 Multi-Agent Orchestration
 * Purpose: Executes database/migrations/005_phase5_orchestration.sql using connection pool.
 */
async function runPhase5Migration() {
  console.log('[Migration] Starting Phase 5 Multi-Agent Orchestration Migration...');
  try {
    await testConnection();

    // 1. Create pipeline_executions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_executions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pipeline_name VARCHAR(100) NOT NULL,
        trigger_source ENUM('event_webhook', 'manual_ui', 'scheduled_cron', 'api_direct') NOT NULL DEFAULT 'manual_ui',
        triggered_by INT UNSIGNED NULL,
        status ENUM('queued', 'running', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
        context_data JSON NULL COMMENT 'Initial workflow input parameters',
        correlation_id VARCHAR(64) NULL COMMENT 'Distributed tracing token',
        total_tokens INT UNSIGNED NOT NULL DEFAULT 0,
        duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
        error_message TEXT NULL,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pipeline_status (status),
        INDEX idx_pipeline_correlation_id (correlation_id),
        INDEX idx_pipeline_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Migration] ✓ Table `pipeline_executions` verified/created.');

    // 2. Create pipeline_steps table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_steps (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pipeline_id BIGINT UNSIGNED NOT NULL,
        step_index INT UNSIGNED NOT NULL COMMENT 'Sequential step index',
        agent_id INT UNSIGNED NULL,
        agent_name VARCHAR(100) NOT NULL,
        status ENUM('pending', 'running', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
        input_payload JSON NULL,
        output_payload JSON NULL,
        tokens_used INT UNSIGNED NOT NULL DEFAULT 0,
        duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
        error_message TEXT NULL,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_step_pipeline_id (pipeline_id, step_index),
        INDEX idx_step_status (status),
        CONSTRAINT fk_pipeline_steps_parent
            FOREIGN KEY (pipeline_id) REFERENCES pipeline_executions(id)
            ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Migration] ✓ Table `pipeline_steps` verified/created.');

    console.log('[Migration] ✓ Phase 5 Orchestration Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error] Phase 5 migration failed:', error);
    process.exit(1);
  }
}

runPhase5Migration();
