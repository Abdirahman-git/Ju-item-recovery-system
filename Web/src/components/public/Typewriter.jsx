'use client';

import { useEffect, useState } from 'react';

const DEFAULT_PHRASES = [
  'Campus Lost & Found',
  'Admin-verified recovery',
  'Campus users & staff welcome',
  'Report lost or found',
  'Secure campus holds',
  'Live item feed',
];

/**
 * Typewriter cycle — same timing as the portfolio template.
 */
export default function Typewriter({ phrases = DEFAULT_PHRASES, className = '' }) {
  const [text, setText] = useState('');
  const [reduced, setReduced] = useState(false);
  const phraseKey = phrases.join('|');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const list = phraseKey ? phraseKey.split('|') : DEFAULT_PHRASES;

    if (reduced || !list.length) {
      setText(list[0] || '');
      return undefined;
    }

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const current = list[roleIndex];
      let typeSpeed = 80;

      if (isDeleting) {
        charIndex -= 1;
        setText(current.substring(0, charIndex));
        typeSpeed = 40;
      } else {
        charIndex += 1;
        setText(current.substring(0, charIndex));
        typeSpeed = 80;
      }

      if (!isDeleting && charIndex === current.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % list.length;
        typeSpeed = 400;
      }

      timer = window.setTimeout(tick, typeSpeed);
    };

    timer = window.setTimeout(tick, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phraseKey, reduced]);

  return (
    <span className={className}>
      <span className="public-typed">{text}</span>
      <span className="public-typed-cursor" aria-hidden>
        |
      </span>
    </span>
  );
}
