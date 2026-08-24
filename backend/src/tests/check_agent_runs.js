import pool from '../config/db.js';

async function checkAgentRuns() {
  const [rows] = await pool.query(`
    SELECT ar.id, ar.case_id, ar.agent_id, ar.status, ar.confidence_score, ar.result_summary, ar.created_at
    FROM agent_runs ar
    ORDER BY ar.id DESC LIMIT 10
  `);
  console.log('Latest Agent Runs:', rows);
  process.exit(0);
}

checkAgentRuns();
