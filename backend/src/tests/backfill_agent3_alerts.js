import pool from '../config/db.js';

const backfill = async () => {
  console.log('🔍 Checking recent pipeline steps for collection drafts...');

  const [steps] = await pool.query(`
    SELECT ps.id, ps.pipeline_id, ps.agent_name, ps.output_payload, ps.created_at
    FROM pipeline_steps ps
    WHERE ps.agent_name = 'AutomatedCollectionFollowUpAgent'
    ORDER BY ps.id DESC
    LIMIT 10
  `);

  console.log(`Found ${steps.length} AutomatedCollectionFollowUpAgent step(s).`);

  for (const s of steps) {
    let out = s.output_payload;
    if (typeof out === 'string') {
      try { out = JSON.parse(out); } catch (e) { out = null; }
    }
    if (out && out.total_overdue_amount > 0 && !out.skipped) {
      console.log(`Checking alert for pipeline step #${s.id} (${out.recipient_name}, Overdue: ₹${out.total_overdue_amount})...`);

      const [existing] = await pool.query(`
        SELECT id FROM notification_alerts WHERE title = ? AND company_id = ? LIMIT 1
      `, [out.subject, out.company_id || 1]);

      if (existing.length === 0) {
        console.log(`Inserting missing notification_alert for Step #${s.id}...`);
        await pool.query(`
          INSERT INTO notification_alerts (
            company_id, severity, overdue_days, outstanding_amount,
            title, message, ai_reasoning, recommended_recipient, recommended_action,
            escalation_level, notification_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?);
        `, [
          out.company_id || 1,
          out.urgency_level === 'FINAL_DEMAND' ? 'CRITICAL' : 'HIGH',
          out.days_overdue || 45,
          out.total_overdue_amount || 660000.00,
          out.subject || `[FINAL DEMAND] Payment Notice for ABC Technologies Pvt Ltd`,
          out.email_body || 'Please arrange for settlement at your earliest convenience.',
          out.email_body || 'Please arrange for settlement at your earliest convenience.',
          `${out.recipient_name || 'Rajesh Kumar'} <${out.recipient_email || 'abctechnologiespvtltd@borrower.com'}>`,
          `Dispatch formal ${out.urgency_level || 'FINAL_DEMAND'} notice to borrower contact.`,
          'Borrower Contact',
          s.created_at || new Date()
        ]);
        console.log(`✅ Inserted alert for Step #${s.id}`);
      }
    }
  }

  await pool.end();
};

backfill();
