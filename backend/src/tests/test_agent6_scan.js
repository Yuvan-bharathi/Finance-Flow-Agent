import pool from '../config/db.js';
import { runNotificationAgent } from '../agents/notificationAgent.js';

const test = async () => {
  console.log('🧪 Testing Agent 6 Escalation Scan with Consolidated Company Grouping...');
  const res = await runNotificationAgent(1);
  console.log('Scan result:', res);

  const [logs] = await pool.query(`
    SELECT step_type, step_name, output_data
    FROM agent_execution_logs
    ORDER BY id DESC
    LIMIT 5;
  `);
  console.log('Latest step execution logs:');
  console.log(JSON.stringify(logs, null, 2));

  await pool.end();
};

test();
