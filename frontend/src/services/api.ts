import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { clientCache } from './cacheService';

/**
 * Axios Instance Configuration (Phase 6 Enterprise Cache Architecture)
 * Uses VITE_API_URL or defaults to Render backend in production and localhost in development.
 */
const BASE_URL: string =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://finance-flow-agent-1.onrender.com/api'
    : 'http://localhost:5000/api');

export const generateCorrelationId = (): string => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
  return `FF-${today}-${randomHex}`;
};

export const generateIdempotencyKey = (prefix = 'ACT'): string => {
  const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}-${randomHex}`;
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor: Attach Auth Token, Correlation ID & Transparent Client Cache
api.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('ff_auth_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }

  const isRemoteRender = BASE_URL.includes('onrender.com');
  if (!isRemoteRender && reqConfig.headers && !reqConfig.headers['X-Correlation-ID']) {
    reqConfig.headers['X-Correlation-ID'] = generateCorrelationId();
  }

  const method = (reqConfig.method || 'get').toLowerCase();
  const bypassCache =
    (reqConfig.headers?.['x-bypass-cache'] as string | undefined) ||
    (reqConfig.params as Record<string, unknown> | undefined)?._nocache;

  if (method === 'get' && !bypassCache) {
    const cacheKey = clientCache.generateKey(reqConfig.url || '', reqConfig.params as Record<string, unknown>);
    const cached = clientCache.get(cacheKey);
    if (cached) {
      reqConfig.adapter = async () => ({
        data: cached,
        status: 200,
        statusText: 'OK (Client Cache)',
        headers: { 'x-client-cache': 'HIT', 'x-cache-key': cacheKey },
        config: reqConfig,
        request: {},
      });
    }
  }

  return reqConfig;
});

// Response Interceptor: Caching, Invalidation, and 401/403 error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const method = (response.config.method || 'get').toLowerCase();
    const url = response.config.url || '';

    if (
      method === 'get' &&
      response.status === 200 &&
      (response.headers as Record<string, string>)?.['x-client-cache'] !== 'HIT'
    ) {
      const cacheKey = clientCache.generateKey(url, response.config.params as Record<string, unknown>);
      const tags = clientCache.inferTagsFromUrl(url);
      const ttl = clientCache.getTtlForUrl(url);
      clientCache.set(cacheKey, response.data, ttl, tags);
    }

    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const tags = clientCache.inferTagsFromUrl(url);
      tags.forEach(tag => clientCache.invalidateByTag(tag));
    }

    return response;
  },
  (error: unknown) => {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object'
    ) {
      const resp = error.response as {
        status: number;
        headers?: Record<string, string>;
        data?: { correlationId?: string; message?: string; requiredPermission?: string };
      };
      const status = resp.status;
      const correlationId = resp.headers?.['x-correlation-id'] ?? resp.data?.correlationId;

      if (status === 401) {
        localStorage.removeItem('ff_auth_token');
      }

      if (status === 403 || status === 401) {
        const message = resp.data?.message ?? 'Access denied. Your current role is not authorized for this operation.';
        const requiredPermission = resp.data?.requiredPermission;

        window.dispatchEvent(
          new CustomEvent('ff-auth-permission-error', {
            detail: { status, message, requiredPermission, correlationId },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export interface CachedGetOptions {
  params?: Record<string, unknown>;
  ttl?: number;
  bypassCache?: boolean;
  tags?: string[];
}

export const cachedGet = async (url: string, options: CachedGetOptions = {}): Promise<AxiosResponse> => {
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
        config: { url, params } as InternalAxiosRequestConfig,
        request: {},
      } as AxiosResponse;
    }
  }

  const res = await api.get(url, { params });
  const inferredTags = tags ?? clientCache.inferTagsFromUrl(url);
  clientCache.set(cacheKey, res.data, ttl, inferredTags);

  return {
    ...res,
    headers: { ...res.headers, 'x-client-cache': 'MISS', 'x-cache-key': cacheKey },
  };
};

export const createIdempotentPost = (
  url: string,
  data: unknown,
  customKey: string | null = null
): Promise<AxiosResponse> => {
  const idempotencyKey = customKey ?? generateIdempotencyKey();
  return api.post(url, data, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
};

export { clientCache };
export default api;
