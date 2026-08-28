import pool from '../config/db.js';

const testAlerts = async () => {
  const [rows] = await pool.query(`
    SELECT na.id, na.company_id, c.company_name, na.severity, na.overdue_days, na.outstanding_amount,
           na.title, na.recommended_recipient, na.escalation_level, na.notification_status, na.created_at
    FROM notification_alerts na
    JOIN companies c ON na.company_id = c.id
    ORDER BY na.created_at DESC, na.id DESC
    LIMIT 5;
  `);

  console.log('Top 5 Notification Alerts:');
  console.table(rows);
  await pool.end();
};

testAlerts();
