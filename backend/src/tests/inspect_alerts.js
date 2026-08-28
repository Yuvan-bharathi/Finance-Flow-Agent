import pool from '../config/db.js';

const inspectAlerts = async () => {
  try {
    const [alerts] = await pool.query(`
      SELECT id, company_id, severity, overdue_days, outstanding_amount, 
             title, recommended_recipient, notification_status, created_at
      FROM notification_alerts 
      ORDER BY id DESC 
      LIMIT 10;
    `);
    console.table(alerts);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

inspectAlerts();
