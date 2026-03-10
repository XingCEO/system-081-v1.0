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
