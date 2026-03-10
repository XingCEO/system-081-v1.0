import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { clearAuthSession, readAuthSession } from '../lib/authSession';

export const useAdminAuthStore = create(
  persist(
    (set, get) => ({
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
      async logout() {
        try {
          const { refreshToken } = readAuthSession();
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken }, { skipAuthRefresh: true });
          }
        } catch {
          // Ignore logout transport failures and still clear the local session.
        }

        clearAuthSession();
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
