import pool from '../config/db.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';
import { sendEscalationNoticeEmail } from '../utils/emailService.js';

/**
 * Service: Collection Service
 * 
 * Called by:
 * - collection.controller.js
 */

export const generateCollectionReminderService = async (companyId) => {
  return await runCollectionAgent(companyId);
};

export const sendCollectionReminderService = async (companyId, draftPayload, userId) => {
  // 1. Dispatch Email via Email Service (Nodemailer / Console Fallback)
  const targetTo = draftPayload.recipient_email || 'finance@abctech.com';
  const emailResult = await sendEscalationNoticeEmail({
    recipientEmail: targetTo,
    fromEmail: 'yuvanbharathin@gmail.com',
    companyName: draftPayload.company_name || 'ABC Technologies Pvt Ltd',
    subject: draftPayload.subject || 'Official Repayment Reminder Notice',
    body: draftPayload.body || draftPayload.message || 'Please review your outstanding debt balance.',
    priority: draftPayload.urgency || draftPayload.priority || 'high',
    alertId: draftPayload.alert_id || null
  });

  // 2. Log action in audit_logs
  await pool.query(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
    VALUES (?, 'SEND_COLLECTION_REMINDER', 'company', ?, ?, '127.0.0.1');
  `, [userId || null, companyId, JSON.stringify({ ...draftPayload, email_delivery: emailResult })]);

  return {
    success: true,
    sent_at: new Date().toISOString(),
    message: `Collection follow-up reminder dispatched to ${draftPayload.recipient_email}`,
    email_delivery: emailResult
  };
};
