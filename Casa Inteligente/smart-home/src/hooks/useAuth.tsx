import { useState, useEffect, useContext, createContext } from 'react';
import { authService, type LoginResponse } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null; // Puedes definir una interfaz más específica para el usuario
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (accessToken && refreshToken) {
        console.log('Tokens found in localStorage. Attempting to get profile...');
        try {
          const profile = await authService.getProfile();
          setUser(profile.user);
          setIsAuthenticated(true);
          console.log('Profile fetched successfully. User is authenticated.');
        } catch (error) {
          console.error('Failed to get profile. Attempting to refresh token...', error);
          try {
            await authService.refreshToken(refreshToken);
            console.log('Token refreshed successfully. Retrying to get profile...');
            const profile = await authService.getProfile();
            setUser(profile.user);
            setIsAuthenticated(true);
            console.log('Profile fetched successfully after token refresh. User is authenticated.');
          } catch (refreshError) {
            console.error('Failed to refresh token. Logging out...', refreshError);
            authService.logout();
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } else {
        console.log('No tokens found in localStorage. User is not authenticated.');
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response: LoginResponse = await authService.login(username, password);
      // Los tokens ya se guardan en localStorage dentro de authService.login
      // Ahora obtenemos el perfil del usuario
      const profile = await authService.getProfile();
      setUser(profile.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
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