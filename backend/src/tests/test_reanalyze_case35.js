import pool from '../config/db.js';
import { runReconciliationAgent } from '../agents/reconciliationAgent.js';
import { getCaseByIdService } from '../services/reconciliation.service.js';

const reanalyze = async () => {
  try {
    console.log('1. Finding latest open/pending case...');
    const [cases] = await pool.query(`
      SELECT rc.id, rc.status, p.amount, p.transaction_id, p.sender_name 
      FROM reconciliation_cases rc
      JOIN payments p ON rc.payment_id = p.id
      ORDER BY rc.id DESC LIMIT 1;
    `);

    if (cases.length === 0) {
      console.log('No cases found.');
      return;
    }

    const c = cases[0];
    console.log(`Found Case #${c.id}: ₹${c.amount} (${c.sender_name}, status: ${c.status})`);

    // Reset status to open if it was pending_review so we can re-analyze
    await pool.query(`UPDATE reconciliation_cases SET status = 'open' WHERE id = ?;`, [c.id]);
    await pool.query(`DELETE FROM ai_recommendations WHERE reconciliation_case_id = ?;`, [c.id]);

    console.log('2. Running Agent 1 (Reconciliation Agent)...');
    const runResult = await runReconciliationAgent(c.id, 1, 'manual');
    console.log('✓ Agent 1 Run completed!');
    console.log('Recommendation reasoning:', runResult.reasoning);

    console.log('3. Fetching case details with waterfall preview...');
    const caseDetails = await getCaseByIdService(c.id);
    const rec = caseDetails.recommendations[0];

    console.log('Matched Borrower:', rec.company_name);
    console.log('Matched Facility:', rec.loan_number);
    console.log('Waterfall preview:');
    console.table(rec.waterfall_preview.allocations);
    console.log('Summary:', {
      total_allocated: rec.waterfall_preview.total_allocated_amount,
      post_settlement_overdue_exposure: rec.waterfall_preview.post_settlement_overdue_exposure,
      post_settlement_overdue_count: rec.waterfall_preview.post_settlement_overdue_count
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

reanalyze();
