'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Smooth in-page hash scroll. Missing targets (e.g. #get-app off home)
 * fall back to a real navigation instead of a blank jump.
 */
export default function SmoothScrollAnchors() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e) => {
      const anchor = e.target.closest?.('a[href^="#"], a[href*="/#"]');
      if (!anchor) return;

      const raw = anchor.getAttribute('href');
      if (!raw || raw === '#') return;

      // "/#get-app" → "#get-app"
      let hash = raw;
      if (raw.startsWith('/#')) hash = raw.slice(1);
      else if (raw.includes('/#')) {
        const i = raw.indexOf('/#');
        hash = raw.slice(i + 1);
      }
      if (!hash.startsWith('#')) return;

      const target = document.querySelector(hash);
      if (!target) {
        // Off-page or missing section → go home with hash (not a blank jump)
        if (hash === '#get-app' || hash === '#live-campus') {
          e.preventDefault();
          if (pathname === '/') return;
          window.location.assign(`/${hash}`);
        }
        return;
      }

      e.preventDefault();
      const offset = window.matchMedia('(max-width: 1023px)').matches ? 88 : 104;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      try {
        history.pushState(null, '', hash);
      } catch {
        /* ignore */
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  // Open /#hash after hard navigation to home
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const hash = window.location.hash;
    if (!hash || pathname !== '/') return undefined;
    const target = document.querySelector(hash);
    if (!target) return undefined;
    const t = window.setTimeout(() => {
      const offset = window.matchMedia('(max-width: 1023px)').matches ? 88 : 104;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
