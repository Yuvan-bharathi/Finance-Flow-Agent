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

// Interceptor for handling 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      localStorage.removeItem('ff_auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
