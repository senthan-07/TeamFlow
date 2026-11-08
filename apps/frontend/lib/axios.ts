import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "./config";

const api = axios.create({ baseURL: API_URL });

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or revoked token signs the user out; AuthGuard then sends them to /login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/sign");
    if (error.response?.status === 401 && !isAuthCall && useAuthStore.getState().token) {
      useAuthStore.getState().logout({ expired: true });
    }
    return Promise.reject(error);
  },
);

export default api;
