import axios from 'axios';

/**
 * Axios Instance Configuration
 * Uses VITE_API_URL or defaults to Render backend in production and localhost in development.
 */
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://finance-flow-agent.onrender.com/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Enables HTTP-only auth cookies to be sent
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Authorization Bearer token from localStorage
api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('ff_auth_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Interceptor for handling 401 & 403 Authorization errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        localStorage.removeItem('ff_auth_token');
      }
      if (status === 403 || status === 401) {
        const message = error.response.data?.message || 'Access denied. Your current role is not authorized for this operation.';
        window.dispatchEvent(new CustomEvent('ff-auth-permission-error', {
          detail: { status, message }
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
