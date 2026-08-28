import crypto from 'crypto';
import {
  findIdempotencyKey,
  createIdempotencyLock,
  completeIdempotencyKey,
  releaseIdempotencyLock
} from '../models/idempotency.model.js';
import logger from '../utils/logger.js';

/**
 * Middleware: Financial Idempotency Layer
 * Purpose: Protects state-mutating financial operations from duplicate execution
 *          caused by client retries, double-clicks, or distributed network replays.
 * 
 * Called by:
 * - Mutating Express routes (e.g. POST /api/reconciliations/approve, POST /api/assistant/actions/confirm)
 * 
 * Data flow:
 * HTTP POST Request with Header `Idempotency-Key: <token>`
 *   ↓
 * Compute SHA-256 hash of req.body
 *   ↓
 * Query idempotency_keys table
 *   ├── [HIT - Completed]: Return cached response immediately with header `X-Cache-Lookup: HIT`
 *   ├── [IN-FLIGHT - Processing]: Return 409 Conflict with header `X-Cache-Lookup: IN_FLIGHT`
 *   └── [MISS - New Key]:
 *          1. Insert lock with status = 'processing'
 *          2. Hook res.json() to capture output
 *          3. next() ➔ Controller ➔ ACID DB Transaction
 *          4. On success: Update idempotency_keys status = 'completed', store response JSON
 *          5. Set header `X-Cache-Lookup: MISS`
 * 
 * @param {Object} [options] - `{ required: boolean }`
 * @returns {Function} Express middleware handler `(req, res, next)`
 */
export const idempotencyMiddleware = (options = { required: false }) => {
  return async (req, res, next) => {
    // Only inspect mutating HTTP methods
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    // 1. If key is missing but not strictly required for this endpoint, proceed normally
    if (!idempotencyKey) {
      if (options.required) {
        return res.status(400).json({
          success: false,
          message: "Header 'Idempotency-Key' is required for this mutating financial transaction.",
          correlationId: req.correlationId || 'N/A'
        });
      }
      return next();
    }

    const cleanKey = String(idempotencyKey).trim().slice(0, 120);

    // 2. Compute payload digest to prevent key reuse with modified data (tamper protection)
    const requestPayload = req.body || {};
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(requestPayload))
      .digest('hex');

    try {
      // 3. Lookup existing idempotency record
      const existing = await findIdempotencyKey(cleanKey);

      if (existing) {
        // A. If key exists but was used with a DIFFERENT payload, reject with 422 Unprocessable Entity
        if (existing.request_hash !== requestHash) {
          logger.warn(`Idempotency key reuse with mismatched payload: ${cleanKey}`, {
            correlationId: req.correlationId,
            key: cleanKey,
            path: req.originalUrl
          });
          return res.status(422).json({
            success: false,
            message: "Idempotency key has already been used with a different request payload.",
            correlationId: req.correlationId || 'N/A'
          });
        }

        // B. If request is currently executing in another thread, return 409 Conflict
        if (existing.status === 'processing') {
          res.setHeader('X-Cache-Lookup', 'IN_FLIGHT');
          return res.status(409).json({
            success: false,
            message: "A concurrent request is currently being processed for this Idempotency-Key. Please wait.",
            correlationId: req.correlationId || 'N/A'
          });
        }

        // C. If previous execution completed successfully, return the cached result immediately
        if (existing.status === 'completed') {
          res.setHeader('X-Cache-Lookup', 'HIT');
          res.setHeader('X-Idempotency-Key', cleanKey);
          logger.info(`Idempotency HIT: Replaying cached response for key: ${cleanKey}`, {
            correlationId: req.correlationId,
            key: cleanKey,
            cachedStatusCode: existing.response_status
          });
          return res.status(existing.response_status).json(existing.response_body);
        }
      }

      // 4. New key: acquire atomic processing lock
      const userId = req.user ? req.user.id : null;
      await createIdempotencyLock({
        key: cleanKey,
        userId,
        method: req.method,
        path: req.originalUrl || req.url,
        requestHash,
        ttlHours: 24
      });

      res.setHeader('X-Cache-Lookup', 'MISS');
      res.setHeader('X-Idempotency-Key', cleanKey);

      // 5. Intercept res.json to capture response payload
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        const statusCode = res.statusCode || 200;

        // Asynchronously persist the response on completion
        if (statusCode < 400) {
          completeIdempotencyKey({
            key: cleanKey,
            responseStatus: statusCode,
            responseBody: body
          }).catch((err) => {
            logger.error(`Failed to store completed idempotency response for key ${cleanKey}:`, err, {
              correlationId: req.correlationId
            });
          });
        } else {
          // If request returned a client or server error, release the lock so the user can fix input and retry
          releaseIdempotencyLock(cleanKey).catch((err) => {
            logger.error(`Failed to release failed idempotency key ${cleanKey}:`, err);
          });
        }

        return originalJson(body);
      };

      return next();
    } catch (error) {
      // In case of database error checking idempotency key, log and proceed safely rather than crashing
      logger.error('Error during idempotency middleware processing:', error, {
        correlationId: req.correlationId,
        key: cleanKey
      });
      return next();
    }
  };
};

export default idempotencyMiddleware;
