import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService, { type LoginResponse } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const storedAccessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    setAccessToken(storedAccessToken);
    // console.log('checkAuth: Iniciando verificación de autenticación.');
    // console.log('checkAuth: accessToken en localStorage:', storedAccessToken ? 'Presente' : 'Ausente');
    // console.log('checkAuth: refreshToken en localStorage:', refreshToken ? 'Presente' : 'Ausente');

    if (storedAccessToken && refreshToken) {
      // console.log('checkAuth: Tokens encontrados, intentando obtener perfil.');
      try {
        const profile = await authService.getProfile();
        setUser(profile);
        setIsAuthenticated(true);
      } catch (error: any) {
        // console.error('checkAuth: Error durante la verificación de autenticación:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
        setIsAuthenticated(false);
        setUser(null);
        window.location.href = '/login'; // Redirigir al login si la verificación falla
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
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
      setAccessToken(response.access_token);
      const profile = await authService.getProfile();
      setUser(profile);
      setIsAuthenticated(true);
    } catch (error) {
      // console.error('login: Error durante el inicio de sesión.', error);
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, accessToken }}>
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