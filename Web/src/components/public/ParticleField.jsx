'use client';

import { useEffect, useRef } from 'react';

/**
 * Soft constellation — light polish only (not heavy).
 * Matches the clean light JU LOFO landing look.
 */
export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      canvas.style.display = 'none';
      return undefined;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let particles = [];
    let animationId = 0;
    let running = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const isDark = () =>
      document.documentElement.classList.contains('public-dark') ||
      document.querySelector('.public-shell')?.classList.contains('public-dark');

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.7 + 1;
        this.speedX = (Math.random() - 0.5) * 0.32;
        this.speedY = (Math.random() - 0.5) * 0.32;
        this.opacity = Math.random() * 0.3 + 0.5;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
      }

      draw() {
        const dark = isDark();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(191, 219, 254, ${this.opacity})`
          : `rgba(26, 86, 219, ${this.opacity})`;
        ctx.fill();
      }
    }

    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      particles = [];
      // Dense full-page coverage — network across the whole landing viewport
      // Adaptive: ~80 mobile → ~160 large desktop (smooth + visible)
      const count = Math.min(Math.max(Math.floor((width * height) / 9000), 80), 160);
      for (let i = 0; i < count; i += 1) {
        particles.push(new Particle());
      }
    }

    function connectParticles() {
      const maxDist = Math.min(175, Math.max(140, width * 0.12));
      const dark = isDark();
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * (dark ? 0.28 : 0.26);
            ctx.beginPath();
            ctx.strokeStyle = dark
              ? `rgba(147, 197, 253, ${opacity})`
              : `rgba(37, 99, 235, ${opacity})`;
            ctx.lineWidth = 0.9;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      animationId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    initParticles();
    animate();

    const onResize = () => {
      resizeCanvas();
      initParticles();
    };
    window.addEventListener('resize', onResize);

    const onMotionChange = () => {
      if (mq.matches) {
        running = false;
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
      }
    };
    mq.addEventListener?.('change', onMotionChange);

    return () => {
      running = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      mq.removeEventListener?.('change', onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="public-particles" aria-hidden />;
}
