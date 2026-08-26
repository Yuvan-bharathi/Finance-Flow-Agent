import pool from '../config/db.js';

const fix = async () => {
  await pool.query(`
    ALTER TABLE pipeline_executions
    MODIFY COLUMN trigger_source VARCHAR(64) NOT NULL DEFAULT 'manual_ui';
  `);
  console.log('✅ Altered pipeline_executions.trigger_source to VARCHAR(64)');
  await pool.end();
};

fix();
