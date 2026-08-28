import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import type { User, AuthContextType } from '../types/auth';

/**
 * Context: Authentication & User Session Management
 *
 * Persists JWT token and user profile in localStorage and synchronizes with
 * backend session via `GET /api/v1/auth/me` on load and hard refresh.
 */
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('ff_user_profile');
      return savedUser ? (JSON.parse(savedUser) as User) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const checkAuth = async (): Promise<void> => {
    try {
      const response = await api.get('/auth/me');
      const userData = (response.data?.data?.user ?? response.data?.data ?? null) as User | null;
      if (userData) {
        setUser(userData);
        localStorage.setItem('ff_user_profile', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('ff_user_profile');
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status &&
        [401, 403].includes((error as { response: { status: number } }).response.status)
      ) {
        setUser(null);
        localStorage.removeItem('ff_auth_token');
        localStorage.removeItem('ff_user_profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User | undefined> => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.data) {
      const userData = (response.data.data.user ?? response.data.data) as User;
      if (response.data.data.token) {
        localStorage.setItem('ff_auth_token', response.data.data.token as string);
      }
      localStorage.setItem('ff_user_profile', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    return undefined;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
