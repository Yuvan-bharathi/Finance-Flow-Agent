import pool from '../config/db.js';
import { findOpenCases } from '../models/reconciliationCase.model.js';

const test = async () => {
  const cases = await findOpenCases(50);
  console.log(`Found ${cases.length} pending/new targets for pipeline modal:`);
  console.table(cases.map(c => ({
    case_id: c.id,
    status: c.status,
    sender: c.sender_name,
    txn: c.transaction_id,
    amount: c.amount,
    date: c.payment_date
  })));
  await pool.end();
};

test();
