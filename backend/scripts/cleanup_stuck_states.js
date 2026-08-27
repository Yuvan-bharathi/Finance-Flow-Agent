import pool from '../src/config/db.js';

async function cleanupStuckStates() {
  console.log('=== Cleaning Up Stuck Agent Runs, Case Statuses, and Orphan Payments ===');

  try {
    // 1. Clean up stuck agent runs
    const [runResult] = await pool.query(`
      UPDATE agent_runs
      SET status = 'failed',
          error_message = 'Execution timed out or process was restarted',
          updated_at = NOW()
      WHERE status = 'running'
        AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    `);
    console.log(`✓ Cleaned up ${runResult.affectedRows} stuck agent runs.`);

    // 2. Clean up cases with recommendations that were left in 'ai_processing' or 'ai_queued'
    const [recCasesResult] = await pool.query(`
      UPDATE reconciliation_cases rc
      INNER JOIN ai_recommendations ar ON ar.reconciliation_case_id = rc.id
      SET rc.status = 'pending_review',
          rc.updated_at = NOW()
      WHERE rc.status IN ('ai_processing', 'ai_queued')
        AND ar.status = 'pending';
    `);
    console.log(`✓ Fixed ${recCasesResult.affectedRows} cases with recommendations from 'ai_processing' to 'pending_review'.`);

    // 3. Clean up remaining stuck cases with NO recommendations -> 'open'
    const [openCasesResult] = await pool.query(`
      UPDATE reconciliation_cases rc
      LEFT JOIN ai_recommendations ar ON ar.reconciliation_case_id = rc.id
      SET rc.status = 'open',
          rc.updated_at = NOW()
      WHERE rc.status IN ('ai_processing', 'ai_queued')
        AND ar.id IS NULL;
    `);
    console.log(`✓ Reset ${openCasesResult.affectedRows} stuck cases with no recommendations to 'open'.`);

    // 4. Backfill reconciliation_cases for orphan payments
    const [orphanPayments] = await pool.query(`
      SELECT p.id, p.transaction_id, p.amount, p.payment_date
      FROM payments p
      LEFT JOIN reconciliation_cases rc ON rc.payment_id = p.id
      WHERE rc.id IS NULL;
    `);

    if (orphanPayments.length > 0) {
      console.log(`Found ${orphanPayments.length} orphan payments. Backfilling reconciliation cases...`);
      for (const p of orphanPayments) {
        await pool.query(`
          INSERT INTO reconciliation_cases (payment_id, status, created_at, updated_at)
          VALUES (?, 'open', NOW(), NOW());
        `, [p.id]);
        console.log(`  + Created case for payment #${p.id} [${p.transaction_id}]`);
      }
    } else {
      console.log('✓ No orphan payments found.');
    }

    console.log('=== Cleanup Complete ===');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanupStuckStates();
