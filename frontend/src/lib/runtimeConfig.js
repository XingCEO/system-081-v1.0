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

function normalizeBasePath(value) {
  if (typeof value !== 'string') {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
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

export function getAppBasePath() {
  return normalizeBasePath(readWindowConfig().appBasePath)
    || normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH);
}
