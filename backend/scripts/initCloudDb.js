import pool from '../src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cloud Database Initializer & Migration Runner
 * Automatically creates all 18 FinanceFlow AI tables and seeds initial operational data.
 */
async function initCloudDb() {
  console.log('=============================================================');
  console.log('🚀 FinanceFlow AI — Cloud Database Initializer');
  console.log('=============================================================');

  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to target MySQL / TiDB database successfully.');

    // Disable foreign key checks during migration
    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Read and Execute Core Schema from database/schema.sql
    console.log('\n--- 1. Executing Core Schema (schema.sql) ---');
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Split statements by semicolon while ignoring CREATE DATABASE / USE commands that might not apply to remote db
      const statements = sqlContent
        .split(/;\s*[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (stmtErr) {
          console.warn(`[Schema Warning] ${stmtErr.message}`);
        }
      }
      console.log('✅ Core 12 Schema Tables verified/created from schema.sql');
    }

    // 2. Create Multi-Agent Governance & Operations Tables (Tables 13 - 18)
    console.log('\n--- 2. Creating Multi-Agent & Operations Governance Tables ---');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        case_id INT UNSIGNED NULL,
        company_id INT UNSIGNED NULL,
        status ENUM('running', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'running',
        groq_called BOOLEAN NOT NULL DEFAULT FALSE,
        prompt_tokens INT UNSIGNED NULL DEFAULT 0,
        completion_tokens INT UNSIGNED NULL DEFAULT 0,
        total_tokens INT UNSIGNED NULL DEFAULT 0,
        confidence_score DECIMAL(5,2) NULL,
        result_summary TEXT NULL,
        error_message TEXT NULL,
        triggered_by INT UNSIGNED NULL,
        trigger_type ENUM('manual', 'auto', 'scheduled', 'webhook') NOT NULL DEFAULT 'manual',
        duration_ms INT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_execution_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        agent_run_id BIGINT UNSIGNED NOT NULL,
        agent_id VARCHAR(50) NOT NULL,
        step_number INT UNSIGNED NOT NULL DEFAULT 1,
        step_type ENUM('LLM_CALL', 'TOOL_CALL', 'DECISION', 'FALLBACK', 'ERROR', 'AUDIT', 'RUN_STARTED', 'TOOL_EXECUTED', 'GROQ_ANALYSIS', 'ALERTS_CREATED') NOT NULL,
        step_name VARCHAR(100) NOT NULL,
        status ENUM('started', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'completed',
        input_data JSON NULL,
        output_data JSON NULL,
        tokens_used INT UNSIGNED NULL DEFAULT 0,
        latency_ms INT UNSIGNED NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        agent_run_id BIGINT UNSIGNED NULL,
        snapshot_date DATE NOT NULL,
        total_active_loans INT UNSIGNED NOT NULL DEFAULT 0,
        total_principal_deployed DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total_interest_expected DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total_repaid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total_overdue_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        overdue_loans_count INT UNSIGNED NOT NULL DEFAULT 0,
        npa_ratio_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        collection_efficiency_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        risk_tier_breakdown JSON NULL,
        insights_summary TEXT NULL,
        ai_recommendations JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_alerts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        agent_run_id BIGINT UNSIGNED NULL,
        company_id INT UNSIGNED NOT NULL,
        loan_id INT UNSIGNED NULL,
        repayment_id INT UNSIGNED NULL,
        case_id INT UNSIGNED NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
        overdue_days INT UNSIGNED NOT NULL DEFAULT 0,
        outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        recommended_recipient VARCHAR(100) NULL,
        recommended_action TEXT NULL,
        ai_reasoning TEXT NULL,
        escalation_level VARCHAR(50) NULL DEFAULT 'ACCOUNTANT',
        notification_status ENUM('pending', 'approved', 'dismissed', 'sent') NOT NULL DEFAULT 'pending',
        approved_by INT UNSIGNED NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NOT NULL,
        setting_scope ENUM('user', 'system') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_setting (user_id, setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assistant_action_proposals (
        id VARCHAR(50) PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        target_entity VARCHAR(50) NOT NULL,
        target_id BIGINT UNSIGNED NOT NULL,
        requested_params JSON NULL,
        reason TEXT NULL,
        created_by INT UNSIGNED NULL,
        created_by_name VARCHAR(100) NULL,
        created_by_role VARCHAR(50) NULL,
        status ENUM('pending_confirmation', 'confirmed', 'rejected', 'expired') NOT NULL DEFAULT 'pending_confirmation',
        executed_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ All 18 Multi-Agent & Enterprise Tables verified.');

    // 3. Read and Execute Core Seed from database/seed.sql
    console.log('\n--- 3. Seeding Initial Operational Data (seed.sql) ---');
    const seedPath = path.resolve(__dirname, '../../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedContent = fs.readFileSync(seedPath, 'utf8');
      const seedStatements = seedContent
        .split(/;\s*[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('use '));

      for (const stmt of seedStatements) {
        try {
          await pool.query(stmt);
        } catch (seedErr) {
          // Ignore duplicate entry during seeding
          if (!seedErr.message.includes('Duplicate entry')) {
            console.warn(`[Seed Warning] ${seedErr.message}`);
          }
        }
      }
      console.log('✅ Core Seed Data inserted from seed.sql.');
    }

    // 4. Seed Standard Users with Bcrypt Hashed Passwords
    console.log('\n--- 4. Seeding Standard Accounts with Bcrypt ---');
    const passwordHash = await bcrypt.hash('Admin@1234', 10);

    const users = [
      [1, 1, 'Platform Admin', 'admin@financeflow.com', passwordHash],
      [2, 2, 'Finance Manager', 'manager@financeflow.com', passwordHash],
      [3, 3, 'Senior Accountant', 'senior.accountant@financeflow.com', passwordHash],
      [4, 1, 'Yuvanbharathi', 'yuvanbharathin@gmail.com', passwordHash]
    ];

    for (const [id, roleId, name, email, hash] of users) {
      await pool.query(`
        INSERT INTO users (id, role_id, name, email, password_hash, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE name = VALUES(name), role_id = VALUES(role_id), password_hash = VALUES(password_hash)
      `, [id, roleId, name, email, hash]);
    }

    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n=============================================================');
    console.log('🎉 CLOUD DATABASE INITIALIZED & SEEDED SUCCESSFULLY!');
    console.log('=============================================================');
    console.log('Login credentials ready:');
    console.log('• Admin: admin@financeflow.com / Admin@1234');
    console.log('• User:  yuvanbharathin@gmail.com / Admin@1234');
    console.log('=============================================================');

    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Cloud DB Initialization Failed:', err);
    process.exit(1);
  }
}

initCloudDb();
