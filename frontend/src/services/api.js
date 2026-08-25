import axios from 'axios';

/**
 * Axios Instance Configuration (Phase 4 Enterprise Edition)
 * Uses VITE_API_URL or defaults to Render backend in production and localhost in development.
 * Automatically injects X-Correlation-ID and Authorization headers on all requests.
 */
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://finance-flow-agent.onrender.com/api' : 'http://localhost:5000/api');

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

// Request Interceptor: Attach Auth Token & Correlation ID
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

  return reqConfig;
});

// Response Interceptor: Handling 401 & 403 PBAC Authorization errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const correlationId = error.response.headers?.['x-correlation-id'] || error.response.data?.correlationId;

      if (status === 401) {
        localStorage.removeItem('ff_auth_token');
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

export default api;
