import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface ParticleApi {
  burst(x: number, y: number, color: string, count: number, style: 'crumbs' | 'sparks' | 'smoke'): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  style: 'crumbs' | 'sparks' | 'smoke';
}

const MAX_PARTICLES = 420;

/**
 * Lightweight particle overlay. Coordinates are fractions of the board (0..1) so resizing
 * never misplaces anything. The animation loop only runs while particles are alive.
 */
export const ParticleCanvas = forwardRef<ParticleApi>(function ParticleCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  const loop = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      raf.current = null;
      return;
    }
    const dt = Math.min(0.05, (now - (last.current || now)) / 1000);
    last.current = now;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const list = parts.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      p.vy += (p.style === 'smoke' ? -0.25 : 2.6) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = p.style === 'smoke' ? k * 0.45 : Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      const px = p.x * w;
      const py = p.y * h;
      const s = p.size * (w / 400);
      if (p.style === 'sparks') {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.life * 12);
        ctx.fillRect(-s, -s * 0.3, s * 2, s * 0.6);
        ctx.fillRect(-s * 0.3, -s, s * 0.6, s * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, p.style === 'smoke' ? s * (2.2 - k) : s * (0.6 + k * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (list.length > 0) raf.current = requestAnimationFrame(loop);
    else {
      raf.current = null;
      last.current = 0;
    }
  };

  useImperativeHandle(ref, () => ({
    burst(x, y, color, count, style) {
      const list = parts.current;
      const n = Math.min(count, MAX_PARTICLES - list.length);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = style === 'smoke' ? 0.05 + Math.random() * 0.06 : 0.15 + Math.random() * 0.35;
        const max = style === 'smoke' ? 0.7 : 0.45 + Math.random() * 0.35;
        list.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (style === 'smoke' ? 0 : 0.25),
          life: max,
          max,
          size: style === 'smoke' ? 7 : 2.4 + Math.random() * 2.6,
          color: style === 'sparks' && i % 2 ? '#fff3b0' : color,
          style,
        });
      }
      if (raf.current === null && list.length > 0) raf.current = requestAnimationFrame(loop);
    },
  }));

  // keep the backing store matched to the element size (and device pixel ratio, capped at 2)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      parts.current = [];
    };
  }, []);

  return <canvas ref={canvasRef} className="ffn-particles" aria-hidden="true" />;
});
