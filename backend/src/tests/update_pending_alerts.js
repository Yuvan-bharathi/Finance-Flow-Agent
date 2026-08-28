import pool from '../config/db.js';

const updatePendingAlerts = async () => {
  try {
    await pool.query(`
      UPDATE notification_alerts 
      SET recommended_recipient = 'Rajesh Kumar <yuvanbharathin@gmail.com>' 
      WHERE company_id = 1;
    `);
    console.log('✓ Updated notification_alerts for Company #1');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

updatePendingAlerts();
