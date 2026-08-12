'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Custom cursor + follower — same behavior as the portfolio template.
 * Desktop only; expands over interactive targets.
 */
export default function CustomCursor() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const ok =
        fine.matches && !reduced.matches && window.innerWidth > 768 && !('ontouchstart' in window);
      setEnabled(ok);
      if (!ok) {
        document.querySelector('.public-shell')?.classList.remove('public-cursor-on');
      }
    };
    sync();
    fine.addEventListener?.('change', sync);
    reduced.addEventListener?.('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      fine.removeEventListener?.('change', sync);
      reduced.removeEventListener?.('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const cursor = cursorRef.current;
    const follower = followerRef.current;
    if (!cursor || !follower) return undefined;

    const shell = document.querySelector('.public-shell');
    shell?.classList.add('public-cursor-on');

    const onMove = (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      follower.style.left = `${e.clientX}px`;
      follower.style.top = `${e.clientY}px`;
    };

    const isInteractive = (el) =>
      !!el?.closest?.(
        'a, button, [role="button"], input, textarea, select, .public-press, .public-item-card, .public-nav-pill'
      );

    const onOver = (e) => {
      if (isInteractive(e.target)) follower.classList.add('hovering');
    };
    const onOut = (e) => {
      if (isInteractive(e.target)) follower.classList.remove('hovering');
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      shell?.classList.remove('public-cursor-on');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={cursorRef} className="public-cursor" aria-hidden />
      <div ref={followerRef} className="public-cursor-follower" aria-hidden />
    </>
  );
}
