import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, RegisterPayload } from '../types';
import { authApi } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (reg_or_emp_id: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  getHomeRouteForRole: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('fixmaster_token');
      const storedUser = localStorage.getItem('fixmaster_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to rehydrate auth state:', err);
      localStorage.removeItem('fixmaster_token');
      localStorage.removeItem('fixmaster_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHomeRouteForRole = (role?: string): string => {
    const targetRole = role || user?.role;
    switch (targetRole) {
      case 'STUDENT':
        return '/student';
      case 'STAFF':
        return '/staff';
      case 'SUPERVISOR':
      case 'ADMIN':
        return '/supervisor';
      default:
        return '/login';
    }
  };

  const login = async (reg_or_emp_id: string, password: string): Promise<User> => {
    const res: AuthResponse = await authApi.login({ reg_or_emp_id, password });
    localStorage.setItem('fixmaster_token', res.token);
    localStorage.setItem('fixmaster_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const res = await authApi.register(payload);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('fixmaster_token');
    localStorage.removeItem('fixmaster_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        getHomeRouteForRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
