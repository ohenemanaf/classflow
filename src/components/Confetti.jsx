import { useEffect, useRef, useState } from 'react';

const COLORS = ['#0a84ff', '#34c759', '#ff9f0a', '#ff375f', '#5e5ce6', '#64d2ff'];
const DURATION = 2600;

/**
 * A short confetti burst drawn on a canvas. Each change to `burst` fires one.
 * Skipped entirely for people who ask their device to reduce motion.
 */
export default function Confetti({ burst }) {
  const canvas = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!burst || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setActive(burst);
  }, [burst]);

  useEffect(() => {
    if (!active) return undefined;
    const ctx = canvas.current.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.current.width = width * ratio;
    canvas.current.height = height * ratio;
    ctx.scale(ratio, ratio);

    const pieces = Array.from({ length: 140 }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.4,
      y: height * 0.38,
      vx: (Math.random() - 0.5) * 10,
      vy: -(Math.random() * 10 + 6),
      size: Math.random() * 6 + 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length],
      round: Math.random() > 0.55,
    }));

    let frame;
    const start = performance.now();
    const draw = (time) => {
      const elapsed = time - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION);
      for (const p of pieces) {
        p.vy += 0.28;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (elapsed < DURATION) frame = requestAnimationFrame(draw);
      else setActive(0);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvas} data-confetti aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] size-full" />;
}
