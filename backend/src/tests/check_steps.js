import pool from '../config/db.js';

const check = async () => {
  const [rows] = await pool.query(`
    SELECT id, pipeline_id, step_index, agent_name, status, started_at, completed_at, duration_ms
    FROM pipeline_steps
    WHERE pipeline_id = 6000001
    ORDER BY step_index ASC
  `);
  console.log('Pipeline 6000001 steps:');
  console.log(JSON.stringify(rows, null, 2));

  // Fix any interrupted running steps for completed pipelines
  await pool.query(`
    UPDATE pipeline_steps ps
    JOIN pipeline_executions pe ON ps.pipeline_id = pe.id
    SET ps.status = 'completed'
    WHERE pe.status = 'completed' AND ps.status = 'running';
  `);
  console.log('✅ Synchronized any interrupted running steps for completed pipelines.');
  await pool.end();
};

check();
