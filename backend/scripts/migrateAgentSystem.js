import pool from '../src/config/db.js';

/**
 * Migration Script: Human-Controlled Agent Execution System DDL Migration
 * Updates reconciliation_cases status enum and creates agent_runs & agent_execution_logs tables.
 */
async function runMigration() {
  console.log('🚀 Starting Agentic System Database Migration...');
  const conn = await pool.getConnection();

  try {
    // 1. Alter reconciliation_cases status enum temporarily including 'open' and 'under_review'
    console.log('1️⃣ Updating reconciliation_cases status enum...');
    await conn.query(`
      ALTER TABLE reconciliation_cases 
      MODIFY COLUMN status ENUM(
        'open', 'under_review', 'new', 'ai_queued', 'ai_processing', 
        'pending_review', 'approved', 'rejected', 
        'resolved', 'ai_failed'
      ) NOT NULL DEFAULT 'new';
    `);

    // Update legacy 'open' and 'under_review' status rows to 'new'
    const [updateRes] = await conn.query(`
      UPDATE reconciliation_cases SET status = 'new' WHERE status = 'open' OR status = 'under_review';
    `);
    console.log(`   Updated ${updateRes.affectedRows} legacy case(s) status to 'new'.`);

    // Now finalize enum removing 'open' and 'under_review'
    await conn.query(`
      ALTER TABLE reconciliation_cases 
      MODIFY COLUMN status ENUM(
        'new', 'ai_queued', 'ai_processing', 
        'pending_review', 'approved', 'rejected', 
        'resolved', 'ai_failed'
      ) NOT NULL DEFAULT 'new';
    `);
    console.log('   Finalized reconciliation_cases status ENUM definition.');

    // 2. Create agent_runs table
    console.log('2️⃣ Creating agent_runs table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        case_id INT UNSIGNED NULL,
        triggered_by INT UNSIGNED NULL,
        trigger_type ENUM('manual','bulk_manual','system','retry','scheduled') NOT NULL DEFAULT 'manual',
        status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
        pre_check_result ENUM('clear_match','ambiguous','no_match') NULL,
        groq_called BOOLEAN DEFAULT FALSE,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        duration_ms INT UNSIGNED NULL,
        model VARCHAR(100) NULL,
        input_tokens BIGINT UNSIGNED NULL,
        output_tokens BIGINT UNSIGNED NULL,
        total_tokens BIGINT UNSIGNED NULL,
        tools_called JSON NULL,
        confidence_score DECIMAL(5,2) NULL,
        result_summary TEXT NULL,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_agent_runs_agent (agent_id),
        INDEX idx_agent_runs_case (case_id),
        INDEX idx_agent_runs_status (status),
        CONSTRAINT fk_agent_runs_case
          FOREIGN KEY (case_id) REFERENCES reconciliation_cases(id) ON DELETE SET NULL,
        CONSTRAINT fk_agent_runs_user
          FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   agent_runs table created successfully.');

    // 3. Create agent_execution_logs table
    console.log('3️⃣ Creating agent_execution_logs table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS agent_execution_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        agent_run_id BIGINT UNSIGNED NOT NULL,
        agent_id VARCHAR(50) NOT NULL,
        step_type VARCHAR(50) NOT NULL,
        step_name VARCHAR(100) NOT NULL,
        status ENUM('started','completed','failed','skipped') NOT NULL,
        input_data JSON NULL,
        output_data JSON NULL,
        duration_ms INT UNSIGNED NULL,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_agent_exec_run (agent_run_id),
        INDEX idx_agent_exec_agent (agent_id),
        CONSTRAINT fk_agent_execution_run
          FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   agent_execution_logs table created successfully.');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
