-- =============================================================================
-- FinanceFlow AI — Database Migration (Phase 4: Enterprise Architecture)
-- Purpose: Schema updates for Enterprise Resilience, PBAC, Correlation IDs,
--          Idempotency Locks, and High-Performance Compound Indexing.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: idempotency_keys
-- Purpose: Stores cryptographic hashes and cached HTTP responses for mutating
--          financial operations (approvals, allocations, payments, AI confirmations).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE COMMENT 'Unique client-provided idempotency token (e.g. UUIDv4 or custom key)',
    user_id INT UNSIGNED NULL COMMENT 'User ID who initiated the operation',
    request_method VARCHAR(10) NOT NULL COMMENT 'HTTP verb: POST, PUT, PATCH, DELETE',
    request_path VARCHAR(255) NOT NULL COMMENT 'Express request endpoint path',
    request_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of the request payload to detect tampering',
    status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing' COMMENT 'Status of in-flight execution lock',
    response_status INT NULL COMMENT 'HTTP status code cached upon completion',
    response_body JSON NULL COMMENT 'JSON payload response cached upon completion',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when key was first locked',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL COMMENT 'TTL expiry timestamp after which key is eligible for purge',
    INDEX idx_idempotency_lookup (idempotency_key, status),
    INDEX idx_idempotency_expires (expires_at),
    CONSTRAINT fk_idempotency_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ACID-safe idempotency tracking table preventing duplicate financial execution';

-- -----------------------------------------------------------------------------
-- Table Alterations: Correlation ID Tracking
-- -----------------------------------------------------------------------------
-- Add correlation_id to audit_logs if not already present
SET @col_exists_audit = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'audit_logs' 
    AND COLUMN_NAME = 'correlation_id'
);
SET @sql_audit = IF(@col_exists_audit = 0, 
    'ALTER TABLE audit_logs ADD COLUMN correlation_id VARCHAR(64) NULL AFTER ip_address;', 
    'SELECT "correlation_id already exists in audit_logs";'
);
PREPARE stmt_audit FROM @sql_audit;
EXECUTE stmt_audit;
DEALLOCATE PREPARE stmt_audit;

-- Add correlation_id to agent_runs if not already present
SET @col_exists_agent_runs = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'agent_runs' 
    AND COLUMN_NAME = 'correlation_id'
);
SET @sql_agent_runs = IF(@col_exists_agent_runs = 0, 
    'ALTER TABLE agent_runs ADD COLUMN correlation_id VARCHAR(64) NULL AFTER status;', 
    'SELECT "correlation_id already exists in agent_runs";'
);
PREPARE stmt_agent_runs FROM @sql_agent_runs;
EXECUTE stmt_agent_runs;
DEALLOCATE PREPARE stmt_agent_runs;

-- -----------------------------------------------------------------------------
-- Strategic Compound Performance Indexes (Phase 4)
-- -----------------------------------------------------------------------------
-- 1. Index on audit_logs for correlation_id lookup
SET @idx_audit_corr = (
    SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'audit_logs' 
    AND INDEX_NAME = 'idx_audit_correlation_id'
);
SET @sql_idx_audit = IF(@idx_audit_corr = 0, 
    'CREATE INDEX idx_audit_correlation_id ON audit_logs(correlation_id);', 
    'SELECT "idx_audit_correlation_id already exists";'
);
PREPARE stmt_idx_audit FROM @sql_idx_audit;
EXECUTE stmt_idx_audit;
DEALLOCATE PREPARE stmt_idx_audit;

-- 2. Compound index on payments for status + created_at pagination
SET @idx_pay_status_created = (
    SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND INDEX_NAME = 'idx_payments_status_created'
);
SET @sql_idx_pay = IF(@idx_pay_status_created = 0, 
    'CREATE INDEX idx_payments_status_created ON payments(status, created_at);', 
    'SELECT "idx_payments_status_created already exists";'
);
PREPARE stmt_idx_pay FROM @sql_idx_pay;
EXECUTE stmt_idx_pay;
DEALLOCATE PREPARE stmt_idx_pay;

-- 3. Compound index on reconciliation_cases for status + priority + created_at
SET @idx_case_status_prio = (
    SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'reconciliation_cases' 
    AND INDEX_NAME = 'idx_cases_status_priority_created'
);
SET @sql_idx_case = IF(@idx_case_status_prio = 0, 
    'CREATE INDEX idx_cases_status_priority_created ON reconciliation_cases(status, priority, created_at);', 
    'SELECT "idx_cases_status_priority_created already exists";'
);
PREPARE stmt_idx_case FROM @sql_idx_case;
EXECUTE stmt_idx_case;
DEALLOCATE PREPARE stmt_idx_case;
