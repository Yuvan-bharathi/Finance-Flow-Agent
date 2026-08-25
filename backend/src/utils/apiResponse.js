/**
 * Module: Utility / API Response Helper
 * Purpose: Provides standardized success and error JSON response structures for Express controllers.
 * 
 * Called by:
 * - Express Controllers (auth.controller.js, payment.controller.js, reconciliation.controller.js, etc.)
 * - Error handling middleware (error.middleware.js)
 * 
 * Data flow:
 * Controller ➔ sendSuccessResponse() / sendErrorResponse() ➔ res.status().json() ➔ HTTP Client
 */

/**
 * Standardized Success Response Generator
 * 
 * @param {Object} res - Express response object.
 * @param {number} statusCode - HTTP status code (e.g. 200, 201).
 * @param {string} message - Human-readable success message.
 * @param {Object|Array|null} data - Payload data returned to client.
 */
export const sendSuccessResponse = (res, statusCode = 200, message = 'Operation successful', data = null, meta = {}) => {
  const correlationId = res.getHeader ? res.getHeader('X-Correlation-ID') : (res.req?.correlationId || 'N/A');
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    correlationId: correlationId || undefined,
    ...meta,
    timestamp: new Date().toISOString()
  });
};

/**
 * Standardized Error Response Generator
 * 
 * @param {Object} res - Express response object.
 * @param {number} statusCode - HTTP error code (e.g. 400, 401, 403, 404, 500).
 * @param {string} message - Error message explanation.
 * @param {Object|Array|null} errors - Detailed validation errors or debugging metadata.
 */
export const sendErrorResponse = (res, statusCode = 500, message = 'Internal server error', errors = null) => {
  const correlationId = res.getHeader ? res.getHeader('X-Correlation-ID') : (res.req?.correlationId || 'N/A');
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    correlationId: correlationId || undefined,
    timestamp: new Date().toISOString()
  });
};
