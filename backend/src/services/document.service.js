import pool from '../config/db.js';
import { runDocumentIntelligenceAgent } from '../agents/documentAgent.js';

export const getDocumentsService = async () => {
  const [rows] = await pool.query(`
    SELECT d.*, c.company_name, u.name AS uploader_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    ORDER BY d.created_at DESC;
  `);
  return rows;
};

export const extractDocumentTermsService = async (documentId) => {
  return await runDocumentIntelligenceAgent(documentId);
};
