'use client';

import { useEffect, useRef, useState } from 'react';

/** Scroll-triggered reveal — timing matches portfolio template fade-in. */
export default function RevealOnScroll({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    setReady(true);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setVisible(true);
      return undefined;
    }

    let showTimer;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          showTimer = window.setTimeout(() => setVisible(true), delay);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, [delay]);

  const revealClass = !ready ? '' : visible ? 'public-reveal-in' : 'public-reveal-out';

  return <div ref={ref} className={[className, revealClass].filter(Boolean).join(' ')}>{children}</div>;
}
