import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      // PIN 碼登入
      login: async (pin) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { pin });
          set({ user: res.data.user, token: res.data.token, isLoading: false });
          return res.data;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      // 登出
      logout: () => {
        const token = get().token;
        if (token) {
          api.post('/auth/logout').catch(() => {});
        }
        set({ user: null, token: null });
      },

      // 取得目前使用者
      fetchMe: async () => {
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data });
        } catch {
          set({ user: null, token: null });
        }
      }
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);
