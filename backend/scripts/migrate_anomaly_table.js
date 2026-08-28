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

    -- Specific Recommendation & Action Layer
    recommended_action  ENUM('NO_ACTION','REVIEW','VERIFY_PAYER','VERIFY_DUPLICATE','VERIFY_AMOUNT','ESCALATE') DEFAULT 'NO_ACTION',
    safe_to_allocate    BOOLEAN NOT NULL DEFAULT TRUE,
    requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
    evidence            JSON NULL,

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
    INDEX idx_recommended_action (recommended_action),
    INDEX idx_created_at   (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const run = async () => {
  try {
    console.log('🔄 Running payment_anomalies table migration...');
    await pool.query(createAnomalyTableSQL);

    // Add new columns to existing table if missing
    const columns = [
      { name: 'recommended_action', sql: `ALTER TABLE payment_anomalies ADD COLUMN recommended_action ENUM('NO_ACTION','REVIEW','VERIFY_PAYER','VERIFY_DUPLICATE','VERIFY_AMOUNT','ESCALATE') DEFAULT 'NO_ACTION' AFTER recommendation` },
      { name: 'safe_to_allocate',   sql: `ALTER TABLE payment_anomalies ADD COLUMN safe_to_allocate BOOLEAN NOT NULL DEFAULT TRUE AFTER recommended_action` },
      { name: 'requires_manual_review', sql: `ALTER TABLE payment_anomalies ADD COLUMN requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE AFTER safe_to_allocate` },
      { name: 'evidence',           sql: `ALTER TABLE payment_anomalies ADD COLUMN evidence JSON NULL AFTER requires_manual_review` },
      { name: 'case_id',            sql: `ALTER TABLE payment_anomalies ADD COLUMN case_id INT UNSIGNED NULL AFTER payment_id` }
    ];

    for (const col of columns) {
      try {
        await pool.query(col.sql);
        console.log(`  + Column '${col.name}' added.`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          // already exists
        } else {
          console.warn(`  - Column '${col.name}' notice:`, err.message);
        }
      }
    }

    console.log('✅ payment_anomalies table migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

run();
