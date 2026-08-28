import pool from '../config/db.js';
import { approveRecommendationService } from '../services/settlement.service.js';
import { getCaseByIdService } from '../services/reconciliation.service.js';
import { executeRiskTool } from '../tools/riskTools.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';

const testApprove = async () => {
  try {
    console.log('1. Fetching Case #35 details before approval...');
    const caseDetails = await getCaseByIdService(35);
    const rec = caseDetails.recommendations[0];
    console.log(`Recommendation #${rec.id} (status: ${rec.status})`);

    console.log('2. Executing approveRecommendationService (Waterfall Approval)...');
    const approveResult = await approveRecommendationService(rec.id, 1, 'Approved by accountant with waterfall');
    console.log('✓ Approval completed successfully!');
    console.log('Waterfall settlement summary:', approveResult.waterfall);

    console.log('\n3. Checking live MySQL repayment_schedules for LN-2026-001...');
    const [schedules] = await pool.query(`
      SELECT installment_number, due_date, scheduled_amount, paid_amount, status
      FROM repayment_schedules
      WHERE loan_id = 1
      ORDER BY installment_number ASC;
    `);
    console.table(schedules);

    console.log('\n4. Checking payment_allocations table (1:N audit records)...');
    const [allocs] = await pool.query(`
      SELECT pa.id, pa.payment_id, pa.repayment_schedule_id, pa.allocated_amount, pa.allocation_type, rs.installment_number
      FROM payment_allocations pa
      JOIN repayment_schedules rs ON pa.repayment_schedule_id = rs.id
      WHERE pa.payment_id = ?;
    `, [caseDetails.payment_id]);
    console.table(allocs);

    console.log('\n5. Checking Agent 2 (Risk) live database computation...');
    const riskData = await executeRiskTool('getLoanScheduleStatus', { companyId: 1 });
    console.log('Agent 2 computed exposure:', {
      overdue_count: riskData.loans[0]?.overdue_count,
      total_overdue_amount: riskData.loans[0]?.total_overdue_amount,
      max_days_overdue: riskData.loans[0]?.max_days_overdue
    });

    console.log('\n6. Checking Agent 3 (Collection Notice) draft...');
    const agent3Notice = await runCollectionAgent(1, 1);
    console.log('Agent 3 notice output:', {
      status: agent3Notice.status || 'GENERATED',
      total_overdue_amount: agent3Notice.total_overdue_amount,
      subject: agent3Notice.subject
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
};

testApprove();
