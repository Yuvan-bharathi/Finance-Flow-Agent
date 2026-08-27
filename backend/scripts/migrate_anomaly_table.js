/**
 * Migration Script: Create payment_anomalies Table
 * 
 * Agent 7 — Financial Transaction Anomaly Detection Agent
 * 
 * Run: node backend/scripts/migrate_anomaly_table.js
 */
import pool from '../src/config/db.js';

const createAnomalyTableSQL = `
  CREATE TABLE IF NOT EXISTS payment_anomalies (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id          INT UNSIGNED NOT NULL,
    case_id             INT UNSIGNED NULL,
    company_id          INT UNSIGNED NULL,
    loan_id             INT UNSIGNED NULL,

    -- Detection Stage
    detection_stage     ENUM('stage_a','stage_b','combined') DEFAULT 'stage_a',

    -- Detection Results
    anomaly_detected    BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_types       JSON NULL,
    anomaly_score       DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    severity            ENUM('CLEAR','LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'CLEAR',

    -- Score Audit Trail (deterministic breakdown)
    deterministic_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    score_breakdown     JSON NULL,

    -- Groq Explanation (separate from score)
    explanation         TEXT NULL,
    recommendation      TEXT NULL,

    -- Outcome
    safe_to_proceed     BOOLEAN NOT NULL DEFAULT TRUE,
    status              ENUM('pending','dismissed','escalated','cleared') DEFAULT 'pending',
    dismiss_reason      VARCHAR(500) NULL,

    -- Human Review
    reviewed_by         INT UNSIGNED NULL,
    reviewed_at         TIMESTAMP NULL,

    -- Agent Metadata
    triggered_by        INT UNSIGNED NULL,
    agent_run_id        INT UNSIGNED NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_payment_id   (payment_id),
    INDEX idx_company_id   (company_id),
    INDEX idx_loan_id      (loan_id),
    INDEX idx_severity     (severity),
    INDEX idx_status       (status),
    INDEX idx_anomaly_detected (anomaly_detected),
    INDEX idx_created_at   (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const run = async () => {
  console.log('🔧 [Migration] Creating payment_anomalies table...');
  try {
    await pool.execute(createAnomalyTableSQL);
    console.log('✅ [Migration] payment_anomalies table created (or already exists).');
    process.exit(0);
  } catch (err) {
    console.error('❌ [Migration] Failed:', err.message);
    process.exit(1);
  }
};

run();
