-- =============================================================================
-- FinanceFlow AI — Database Seed Data (MySQL 8.0+)
-- =============================================================================

USE financeflow_db;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Seed Roles
-- -----------------------------------------------------------------------------
TRUNCATE TABLE roles;
INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'Full system access and administrative management'),
(2, 'manager', 'Can approve financial actions and review AI recommendations'),
(3, 'accountant', 'Handles daily payment reconciliation and payment operations'),
(4, 'viewer', 'Read-only access to dashboards and reports');

-- -----------------------------------------------------------------------------
-- 2. Seed Users (Default password: Password123!)
-- -----------------------------------------------------------------------------
-- {
--   "email": "admin@financeflow.com",
--   "password": "Password123!"
-- }

TRUNCATE TABLE users;
INSERT INTO users (id, role_id, name, email, password_hash, is_active) VALUES
(1, 1, 'System Admin', 'admin@financeflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE),
(2, 2, 'Finance Manager', 'manager@financeflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE),
(3, 3, 'Senior Accountant', 'accountant@financeflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE),
(4, 4, 'Audit Viewer', 'viewer@financeflow.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE);

-- -----------------------------------------------------------------------------
-- 3. Seed Companies
-- -----------------------------------------------------------------------------
TRUNCATE TABLE companies;
INSERT INTO companies (id, company_name, registration_number, tax_identifier, bank_account_number, contact_name, contact_email, contact_phone, address, status) VALUES
(1, 'ABC Technologies Pvt Ltd', 'REG-2024-ABC100', 'TAX-9988776611', '123456789012', 'Rajesh Kumar', 'finance@abctech.com', '+91 9876543210', 'Tech Park, Sector 5, Bengaluru, India', 'active'),
(2, 'XYZ Industries Ltd', 'REG-2023-XYZ200', 'TAX-9988776622', '987654321098', 'Anita Sharma', 'accounts@xyzind.com', '+91 9876543211', 'Industrial Area, Phase 2, Mumbai, India', 'active'),
(3, 'Global Trading Solutions', 'REG-2025-GTS300', 'TAX-9988776633', '456789012345', 'Suresh Patel', 'pay@globaltrading.com', '+91 9876543212', 'Trade Tower, MG Road, Delhi, India', 'active');

-- -----------------------------------------------------------------------------
-- 4. Seed Loans
-- -----------------------------------------------------------------------------
TRUNCATE TABLE loans;
INSERT INTO loans (id, company_id, loan_number, principal_amount, interest_rate, total_payable, start_date, end_date, status) VALUES
(1, 1, 'LN-2026-001', 1000000.00, 10.00, 1100000.00, '2026-01-01', '2026-11-30', 'active'),
(2, 2, 'LN-2026-002', 2000000.00, 12.00, 2240000.00, '2026-02-01', '2026-12-31', 'active');

-- -----------------------------------------------------------------------------
-- 5. Seed Repayment Schedules
-- -----------------------------------------------------------------------------
TRUNCATE TABLE repayment_schedules;
INSERT INTO repayment_schedules (id, loan_id, installment_number, due_date, scheduled_amount, paid_amount, status) VALUES
-- Loan 1 Installments
(1, 1, 1, '2026-02-05', 100000.00, 100000.00, 'paid'),
(2, 1, 2, '2026-03-05', 100000.00, 100000.00, 'paid'),
(3, 1, 3, '2026-08-05', 100000.00, 0.00, 'pending'),
(4, 1, 4, '2026-09-05', 100000.00, 0.00, 'pending'),

-- Loan 2 Installments
(5, 2, 1, '2026-03-05', 200000.00, 200000.00, 'paid'),
(6, 2, 2, '2026-08-05', 200000.00, 0.00, 'pending');

-- -----------------------------------------------------------------------------
-- 6. Seed Sample Unmatched Payment (for Section 17 & AI Testing)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE payments;
INSERT INTO payments (id, transaction_id, amount, payment_date, sender_name, sender_account, reference, source, status, created_by) VALUES
(1, 'TXN-99001122', 100000.00, '2026-08-05', 'ABC Technologies Pvt Ltd', '123456789012', 'LN-2026-001 AUG REPAYMENT', 'api', 'unmatched', 3);

-- -----------------------------------------------------------------------------
-- 7. Seed Initial Reconciliation Case
-- -----------------------------------------------------------------------------
TRUNCATE TABLE reconciliation_cases;
INSERT INTO reconciliation_cases (id, payment_id, assigned_to, status, priority) VALUES
(1, 1, 3, 'open', 'high');

SET FOREIGN_KEY_CHECKS = 1;
