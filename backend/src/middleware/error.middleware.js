import { sendErrorResponse } from '../utils/apiResponse.js';

/**
 * Centralized Error Handling Middleware
 * 
 * Purpose:
 * Catches unhandled errors thrown anywhere in the Express middleware/controller stack and formats a clean JSON error response.
 * 
 * Called by:
 * - Express app error handler stack (`app.use(errorHandler)`).
 * 
 * @param {Error} err - Error object thrown by application or database.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function.
 */
export const errorHandler = (err, req, res, next) => {
  console.error(`[Unhandled Server Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = process.env.NODE_ENV === 'development' ? err.stack : null;

  return sendErrorResponse(res, statusCode, message, errors);
};
