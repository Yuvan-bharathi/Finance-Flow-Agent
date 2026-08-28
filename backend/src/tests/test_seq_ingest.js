import pool from '../config/db.js';
import { ingestPaymentService } from '../services/payment.service.js';

const test = async () => {
  console.log('🧪 Testing New Payment Ingestion & Sequential Case ID Generation...');

  const uniqueTxn = `TXN-SEQ-TEST-${Date.now()}`;
  const res = await ingestPaymentService({
    transaction_id: uniqueTxn,
    amount: '88000.00',
    payment_date: '2026-08-26',
    sender_name: 'Sequential Verification Corp',
    sender_account: '990011882233',
    reference: 'REF-SEQ-001',
    source: 'manual'
  }, 1);

  console.log(`✅ Ingested payment. Generated Case ID: Case #${res.case?.id}`);
  console.log(`Expected Case ID: Case #35, Actual: Case #${res.case?.id}`);

  if (res.case?.id === 35) {
    console.log('🎉 SUCCESS: Next Case ID is strictly sequential Case #35!');
  } else {
    console.log(`⚠️ ID was: ${res.case?.id}`);
  }

  // Cleanup test record
  await pool.query(`DELETE FROM reconciliation_cases WHERE id = ?;`, [res.case?.id]);
  await pool.query(`DELETE FROM payments WHERE id = ?;`, [res.payment?.id]);
  console.log('Test record cleaned up.');

  await pool.end();
};

test();
