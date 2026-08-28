import pool from '../config/db.js';

const showCols = async () => {
  const [cols1] = await pool.query(`DESCRIBE reconciliation_cases;`);
  console.log('reconciliation_cases:', cols1.map(c => c.Field));

  const [cols2] = await pool.query(`DESCRIBE ai_recommendations;`);
  console.log('ai_recommendations:', cols2.map(c => c.Field));

  const [cols3] = await pool.query(`DESCRIBE payment_allocations;`);
  console.log('payment_allocations:', cols3.map(c => c.Field));

  await pool.end();
};

showCols();
