import pool from '../config/db.js';

const showCols = async () => {
  const [cols] = await pool.query(`DESCRIBE notification_alerts;`);
  console.log('notification_alerts columns:', cols.map(c => ({ field: c.Field, type: c.Type, null: c.Null })));
  await pool.end();
};

showCols();
