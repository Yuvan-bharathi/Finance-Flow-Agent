import pool from '../config/db.js';

async function checkAllAgentRuns() {
  const [rows] = await pool.query('SELECT id, agent_id, agent_name, case_id, status, confidence_score, result_summary FROM agent_runs ORDER BY id DESC');
  console.log('All agent runs in DB:', rows);
  process.exit(0);
}

checkAllAgentRuns();
