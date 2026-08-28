import { getAuditLogsService } from '../services/settlement.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

/**
 * Controller: Audit Log Controller
 * Purpose: Express HTTP request handlers for Audit Trail compliance endpoints.
 * 
 * Called by:
 * - audit.routes.js
 */

/**
 * Controller: getAuditLogs
 * Endpoint: GET /api/audit-logs
 * Access: Authenticated (Admin, Manager, Accountant)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await getAuditLogsService(req.query);
    return sendSuccessResponse(res, 200, 'Audit logs retrieved successfully', logs);
  } catch (error) {
    return next(error);
  }
};
