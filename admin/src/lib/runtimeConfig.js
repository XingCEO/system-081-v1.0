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

export function getAppBasePath() {
  const configuredBasePath = normalizeBasePath(readWindowConfig().appBasePath)
    || normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH);

  if (configuredBasePath && configuredBasePath !== '/') {
    return configuredBasePath;
  }

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return '/admin';
  }

  return '/';
}

export function resolveAssetUrl(assetPath) {
  if (!assetPath) {
    return '';
  }

  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (/^https?:\/\//.test(apiBaseUrl)) {
    return `${new URL(apiBaseUrl).origin}${assetPath}`;
  }

  return assetPath;
}
