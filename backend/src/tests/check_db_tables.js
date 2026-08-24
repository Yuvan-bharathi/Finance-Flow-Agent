import pool from '../config/db.js';

async function checkTables() {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    console.log('Tables in DB:', rows.map(r => Object.values(r)[0]));
  } catch (err) {
    console.error('DB check failed:', err.message);
  }
  process.exit(0);
}

checkTables();
