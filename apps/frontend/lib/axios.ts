import axios from 'axios';
import { useAuthStore } from "../store/authStore";

//Basically middleware for adding bearer token
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});
// console.log(api);
//intercerptor is like burp intercept req check if its in browser then add bearer token
api.interceptors.request.use((config) => {
  // const tokenFromStore = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const tokenFromStorage = useAuthStore.getState().token;
  const token =  tokenFromStorage;
  // console.log(token)
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;