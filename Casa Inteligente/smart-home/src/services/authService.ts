import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es una solicitud de refresh-token y no hemos reintentado
    const isRefreshCall = (originalRequest?.url || "").includes(
      "/auth/auth/refresh-token"
    );
    const isLoginCall = (originalRequest?.url || "").includes(
      "/auth/auth/login"
    );

    // Si es un 401 del endpoint de login, simplemente rechazamos la promesa para que useLogin lo maneje.
    // Esto evita cualquier lógica de refresco de token o redirección para intentos de login fallidos.
    if (error.response?.status === 401 && isLoginCall) {
      return Promise.reject(error);
    }

    // Si el error es 401 y no es una solicitud de refresh-token y no hemos reintentado
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshCall
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        console.error(
          "authService: No hay refresh_token en localStorage. Redirigiendo al login."
        );
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // console.log('authService: Valor del refresh_token antes de la llamada a la API:', refreshToken);
      // console.log('authService: Intentando refrescar token. Refresh token:', refreshToken);
      return new Promise(async (resolve, reject) => {
        try {
          const response = await axiosInstance.post<LoginResponse>(
            "/auth/auth/refresh-token",
            { refresh_token: refreshToken }
          );
          // console.log('authService: Respuesta exitosa de refresh-token:', response.data);
          const { access_token, refresh_token: newRefreshToken } =
            response.data;
          // console.log('authService: Nuevos tokens recibidos - access_token:', access_token ? 'Presente' : 'Ausente', 'newRefreshToken:', newRefreshToken ? 'Presente' : 'Ausente');
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", newRefreshToken);
          // console.log('authService: Nuevos tokens guardados en localStorage.');

          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          failedQueue.forEach((prom) => prom.resolve(access_token));
          resolve(axiosInstance(originalRequest));
        } catch (refreshError) {
          // console.error('authService: Error refrescando token o refresh_token inválido:', refreshError);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          failedQueue.forEach((prom) => prom.reject(refreshError));
          window.location.href = "/login";
          reject(refreshError);
        } finally {
          failedQueue = [];
          isRefreshing = false;
        }
      });
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

const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await axiosInstance.post<LoginResponse>(
        "/auth/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      return response.data;
    } catch (error) {
      // console.error('Error en login:', error);
      throw error;
    }
  },

  async getProfile(): Promise<any> {
    try {
      const response = await axiosInstance.get("/auth/auth/me");
      return response.data;
    } catch (error) {
      // console.error('Error al obtener perfil:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  },
};

export default authService;
