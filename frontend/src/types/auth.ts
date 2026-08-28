// ============================================================
// auth.ts — Authentication & RBAC domain types
// ============================================================

export type UserRole = 'owner' | 'admin' | 'viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  avatar?: string;
  created_at?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | undefined>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
