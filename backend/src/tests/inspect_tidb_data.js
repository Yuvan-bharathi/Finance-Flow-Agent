import pool from '../config/db.js';

async function inspectDbData() {
  console.log('=============================================================');
  console.log('🔍 Comprehensive TiDB Cloud Database Inspection');
  console.log('=============================================================\n');

  try {
    // 1. Check all tables in the database
    const [tables] = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY table_name ASC
    `);
    
    console.log(`📊 Total Tables in Database: ${tables.length}`);
    const tableNames = tables.map(t => t.table_name || t.TABLE_NAME);
    console.log(tableNames.join(', '));
    console.log('\n-------------------------------------------------------------');

    // 2. Count rows in all tables
    console.log('📋 Row Counts by Table:');
    const counts = {};
    for (const t of tableNames) {
      try {
        const [res] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${t}\``);
        counts[t] = res[0].cnt;
        console.log(`  • ${t.padEnd(28)}: ${counts[t]} rows`);
      } catch (err) {
        console.log(`  • ${t.padEnd(28)}: Error querying (${err.message})`);
      }
    }
    console.log('-------------------------------------------------------------\n');

    // 3. Inspect Specific Core Datasets
    // Roles
    const [roles] = await pool.query('SELECT id, name, description FROM roles ORDER BY id ASC');
    console.log('👥 Roles:', roles);

    // Users
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, r.name AS role_name, u.is_active
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);
    console.log('\n👤 Users:', users);

    // Companies
    const [companies] = await pool.query('SELECT id, company_name, registration_number, tax_identifier, status FROM companies ORDER BY id ASC');
    console.log('\n🏢 Companies:', companies);

    // Loans
    const [loans] = await pool.query('SELECT id, company_id, loan_number, principal_amount, total_payable, status FROM loans ORDER BY id ASC');
    console.log('\n💰 Loans:', loans);

    // Repayment Schedules summary
    const [schedules] = await pool.query(`
      SELECT status, COUNT(*) as count, SUM(scheduled_amount) as total_scheduled, SUM(paid_amount) as total_paid 
      FROM repayment_schedules 
      GROUP BY status
    `);
    console.log('\n📅 Repayment Schedules Summary by Status:', schedules);

    // Payments
    const [payments] = await pool.query('SELECT id, transaction_id, amount, payment_date, sender_name, status FROM payments ORDER BY id ASC');
    console.log('\n💳 Payments:', payments);

    // Reconciliation Cases
    const [cases] = await pool.query('SELECT id, payment_id, status, priority FROM reconciliation_cases ORDER BY id ASC');
    console.log('\n📂 Reconciliation Cases:', cases);

    console.log('\n=============================================================');
    console.log('✅ Inspection Finished Successfully.');
    console.log('=============================================================');
  } catch (error) {
    console.error('❌ Inspection Error:', error);
  } finally {
    process.exit(0);
  }
}

inspectDbData();
