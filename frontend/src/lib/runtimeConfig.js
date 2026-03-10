function readWindowConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__APP_CONFIG__ || {};
}

function normalizeUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/$/, '');
}

export function getApiBaseUrl() {
  return normalizeUrl(readWindowConfig().apiBaseUrl)
    || normalizeUrl(import.meta.env.VITE_API_BASE_URL)
    || '/api';
}

export function getSocketUrl() {
  return normalizeUrl(readWindowConfig().socketUrl)
    || normalizeUrl(import.meta.env.VITE_SOCKET_URL);
}
