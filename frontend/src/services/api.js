import axios from 'axios';
import { clientCache } from './cacheService.js';

/**
 * Axios Instance Configuration (Phase 6 Enterprise Cache Architecture)
 * Uses VITE_API_URL or defaults to Render backend in production and localhost in development.
 * Automatically injects X-Correlation-ID, Authorization headers, and coordinates with clientCache.
 */
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://finance-flow-agent-1.onrender.com/api' : 'http://localhost:5000/api');

export const generateCorrelationId = () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
  return `FF-${today}-${randomHex}`;
};

export const generateIdempotencyKey = (prefix = 'ACT') => {
  const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}-${randomHex}`;
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Enables HTTP-only auth cookies to be sent
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach Auth Token, Correlation ID & Transparent Client Cache
api.interceptors.request.use((reqConfig) => {
  // 1. Attach JWT Authorization token from localStorage if present
  const token = localStorage.getItem('ff_auth_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Attach X-Correlation-ID header for local development or when explicitly enabled
  const isRemoteRender = BASE_URL.includes('onrender.com');
  if (!isRemoteRender && reqConfig.headers && !reqConfig.headers['X-Correlation-ID']) {
    reqConfig.headers['X-Correlation-ID'] = generateCorrelationId();
  }

  // 3. Transparent Client-Side Cache Lookup for GET requests
  const method = (reqConfig.method || 'get').toLowerCase();
  const bypassCache = reqConfig.headers?.['x-bypass-cache'] || reqConfig.params?._nocache;

  if (method === 'get' && !bypassCache) {
    const cacheKey = clientCache.generateKey(reqConfig.url || '', reqConfig.params);
    const cached = clientCache.get(cacheKey);
    if (cached) {
      reqConfig.adapter = async () => ({
        data: cached,
        status: 200,
        statusText: 'OK (Client Cache)',
        headers: { 'x-client-cache': 'HIT', 'x-cache-key': cacheKey },
        config: reqConfig,
        request: {}
      });
    }
  }

  return reqConfig;
});

// Response Interceptor: Handling Caching, Invalidation, and 401 & 403 PBAC Authorization errors
api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    const url = response.config.url || '';

    // Store successful GET responses in clientCache
    if (method === 'get' && response.status === 200 && response.headers?.['x-client-cache'] !== 'HIT') {
      const cacheKey = clientCache.generateKey(url, response.config.params);
      const tags = clientCache.inferTagsFromUrl(url);
      clientCache.set(cacheKey, response.data, 60, tags);
    }

    // Automatic Client-Side Cache Invalidation on Mutations
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const tags = clientCache.inferTagsFromUrl(url);
      tags.forEach(tag => clientCache.invalidateByTag(tag));
    }

    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const correlationId = error.response.headers?.['x-correlation-id'] || error.response.data?.correlationId;

      if (status === 401) {
        localStorage.removeItem('ff_auth_token');
        clientCache.clear();
      }

      if (status === 403 || status === 401) {
        const message = error.response.data?.message || 'Access denied. Your current role is not authorized for this operation.';
        const requiredPermission = error.response.data?.requiredPermission;

        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status, message, requiredPermission, correlationId }
        }));
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Cached GET API wrapper.
 * Checks clientCache before making a network call.
 * 
 * @param {string} url - API Endpoint
 * @param {Object} [options] - Options ({ params, ttl, bypassCache, tags })
 * @returns {Promise<Object>} Axios-compatible response
 */
export const cachedGet = async (url, options = {}) => {
  const { params = {}, ttl = 60, bypassCache = false, tags } = options;
  const cacheKey = clientCache.generateKey(url, params);

  if (!bypassCache) {
    const cached = clientCache.get(cacheKey);
    if (cached) {
      return {
        data: cached,
        status: 200,
        statusText: 'OK (Client Cache)',
        headers: { 'x-client-cache': 'HIT', 'x-cache-key': cacheKey },
        config: { url, params }
      };
    }
  }

  // Network fetch
  const res = await api.get(url, { params });
  const inferredTags = tags || clientCache.inferTagsFromUrl(url);
  clientCache.set(cacheKey, res.data, ttl, inferredTags);

  return {
    ...res,
    headers: { ...res.headers, 'x-client-cache': 'MISS', 'x-cache-key': cacheKey }
  };
};

/**
 * Utility helper to perform an idempotent POST request.
 * Automatically injects an `Idempotency-Key` header to prevent duplicate execution on retries.
 * 
 * @param {string} url - Target API endpoint
 * @param {Object} data - Payload data
 * @param {string} [customKey] - Optional predefined idempotency key
 * @returns {Promise<Object>} Axios response promise
 */
export const createIdempotentPost = (url, data, customKey = null) => {
  const idempotencyKey = customKey || generateIdempotencyKey();
  return api.post(url, data, {
    headers: {
      'Idempotency-Key': idempotencyKey
    }
  });
};

export { clientCache };
export default api;

