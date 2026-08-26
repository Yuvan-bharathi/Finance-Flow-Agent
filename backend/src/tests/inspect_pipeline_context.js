import pool from '../config/db.js';

const check = async () => {
  const [rows] = await pool.query(`
    SELECT id, pipeline_name, trigger_source, context_data, correlation_id, created_at
    FROM pipeline_executions
    ORDER BY id DESC
    LIMIT 10
  `);
  console.log('Recent pipeline executions:');
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
};

check();
