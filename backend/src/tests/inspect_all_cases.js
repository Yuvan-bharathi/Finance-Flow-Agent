import pool from '../config/db.js';

const inspect = async () => {
  const [cases] = await pool.query(`
    SELECT rc.id, rc.payment_id, rc.status, rc.priority, rc.created_at, p.transaction_id, p.sender_name, p.amount
    FROM reconciliation_cases rc
    LEFT JOIN payments p ON rc.payment_id = p.id
    ORDER BY rc.id ASC
  `);
  console.log('Total reconciliation cases:', cases.length);
  console.log('Sample cases:', cases.map(c => ({ id: c.id, status: c.status, txn: c.transaction_id, sender: c.sender_name })));

  const [paymentsWithoutCases] = await pool.query(`
    SELECT p.id, p.transaction_id, p.sender_name, p.amount, p.status, p.created_at
    FROM payments p
    LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
    WHERE rc.id IS NULL
  `);
  console.log('Payments without cases:', paymentsWithoutCases.length, paymentsWithoutCases);

  await pool.end();
};

inspect();
