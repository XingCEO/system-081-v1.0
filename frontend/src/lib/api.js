import axios from 'axios';
import { getApiBaseUrl } from './runtimeConfig';

function resolveApiBaseUrl() {
  return getApiBaseUrl();
}

function getPersistedAuth() {
  try {
    const raw = localStorage.getItem('breakfast-pos-auth');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed.state || {};
  } catch {
    return {};
  }
}

const api = axios.create({
  baseURL: resolveApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const { accessToken } = getPersistedAuth();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data.data ?? response.data,
  (error) => Promise.reject(error.response?.data || error)
);

export default api;
