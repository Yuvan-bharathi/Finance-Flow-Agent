import pool from '../config/db.js';
import { runCollectionAgent } from '../agents/collectionAgent.js';

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
  // Log action in audit_logs
  await pool.query(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
    VALUES (?, 'SEND_COLLECTION_REMINDER', 'company', ?, ?, '127.0.0.1');
  `, [userId || null, companyId, JSON.stringify(draftPayload)]);

  return {
    success: true,
    sent_at: new Date().toISOString(),
    message: `Collection follow-up reminder sent to ${draftPayload.recipient_email}`
  };
};
