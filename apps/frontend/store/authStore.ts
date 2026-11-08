import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "../types/type";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Set when the session ended because the token expired, so /login can say so. */
  sessionExpired: boolean;
  setUser: (user: User, token: string) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: (opts?: { expired?: boolean }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionExpired: false,
      setUser: (user, token) => set({ user, token, isAuthenticated: true, sessionExpired: false }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
      logout: (opts) => set({ user: null, token: null, isAuthenticated: false, sessionExpired: !!opts?.expired }),
    }),
    {
      name: "auth-storage",
      partialize: ({ user, token, isAuthenticated }) => ({ user, token, isAuthenticated }),
    },
  ),
);
