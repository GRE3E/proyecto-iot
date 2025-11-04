import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        const response = await axiosInstance.post('/auth/auth/refresh-token', { refreshToken });
        const { access_token, refresh_token: newRefreshToken } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Redirigir al login o manejar el error de otra manera
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: any; // Define una interfaz más específica para el usuario si es necesario
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axiosInstance.post<LoginResponse>('/auth/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      return response.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>('/auth/auth/refresh-token', { refreshToken });
    localStorage.setItem('accessToken', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);
    return response.data;
  },

  async getProfile(): Promise<any> {
    try {
      const response = await axiosInstance.get('/auth/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },
};