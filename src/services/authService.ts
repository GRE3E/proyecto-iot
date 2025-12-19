import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const REFRESH_URL = "/auth/auth/refresh-token";
const decodeJwt = (t?: string) => {
  try {
    if (!t) return null;
    const parts = t.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload;
  } catch {
    return null;
  }
};
const isExpiringSoon = (t?: string, thresholdSec = 30) => {
  const p = decodeJwt(t);
  if (!p || typeof p.exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return p.exp - now <= thresholdSec;
};

let refreshPromise: Promise<string | null> | null = null;
let isRefreshing = false;

async function refreshTokens(): Promise<string | null> {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return null;
  if (refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await axiosInstance.post<LoginResponse>(REFRESH_URL, {
        refresh_token: rt,
      });
      const { access_token, refresh_token: newRefresh } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", newRefresh);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
      return access_token;
    } catch (e) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("access_token");
  if (!token) return await refreshTokens();
  if (!isExpiringSoon(token)) return token;
  const newToken = await refreshTokens();
  return newToken || token;
}

axiosInstance.interceptors.request.use(
  async (config) => {
    const url = config.url || "";
    const isRefresh = url.includes(REFRESH_URL);
    const token = localStorage.getItem("access_token");
    if (!isRefresh && token) {
      if (isExpiringSoon(token) && !isRefreshing) {
        await refreshTokens();
      }
      config.headers.Authorization = `Bearer ${
        localStorage.getItem("access_token") || token
      }`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es una solicitud de refresh-token y no hemos reintentado
    const isRefreshCall = (originalRequest?.url || "").includes(REFRESH_URL);
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
      originalRequest._retry = true;
      const newToken = await refreshTokens();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      }
      return Promise.reject(error);
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
      throw error;
    }
  },

  async getProfile(): Promise<any> {
    try {
      const response = await axiosInstance.get("/auth/auth/me");
      return response.data;
    } catch (error) {
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
