import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  console.log('🚀 Running Phase 7 Migration: 006_phase7_copilot_proposals.sql...');
  
  const migrationPath = path.join(__dirname, '../../database/migrations/006_phase7_copilot_proposals.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split multi-statement SQL by semicolon
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  try {
    const connection = await pool.getConnection();
    try {
      for (const statement of statements) {
        console.log(`📦 Executing statement: ${statement.substring(0, 40)}...`);
        await connection.query(statement);
      }
      console.log('✅ Migration 006 executed successfully!');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Migration 006 failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();
