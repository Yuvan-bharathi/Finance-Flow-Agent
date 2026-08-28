import crypto from 'crypto';
import cacheService from '../services/cache.service.js';

/**
 * Middleware: Cache Gatekeeper Middleware
 *
 * Purpose:
 * Intercepts incoming idempotent GET requests. If a cached payload exists for the
 * exact URL, query parameters, and date boundaries, serves it immediately with header `X-Cache: HIT`.
 * On cache miss, captures the controller's JSON response, caches it under the specified tag,
 * and attaches header `X-Cache: MISS`.
 *
 * @param {Object} options - Cache options
 * @param {number} [options.ttlSeconds=60] - TTL in seconds
 * @param {string} [options.tag='general'] - Domain tag for group invalidation
 * @returns {Function} Express middleware function
 */
export const cacheMiddleware = (options = {}) => {
  const { ttlSeconds = 60, tag = 'general' } = options;

  return (req, res, next) => {
    // Only cache GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    // Build deterministic cache key from path + sorted query parameters
    const queryString = Object.keys(req.query || {})
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&');

    const rawKey = `${req.baseUrl || ''}${req.path}?${queryString}`;
    const cacheKey = `ff:cache:${tag}:${crypto.createHash('md5').update(rawKey).digest('hex')}`;

    const cachedData = cacheService.get(cacheKey);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.status(200).json(cachedData);
    }

    // Cache Miss: Intercept res.json
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body && body.success !== false) {
        cacheService.set(cacheKey, body, ttlSeconds, [tag]);
      }
      return originalJson(body);
    };

    next();
  };
};

export default cacheMiddleware;
