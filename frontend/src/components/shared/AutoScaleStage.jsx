import { useEffect, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number(value.toFixed(3));
}

export default function AutoScaleStage({
  children,
  designWidth = 1440,
  designHeight = 900,
  minScale = 0.72,
  maxScale = 1.15,
  shellClassName = '',
  stageClassName = ''
}) {
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(designHeight);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateScale = () => {
      const viewportWidth = Math.max(window.innerWidth - 24, 320);
      const viewportHeight = Math.max(window.innerHeight - 24, 320);
      const nextScale = clamp(
        Math.min(viewportWidth / designWidth, viewportHeight / designHeight),
        minScale,
        maxScale
      );

      setScale(round(nextScale));

      if (contentRef.current) {
        setContentHeight(Math.max(designHeight, contentRef.current.scrollHeight));
      }
    };

    updateScale();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (contentRef.current) {
            setContentHeight(Math.max(designHeight, contentRef.current.scrollHeight));
          }
        })
      : null;

    if (resizeObserver && contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    window.visualViewport?.addEventListener('resize', updateScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
      window.visualViewport?.removeEventListener('resize', updateScale);
    };
  }, [designHeight, designWidth, maxScale, minScale]);

  return (
    <div className={shellClassName} style={{ minHeight: '100dvh', overflow: 'auto' }}>
      <div
        className={stageClassName}
        style={{
          width: `${designWidth * scale}px`,
          minHeight: `${contentHeight * scale}px`,
          margin: '0 auto'
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: `${designWidth}px`,
            minHeight: `${designHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
