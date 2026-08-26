import pool from '../config/db.js';

const showLoanCols = async () => {
  const [cols] = await pool.query(`DESCRIBE loans;`);
  console.log('loans columns:', cols.map(c => ({ field: c.Field, type: c.Type })));
  await pool.end();
};

showLoanCols();
