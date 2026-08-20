-- =============================================================================
-- FinanceFlow AI — Database DDL Schema (MySQL 8.0+)
-- Architecture Status: FROZEN (12 Tables)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS financeflow_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE financeflow_db;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Table 1: roles
-- Purpose: System security access control roles (admin, manager, accountant, viewer).
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 2: users
-- Purpose: System accounts, bcrypt hashed passwords, role assignments, auth.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 3: companies
-- Purpose: Corporate borrowers master data.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS companies;
CREATE TABLE companies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(100) NULL UNIQUE,
    tax_identifier VARCHAR(100) NULL UNIQUE,
    bank_account_number VARCHAR(100) NULL,
    contact_name VARCHAR(100) NULL,
    contact_email VARCHAR(150) NULL,
    contact_phone VARCHAR(30) NULL,
    address TEXT NULL,
    status ENUM('active', 'inactive', 'blacklisted') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 4: loans
-- Purpose: Loan facilities issued to companies.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS loans;
CREATE TABLE loans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id INT UNSIGNED NOT NULL,
    loan_number VARCHAR(50) NOT NULL UNIQUE,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    total_payable DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('active', 'completed', 'defaulted', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loans_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 5: repayment_schedules
-- Purpose: Expected installment schedule per loan facility.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS repayment_schedules;
CREATE TABLE repayment_schedules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id INT UNSIGNED NOT NULL,
    installment_number INT UNSIGNED NOT NULL,
    due_date DATE NOT NULL,
    scheduled_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'partially_paid', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_loan
        FOREIGN KEY (loan_id) REFERENCES loans(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT unique_loan_installment
        UNIQUE (loan_id, installment_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 6: payments
-- Purpose: Actual incoming bank deposits (decoupled raw payments).
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    sender_name VARCHAR(150) NULL,
    sender_account VARCHAR(100) NULL,
    reference VARCHAR(255) NULL,
    source ENUM('api', 'manual', 'bank_import', 'excel_upload') NOT NULL DEFAULT 'api',
    status ENUM('unmatched', 'processing', 'pending', 'completed', 'rejected', 'duplicate') NOT NULL DEFAULT 'unmatched',
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 7: reconciliation_cases
-- Purpose: Investigation cases opened per payment.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS reconciliation_cases;
CREATE TABLE reconciliation_cases (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id INT UNSIGNED NOT NULL,
    assigned_to INT UNSIGNED NULL,
    status ENUM('open', 'ai_processing', 'pending_review', 'approved', 'rejected', 'resolved') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    resolution_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_case_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_case_assigned
        FOREIGN KEY (assigned_to) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 8: ai_recommendations
-- Purpose: Candidate matches generated by Groq Payment Reconciliation Agent.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS ai_recommendations;
CREATE TABLE ai_recommendations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reconciliation_case_id INT UNSIGNED NOT NULL,
    recommended_company_id INT UNSIGNED NULL,
    recommended_loan_id INT UNSIGNED NULL,
    recommended_schedule_id INT UNSIGNED NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    reasoning TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'overridden') NOT NULL DEFAULT 'pending',
    reviewed_by INT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    review_comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_case
        FOREIGN KEY (reconciliation_case_id) REFERENCES reconciliation_cases(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ai_company
        FOREIGN KEY (recommended_company_id) REFERENCES companies(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ai_loan
        FOREIGN KEY (recommended_loan_id) REFERENCES loans(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ai_schedule
        FOREIGN KEY (recommended_schedule_id) REFERENCES repayment_schedules(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_ai_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 9: payment_allocations
-- Purpose: Official financial ledger allocations created ONLY upon human approval.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS payment_allocations;
CREATE TABLE payment_allocations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id INT UNSIGNED NOT NULL,
    repayment_schedule_id INT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    approved_by INT UNSIGNED NOT NULL,
    allocation_type ENUM('ai_approved', 'manual', 'ai_overridden', 'overpayment') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alloc_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_alloc_schedule
        FOREIGN KEY (repayment_schedule_id) REFERENCES repayment_schedules(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_alloc_approver
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 10: documents
-- Purpose: File metadata for loan agreements, proofs, bank statements.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id INT UNSIGNED NULL,
    payment_id INT UNSIGNED NULL,
    document_type ENUM('bank_statement', 'payment_proof', 'invoice', 'loan_agreement', 'company_document', 'other') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    storage_provider ENUM('local', 's3', 'gcs') NOT NULL DEFAULT 'local',
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_doc_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_doc_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_doc_approver
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 11: audit_logs
-- Purpose: Immutable compliance log tracking WHO, WHAT, WHEN, BEFORE & AFTER state.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 12: notifications
-- Purpose: User alert and task queue system.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id BIGINT UNSIGNED NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    CONSTRAINT fk_notif_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Strategic B-Tree Performance Indexes
-- =============================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

CREATE INDEX idx_companies_name ON companies(company_name);
CREATE INDEX idx_companies_reg ON companies(registration_number);
CREATE INDEX idx_companies_bank ON companies(bank_account_number);

CREATE INDEX idx_loans_company ON loans(company_id);
CREATE INDEX idx_loans_status ON loans(status);

CREATE INDEX idx_schedule_loan_status ON repayment_schedules(loan_id, status);
CREATE INDEX idx_schedule_due_date ON repayment_schedules(due_date);

CREATE INDEX idx_payments_status_date ON payments(status, payment_date);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_sender ON payments(sender_name);

CREATE INDEX idx_cases_payment ON reconciliation_cases(payment_id);
CREATE INDEX idx_cases_assigned ON reconciliation_cases(assigned_to);

CREATE INDEX idx_ai_rec_case ON ai_recommendations(reconciliation_case_id);
CREATE INDEX idx_ai_rec_status ON ai_recommendations(status);

CREATE INDEX idx_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_alloc_schedule ON payment_allocations(repayment_schedule_id);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
