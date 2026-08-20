import axios from 'axios';

/**
 * Axios Instance Configuration
 * Base URL pointing to Express Backend API on port 5000.
 */
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Enables HTTP-only auth cookies to be sent
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor for handling 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: redirect to login if session expires
    }
    return Promise.reject(error);
  }
);

export default api;
