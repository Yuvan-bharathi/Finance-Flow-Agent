import { sendErrorResponse } from '../utils/apiResponse.js';

/**
 * In-Memory Sliding-Window Rate Limiting Middleware (Phase 6)
 *
 * Function: createRateLimiter({ windowMs, maxRequests, message })
 * Purpose: Protects the API gateway, backend services, and external Groq LLM API
 *          against Denial of Service (DoS), brute force, and runaway client polling.
 *
 * Called by:
 * - Express Route definitions in `backend/src/routes/*.routes.js`
 *
 * Receives:
 * - `windowMs`: Time window duration in milliseconds (e.g. 60,000ms = 1 minute)
 * - `maxRequests`: Maximum allowed requests per IP in the given window
 * - `message`: Custom error message returned on HTTP 429
 *
 * Architectural Note & Known Limitation:
 * - In this single-instance deployment, rate counters are tracked in process memory.
 * - In Phase 8 (Production & Distributed DevOps), multi-instance horizontal scaling
 *   evolves this to a shared Redis cluster (`redis-rate-limiter` / token bucket).
 */

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 60,
  message = 'Too many requests. Please try again later.'
} = {}) => {
  const ipHits = new Map();

  // Periodic cleanup of expired sliding-window records every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipHits.entries()) {
      if (now - record.resetTime > windowMs) {
        ipHits.delete(ip);
      }
    }
  }, 2 * 60 * 1000);

  // Prevent interval from keeping the process alive during testing or shutdown
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    // Determine client IP (supporting reverse proxy X-Forwarded-For headers)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     req.socket?.remoteAddress ||
                     '127.0.0.1';

    const now = Date.now();
    let record = ipHits.get(clientIp);

    if (!record || now > record.resetTime) {
      // First request or window expired: start new sliding window
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      ipHits.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

    // Set standard RateLimit HTTP response headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSec);
      return sendErrorResponse(
        res,
        429,
        `${message} Retry after ${retryAfterSec} seconds.`
      );
    }

    next();
  };
};

/**
 * 1. Authentication & Webhook Rate Limiter: 30 requests / 60 seconds
 * Guards sensitive auth login endpoints against credential stuffing.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Authentication rate limit exceeded.'
});

/**
 * 2. AI Agent & Pipeline Execution Rate Limiter: 20 requests / 60 seconds
 * Safeguards external Groq LLM API rate limits and prevents token budget exhaustion.
 */
export const agentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'AI agent trigger rate limit exceeded.'
});

/**
 * 3. General Public API Rate Limiter: 120 requests / 60 seconds
 * Standard protection for general reading/querying endpoints.
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'API rate limit exceeded.'
});
