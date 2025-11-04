import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, type LoginResponse } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (accessToken && refreshToken) {
      try {
        const profile = await authService.getProfile();
        setUser(profile);
        setIsAuthenticated(true);
      } catch (error: any) {
        if (error.response?.status === 401) {
          try {
            await authService.refreshToken(refreshToken);
            const profile = await authService.getProfile();
            setUser(profile);
            setIsAuthenticated(true);
          } catch (refreshError) {
            authService.logout();
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          authService.logout();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response: LoginResponse = await authService.login(username, password);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('login: Error durante el inicio de sesión.', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};