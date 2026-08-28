DROP TABLE IF EXISTS assistant_action_proposals;

CREATE TABLE assistant_action_proposals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    action_type VARCHAR(64) NOT NULL COMMENT 'e.g. FLAG_CASE, TRIGGER_RECONCILIATION, TRIGGER_PIPELINE, ESCALATE_COLLECTION, UPDATE_PRIORITY',
    target_entity_type VARCHAR(64) NOT NULL COMMENT 'reconciliation_case, company, loan, pipeline, document',
    target_id INT UNSIGNED NOT NULL COMMENT 'Primary key of the target entity',
    parameters_payload JSON NOT NULL COMMENT 'Input parameters required to execute the mutation',
    payload_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of parameters and target snapshot at creation',
    proposal_version INT NOT NULL DEFAULT 1 COMMENT 'Optimistic concurrency version number',
    evidence_summary TEXT NOT NULL COMMENT 'Human-readable structured decision evidence bullet points',
    confidence_score INT NOT NULL DEFAULT 90 COMMENT 'Confidence score (0-100) estimated by AI agent',
    status ENUM('pending_confirmation', 'confirmed', 'dismissed', 'expired') NOT NULL DEFAULT 'pending_confirmation',
    expires_at DATETIME NOT NULL COMMENT '5-Minute safety TTL expiration timestamp',
    confirmed_by INT UNSIGNED NULL,
    confirmed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_status (user_id, status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_target_entity (target_entity_type, target_id),
    CONSTRAINT fk_proposal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_proposal_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
