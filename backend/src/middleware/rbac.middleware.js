import { sendErrorResponse } from '../utils/apiResponse.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Purpose:
 * Enforces role-based permissions by checking whether `req.user.role_name` matches one of the allowed roles for a route.
 * 
 * Called by:
 * - Express router after `authenticate` middleware.
 * 
 * Data flow:
 * Protected Route ➔ authenticate (sets req.user) ➔ authorize(['admin', 'manager']) ➔ Controller
 * 
 * @param {Array<string>} allowedRoles - Array of role names permitted to access the route (e.g. ['admin', 'manager', 'accountant']).
 * 
 * @returns {Function} Express middleware handler `(req, res, next)`.
 * 
 * Express Arguments Explanation:
 * @param {Object} req - Request object containing `req.user` attached by `authenticate`.
 * @param {Object} res - Response object used to send 403 Forbidden error if unauthorized.
 * @param {Function} next - Function to proceed to the next handler if authorization succeeds.
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // 1. Ensure user is authenticated
    if (!req.user || !req.user.role_name) {
      return sendErrorResponse(res, 401, 'Authentication context missing.');
    }

    // Normalize role names for safe string comparison
    const userRole = req.user.role_name.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

    // 2. Check if user's role exists in allowedRoles
    if (!normalizedAllowedRoles.includes(userRole)) {
      return sendErrorResponse(
        res, 
        403, 
        `Access denied. Role '${req.user.role_name}' is not authorized to perform this operation.`
      );
    }

    // Role is authorized
    return next();
  };
};
