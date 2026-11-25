import { useRef, useEffect } from 'react';

const DEFAULTS = {
  x: 50,
  y: 50,
  radius: 10,
  density: 30,
  gap: 40,
  particleSize: 4,
  colors: ['#ffffff'],
  direction: 'inside',
  speed: 2,
};

export default function ParticleVoid(props) {
  const {
    x = DEFAULTS.x,
    y = DEFAULTS.y,
    radius = DEFAULTS.radius,
    density = DEFAULTS.density,
    gap = DEFAULTS.gap,
    particleSize = DEFAULTS.particleSize,
    colors = DEFAULTS.colors,
    direction = DEFAULTS.direction,
    speed = DEFAULTS.speed,
    style,
  } = props;

  const speedAmt = Math.max(0, speed) / 2;
  const flowSpeed = direction === 'inside' ? -speedAmt : speedAmt;
  const perspective = 200;
  const tunnelSpread = 1;
  const maxDepth = 600;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(0);
  const sizeRef = useRef({ w: 600, h: 400 });
  const offsetRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        sizeRef.current = { w: width, h: height };
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const wrap = (val, max) => ((val % max) + max) % max;

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 16.667, 3);
      lastTime = now;

      const { w, h } = sizeRef.current;
      const dpr = window.devicePixelRatio || 1;

      offsetRef.current = wrap(offsetRef.current - flowSpeed * dt, maxDepth);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const centreCx = (x / 100) * w;
      const centreCy = (y / 100) * h;
      const oxPx = centreCx - cx;
      const oyPx = centreCy - cy;
      const scaleVoid = perspective / (perspective + maxDepth);
      const R_centre_3d = radius / scaleVoid;

      const activeDensity = Math.max(density, 1);
      const activeGap = Math.max(gap, 10);
      const particlesPerSpoke = Math.max(1, Math.round(maxDepth / activeGap));
      const effGap = maxDepth / particlesPerSpoke;

      const projected = [];

      for (let i = 0; i < activeDensity; i++) {
        const baseAngle = (i / activeDensity) * Math.PI * 2;

        for (let k = 0; k < particlesPerSpoke; k++) {
          const z = wrap(offsetRef.current + k * effGap, maxDepth);
          const depthFactor = z / maxDepth;
          const scale = perspective / (perspective + z);

          const projCx = cx + oxPx * depthFactor;
          const projCy = cy + oyPx * depthFactor;

          const R_3d = R_centre_3d + (1 - depthFactor) * tunnelSpread * (w / 2);
          const R_proj = R_3d * scale;

          const px = projCx + R_proj * Math.cos(baseAngle);
          const py = projCy + R_proj * Math.sin(baseAngle);

          if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

          const size = Math.max(0.4, particleSize * scale);
          const alpha = Math.max(0.05, 1 - depthFactor * 0.9);
          const colorIdx = (i + k) % colors.length;

          projected.push({ x: px, y: py, size, alpha, z, color: colors[colorIdx] });
        }
      }

      projected.sort((a, b) => b.z - a.z);

      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centreCx, centreCy, radius, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [x, y, radius, density, gap, particleSize, colors, flowSpeed]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        ...style,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
