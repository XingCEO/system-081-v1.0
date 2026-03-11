export async function loadRuntimeConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  const runtimeConfigUrl = new URL(`${import.meta.env.BASE_URL}runtime-config.js`, window.location.href);

  try {
    await import(/* @vite-ignore */ runtimeConfigUrl.href);
  } catch {
    window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
  }
}
