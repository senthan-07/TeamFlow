import axios from 'axios';
import { useAuthStore } from "@/store/authStore";

//Basically middleware for adding bearer token
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

//intercerptor is like burp intercept req check if its in browser then add bearer token
api.interceptors.request.use((config) => {
  // const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
