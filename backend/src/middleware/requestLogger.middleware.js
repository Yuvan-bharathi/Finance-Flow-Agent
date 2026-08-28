import logger from '../utils/logger.js';

/**
 * Middleware: HTTP Request & Response Observability Logger
 * Purpose: Captures execution metrics for every incoming HTTP request, measuring end-to-end
 *          latency (durationMs), HTTP status code, request method, route path, client IP,
 *          user ID (if authenticated), and correlation ID.
 * 
 * Called by:
 * - Express pipeline in `app.js` after `correlationMiddleware`.
 * 
 * Data flow:
 * HTTP Request Arrives
 *   ↓
 * Record startTime (performance timestamp)
 *   ↓
 * Hook res.on('finish', callback)
 *   ↓
 * next() ➔ Downstream Route Execution
 *   ↓
 * Response Finished (res.statusCode ready)
 *   ↓
 * Calculate durationMs = Date.now() - startTime
 *   ↓
 * logger.info / logger.warn / logger.error (Structured JSON Log Line)
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express callback function.
 */
export const requestLogger = (req, res, next) => {
  // Skip verbose asset / favicon requests
  if (req.originalUrl === '/favicon.ico' || req.originalUrl.startsWith('/static/')) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const correlationId = req.correlationId || 'N/A';
    const userId = req.user ? req.user.id : null;
    const method = req.method;
    const path = req.originalUrl || req.url;

    const logMeta = {
      correlationId,
      userId,
      durationMs,
      method,
      path,
      statusCode,
      ip: req.ip || req.socket?.remoteAddress
    };

    const message = `HTTP ${method} ${path} -> ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 500) {
      logger.error(message, null, logMeta);
    } else if (statusCode >= 400) {
      logger.warn(message, logMeta);
    } else {
      logger.info(message, logMeta);
    }
  });

  return next();
};

export default requestLogger;
