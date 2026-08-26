import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Context: Authentication & User Session Management
 *
 * Persists JWT token and user profile in localStorage and synchronizes with
 * backend session via `GET /api/v1/auth/me` on load and hard refresh.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('ff_user_profile');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Fetch current logged-in user session on load / hard refresh
  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data?.data?.user || response.data?.data || null;
      if (userData) {
        setUser(userData);
        localStorage.setItem('ff_user_profile', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('ff_user_profile');
      }
    } catch (error) {
      // If 401 Unauthorized or expired token, clear user session
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setUser(null);
        localStorage.removeItem('ff_auth_token');
        localStorage.removeItem('ff_user_profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data && response.data.data) {
      const userData = response.data.data.user || response.data.data;
      if (response.data.data.token) {
        localStorage.setItem('ff_auth_token', response.data.data.token);
      }
      localStorage.setItem('ff_user_profile', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('ff_auth_token');
    localStorage.removeItem('ff_user_profile');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
