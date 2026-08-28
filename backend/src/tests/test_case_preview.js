import pool from '../config/db.js';
import { getCaseByIdService } from '../services/reconciliation.service.js';

const testCasePreview = async () => {
  try {
    const [cases] = await pool.query(`
      SELECT rc.id, rc.payment_id, p.amount 
      FROM reconciliation_cases rc 
      JOIN payments p ON rc.payment_id = p.id 
      ORDER BY rc.id DESC LIMIT 1;
    `);
    if (cases.length === 0) {
      console.log('No cases found in DB.');
      return;
    }
    const caseId = cases[0].id;
    console.log(`Testing getCaseByIdService for Case #${caseId} (Amount: ₹${cases[0].amount})...`);

    const result = await getCaseByIdService(caseId);
    console.log('Case details retrieved successfully.');
    console.log('Latest Recommendation:', JSON.stringify(result.recommendations[0], null, 2));

    if (result.recommendations[0]?.waterfall_preview) {
      console.log('✓ Waterfall preview successfully attached:', result.recommendations[0].waterfall_preview);
    } else {
      console.log('ℹ️ No waterfall preview (likely unanalyzed case or no recommended_loan_id)');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

testCasePreview();
