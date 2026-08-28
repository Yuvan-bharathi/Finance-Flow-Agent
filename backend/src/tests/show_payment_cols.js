import pool from '../config/db.js';

const showPaymentCols = async () => {
  const [cols] = await pool.query(`DESCRIBE payments;`);
  console.log('payments columns:', cols.map(c => ({ field: c.Field, type: c.Type })));
  await pool.end();
};

showPaymentCols();
