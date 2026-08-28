import crypto from 'crypto';

/**
 * Middleware: Correlation ID Interceptor
 * Purpose: Assigns or extracts a unique correlation identifier for every incoming HTTP request.
 *          The correlation ID is attached to `req.correlationId` and mirrored in the HTTP response header
 *          `X-Correlation-ID`. It enables distributed tracing across frontend, API gateway, controllers,
 *          services, database transactions, background agents, and WebSocket events.
 * 
 * Called by:
 * - Express application middleware pipeline in `app.js` (mounted first).
 * 
 * Data flow:
 * Browser / Client HTTP Request (Optionally sends X-Correlation-ID)
 *   ↓
 * Express Router
 *   ↓
 * correlationMiddleware (Extracts header or generates `FF-YYYYMMDD-<random8>`)
 *   ↓
 * req.correlationId = correlationId
 * res.setHeader('X-Correlation-ID', correlationId)
 *   ↓
 * next() ➔ Downstream middleware / Controllers / Services
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express callback to proceed to the next middleware.
 */
export const correlationMiddleware = (req, res, next) => {
  // 1. Check if client supplied a correlation ID (e.g. from frontend Axios interceptor)
  let correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'];

  // 2. If absent or invalid, generate a structured correlation ID
  if (!correlationId || typeof correlationId !== 'string' || correlationId.trim().length === 0) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    correlationId = `FF-${today}-${randomHex}`;
  } else {
    // Sanitize client-supplied header to prevent header injection
    correlationId = correlationId.trim().slice(0, 64);
  }

  // 3. Attach to Express request context
  req.correlationId = correlationId;

  // 4. Inject into outgoing response headers so frontend client and API consumers can reference it
  res.setHeader('X-Correlation-ID', correlationId);

  return next();
};

export default correlationMiddleware;
