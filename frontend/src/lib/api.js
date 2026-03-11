import axios from 'axios';
import { getApiBaseUrl } from './runtimeConfig';
import { clearAuthSession, readAuthSession, writeAuthSession } from './authSession';

function resolveApiBaseUrl() {
  return getApiBaseUrl();
}

const api = axios.create();

let refreshPromise;

api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    config.baseURL = resolveApiBaseUrl();
  }

  const { accessToken } = readAuthSession();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function refreshAccessToken() {
  const { refreshToken } = readAuthSession();

  if (!refreshToken) {
    throw new Error('missing_refresh_token');
  }

  if (!refreshPromise) {
    refreshPromise = axios.post(`${resolveApiBaseUrl()}/auth/refresh`, { refreshToken })
      .then((response) => {
        const payload = response.data.data ?? response.data;
        writeAuthSession({
          user: payload.user,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken
        });
        return payload.accessToken;
      })
      .catch((error) => {
        clearAuthSession();
        throw error.response?.data || error;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response.data.data ?? response.data,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = String(originalRequest.url || '');

    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/pin') &&
      !requestUrl.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${accessToken}`
        };
        return api.request(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default api;
