const ROOT_FONT_SIZE = 16;
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.08;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeScale(width, height) {
  if (!width || !height) {
    return 1;
  }

  const widthReference = width >= 1280 ? 1440 : width >= 768 ? 1024 : 430;
  const heightReference = height >= 900 ? 960 : height >= 700 ? 820 : 760;
  const widthScale = width / widthReference;
  const heightScale = height / heightReference;
  const rawScale = Math.min(widthScale, heightScale);

  return clamp(Number(rawScale.toFixed(3)), MIN_SCALE, MAX_SCALE);
}

export function syncAdaptiveViewport(targetWindow = window, targetDocument = document) {
  if (!targetWindow || !targetDocument) {
    return 1;
  }

  const viewportWidth = targetWindow.innerWidth;
  const viewportHeight = targetWindow.innerHeight;
  const scale = computeScale(viewportWidth, viewportHeight);
  const root = targetDocument.documentElement;

  root.style.setProperty('--app-device-scale', String(scale));
  root.style.setProperty('--app-viewport-width', `${viewportWidth}px`);
  root.style.setProperty('--app-viewport-height', `${viewportHeight}px`);
  root.style.fontSize = `${ROOT_FONT_SIZE * scale}px`;

  return scale;
}

export function installAdaptiveViewport(targetWindow = window, targetDocument = document) {
  if (!targetWindow || !targetDocument) {
    return () => {};
  }

  let rafId = 0;
  const update = () => {
    targetWindow.cancelAnimationFrame(rafId);
    rafId = targetWindow.requestAnimationFrame(() => {
      syncAdaptiveViewport(targetWindow, targetDocument);
    });
  };

  update();
  targetWindow.addEventListener('resize', update);
  targetWindow.addEventListener('orientationchange', update);
  targetWindow.visualViewport?.addEventListener('resize', update);

  return () => {
    targetWindow.cancelAnimationFrame(rafId);
    targetWindow.removeEventListener('resize', update);
    targetWindow.removeEventListener('orientationchange', update);
    targetWindow.visualViewport?.removeEventListener('resize', update);
  };
}
