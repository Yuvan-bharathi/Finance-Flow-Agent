import pool from '../config/db.js';

const showTables = async () => {
  const [rows] = await pool.query(`SHOW TABLES;`);
  console.log('Tables in financeflow_db:', rows.map(r => Object.values(r)[0]));
  await pool.end();
};

showTables();
