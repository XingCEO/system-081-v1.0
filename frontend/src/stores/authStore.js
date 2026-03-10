import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { clearAuthSession, readAuthSession } from '../lib/authSession';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      async loginWithPassword(name, password) {
        set({ loading: true });
        try {
          const response = await api.post('/auth/login', { name, password });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            loading: false
          });
          return response;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      async loginWithPin(pin) {
        set({ loading: true });
        try {
          const response = await api.post('/auth/pin', { pin });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            loading: false
          });
          return response;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      async fetchProfile() {
        const user = await api.get('/auth/me');
        set({ user });
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
      name: 'breakfast-pos-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);
