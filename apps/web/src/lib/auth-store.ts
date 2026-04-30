import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from './api-client';

interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: { id: string; nombre: string };
  permisos: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; nombre: string; apellido: string }) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post('/auth/login', { username, password });
          const result = data.data ?? data;

          localStorage.setItem('access_token', result.accessToken);
          localStorage.setItem('refresh_token', result.refreshToken);

          set({
            user: result.usuario,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const { data: response } = await apiClient.post('/auth/register', data);
          const result = response.data ?? response;

          localStorage.setItem('access_token', result.accessToken);
          localStorage.setItem('refresh_token', result.refreshToken);

          set({
            user: result.usuario,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      fetchProfile: async () => {
        try {
          const { data } = await apiClient.get('/auth/profile');
          const result = data.data ?? data;
          set({ user: result, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        return user.permisos.includes(permission);
      },

      hasRole: (role: string) => {
        const { user } = get();
        if (!user) return false;
        return user.rol.nombre === role;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
