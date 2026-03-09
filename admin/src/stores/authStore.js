import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useAdminAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      async login(name, password) {
        set({ loading: true });
        try {
          const response = await api.post('/auth/login', { name, password });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            loading: false
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      logout() {
        set({
          user: null,
          accessToken: null,
          refreshToken: null
        });
      }
    }),
    {
      name: 'breakfast-admin-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);
