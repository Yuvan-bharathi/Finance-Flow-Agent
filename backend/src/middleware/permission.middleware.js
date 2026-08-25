import { checkRoleHasPermission, getPermissionsForRole } from '../config/permissions.js';
import { sendErrorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Middleware: Permission-Based Access Control (PBAC) Guard
 * Purpose: Enforces granular permission verification on protected Express routes.
 *          Decouples endpoint security from hardcoded role names.
 * 
 * Called by:
 * - Express routers (reconciliation.routes.js, payment.routes.js, assistant.routes.js, etc.)
 *   after `authenticate` middleware.
 * 
 * Data flow:
 * Protected Route ➔ authenticate (sets req.user) ➔ requirePermission('CASE_APPROVE')
 *   ↓
 * Extract req.user.role_name
 *   ↓
 * checkRoleHasPermission(role_name, 'CASE_APPROVE')
 *   ↓
 * True ➔ next()
 * False ➔ 403 Forbidden Response { success: false, message, requiredPermission, correlationId }
 * 
 * @param {string} requiredPermission - Permission constant (e.g. PERMISSIONS.CASE_APPROVE)
 * @returns {Function} Express middleware function `(req, res, next)`
 */
export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    const userRole = req.user?.role_name || req.user?.role;

    // 1. Ensure authentication context is active
    if (!req.user || !userRole) {
      logger.warn('PBAC check failed: Missing authentication context', {
        correlationId: req.correlationId,
        path: req.originalUrl,
        requiredPermission
      });
      return sendErrorResponse(res, 401, 'Authentication context missing. Please login first.');
    }

    // 2. Check if user's role grants the required permission
    const isAuthorized = checkRoleHasPermission(userRole, requiredPermission);

    if (!isAuthorized) {
      logger.warn(`PBAC Authorization Denied: Role '${userRole}' lacks permission '${requiredPermission}'`, {
        correlationId: req.correlationId,
        userId: req.user.id,
        role: userRole,
        requiredPermission,
        path: req.originalUrl,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        message: `Access denied. Your role '${userRole}' does not possess the required permission: '${requiredPermission}'.`,
        requiredPermission,
        userRole,
        correlationId: req.correlationId || 'N/A'
      });
    }

    // 3. Attach granted permissions list to req.user for downstream use
    if (!req.user.permissions) {
      req.user.permissions = getPermissionsForRole(userRole);
    }

    return next();
  };
};

/**
 * Middleware: Requires ANY one of the provided permissions.
 * Useful for endpoints accessible by either an Accountant or a Risk Manager.
 * 
 * @param {Array<string>} permissionsList - List of allowed permission strings
 * @returns {Function} Express middleware handler
 */
export const requireAnyPermission = (permissionsList = []) => {
  return (req, res, next) => {
    const userRole = req.user?.role_name || req.user?.role;
    if (!req.user || !userRole) {
      return sendErrorResponse(res, 401, 'Authentication context missing.');
    }

    const hasAny = permissionsList.some(perm => checkRoleHasPermission(userRole, perm));

    if (!hasAny) {
      logger.warn(`PBAC Authorization Denied: Role '${userRole}' lacks any of [${permissionsList.join(', ')}]`, {
        correlationId: req.correlationId,
        userId: req.user.id,
        role: userRole,
        permissionsList,
        path: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${userRole}' does not possess any of the required permissions.`,
        requiredPermissions: permissionsList,
        correlationId: req.correlationId || 'N/A'
      });
    }

    return next();
  };
};

export default {
  requirePermission,
  requireAnyPermission
};
