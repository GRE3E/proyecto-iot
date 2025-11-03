import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Instancia de Axios para manejar interceptores
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Variable para evitar múltiples solicitudes de refresco de token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Interceptor de solicitud: añade el token de acceso a todas las peticiones
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta: maneja el refresco de tokens
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es una solicitud de refresco de token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Marca la solicitud como reintentada

      if (isRefreshing) {
        // Si ya se está refrescando, añade la solicitud a la cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true; // Indica que se está refrescando el token

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // Si no hay refresh token, redirige al login
        authService.logout();
        window.location.href = '/login'; // O la ruta de tu página de login
        return Promise.reject(error);
      }

      try {
        const response = await authService.refreshToken(refreshToken);
        const newAccessToken = response.access_token;
        localStorage.setItem('access_token', newAccessToken);

        // Reintenta todas las solicitudes en cola con el nuevo token
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Si el refresco falla, vacía la cola y redirige al login
        processQueue(refreshError);
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    console.log("Intentando iniciar sesión con:", username); // <-- Añadido para depuración
    try {
      const response = await axiosInstance.post(
        `/auth/auth/login`,
        {
          username,
          password,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      // Guardar tokens en localStorage
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.detail || 'Error en la autenticación');
      }
      throw new Error('Error de conexión con el servidor');
    }
  },

  async refreshToken(refresh_token: string): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/auth/refresh-token`, {
        refresh_token
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      return response.data;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw new Error('Sesión expirada');
    }
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getProfile(): Promise<any> {
    try {
      const response = await axiosInstance.get(`/auth/auth/me`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
};