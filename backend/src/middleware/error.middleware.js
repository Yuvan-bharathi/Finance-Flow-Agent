import { sendErrorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Centralized Error Handling Middleware
 * 
 * Purpose:
 * Catches unhandled errors thrown anywhere in the Express middleware/controller stack,
 * logs them using the structured JSON logger with correlation ID, and returns a clean
 * standardized JSON error payload to the client.
 * 
 * Called by:
 * - Express app error handler stack (`app.use(errorHandler)` in app.js).
 * 
 * Data flow:
 * Controller / Service Throws Error ➔ next(err) ➔ errorHandler ➔ logger.error() ➔ sendErrorResponse() ➔ Client
 * 
 * @param {Error} err - Error object thrown by application or database.
 * @param {Object} req - Express request object (contains req.correlationId).
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function.
 */
export const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || 'N/A';
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const errors = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  // Log error with structured contextual details
  logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`, err, {
    correlationId,
    userId: req.user ? req.user.id : null,
    method: req.method,
    path: req.originalUrl,
    statusCode
  });

  return sendErrorResponse(res, statusCode, message, errors);
};

export default errorHandler;
