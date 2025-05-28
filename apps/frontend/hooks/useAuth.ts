import api from "../lib/axios";
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { setUser, logout } = useAuthStore();

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/signin', { email, password });
    setUser(res.data.user, res.data.token);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/signup', { name, email, password });
    setUser(res.data.user, res.data.token);
  };

  return { login, register, logout };
};
