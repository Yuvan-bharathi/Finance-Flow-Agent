import pool from '../config/db.js';

const showRepaymentCols = async () => {
  const [cols] = await pool.query(`DESCRIBE repayment_schedules;`);
  console.log('repayment_schedules columns:', cols.map(c => ({ field: c.Field, type: c.Type })));
  await pool.end();
};

showRepaymentCols();
