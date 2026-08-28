import pool from '../config/db.js';
import { batchApproveAlerts } from '../controllers/notification.controller.js';

const testBatchDispatch = async () => {
  console.log('🧪 Testing Batch Notification Dispatch & Role Governance...');

  try {
    // 1. Create 2 test companies and 2 pending notification alerts
    const uKey = Date.now();
    const [c1] = await pool.query(`
      INSERT INTO companies (company_name, registration_number, contact_name, contact_email)
      VALUES ('Batch Test Corp 1', ?, 'Rajesh Sharma', 'rajesh@batch1.com')
    `, [`REG-B1-${uKey}`]);
    const [c2] = await pool.query(`
      INSERT INTO companies (company_name, registration_number, contact_name, contact_email)
      VALUES ('Batch Test Corp 2', ?, 'Priya Patel', 'priya@batch2.com')
    `, [`REG-B2-${uKey}`]);

    const [a1] = await pool.query(`
      INSERT INTO notification_alerts (company_id, severity, overdue_days, outstanding_amount, notification_status, recommended_recipient, ai_reasoning)
      VALUES (?, 'CRITICAL', 45, 120000.00, 'pending', 'Finance Director', 'Please settle overdue amount immediately.')
    `, [c1.insertId]);

    const [a2] = await pool.query(`
      INSERT INTO notification_alerts (company_id, severity, overdue_days, outstanding_amount, notification_status, recommended_recipient, ai_reasoning)
      VALUES (?, 'HIGH', 30, 85000.00, 'pending', 'Finance Manager', 'Please settle overdue amount immediately.')
    `, [c2.insertId]);

    const alertIds = [a1.insertId, a2.insertId];
    console.log(`Created test alerts: ${alertIds.join(', ')}`);

    // 2. Test batch approval controller with Owner mock user
    let responseData = null;
    let statusCode = null;

    const mockReq = {
      body: { alertIds },
      user: { id: 1, role_name: 'Owner' }
    };
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
            return data;
          }
        };
      }
    };

    await batchApproveAlerts(mockReq, mockRes);

    console.log(`Batch Dispatch HTTP Status: ${statusCode}`);
    console.log(`Response message: ${responseData?.message}`);
    console.log(`Count dispatched: ${responseData?.data?.count}`);

    if (statusCode !== 200 || responseData?.data?.count !== 2) {
      throw new Error(`Expected 2 dispatched alerts, got: ${JSON.stringify(responseData)}`);
    }

    // Verify DB status updated to approved
    const [updatedRows] = await pool.query(`
      SELECT id, notification_status, approved_by FROM notification_alerts WHERE id IN (?)
    `, [alertIds]);

    for (const row of updatedRows) {
      if (row.notification_status !== 'approved') {
        throw new Error(`Alert #${row.id} status was not updated to 'approved'`);
      }
    }

    console.log('✅ PASS: All alerts in batch were successfully marked APPROVED & dispatched!');

    // Cleanup
    await pool.query(`DELETE FROM audit_logs WHERE action = 'BATCH_APPROVE_ESCALATION_ALERT' AND entity_id IN (?)`, [alertIds]);
    await pool.query(`DELETE FROM notification_alerts WHERE id IN (?)`, [alertIds]);
    await pool.query(`DELETE FROM companies WHERE id IN (?)`, [[c1.insertId, c2.insertId]]);

    console.log('✅ PASS: Batch test records cleaned up.');

  } catch (err) {
    console.error('❌ Batch Dispatch Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

testBatchDispatch();
