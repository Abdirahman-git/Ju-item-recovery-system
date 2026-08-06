'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * iPhone-style frame with clear full-screen screenshot
 * (no Dynamic Island overlay — keeps Jazeera branding visible).
 */
export default function HeroPhoneFrame({
  src = '/phone.png',
  alt = 'JU LOFO mobile app',
}) {
  const stageRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const img = stage?.querySelector('img');
    if (img?.complete && img.naturalWidth > 0) {
      setReady(true);
    }
    const failSafe = window.setTimeout(() => setReady(true), 2200);
    return () => window.clearTimeout(failSafe);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    const el = stageRef.current;
    if (!el) return undefined;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Math.max(-1, Math.min(1, py)) * -9,
        y: Math.max(-1, Math.min(1, px)) * 12,
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [reduced]);

  return (
    <div
      ref={stageRef}
      className={`public-phone-stage relative mx-auto w-[min(100%,292px)] sm:w-[310px] lg:ml-auto lg:mr-0 ${
        ready ? 'public-phone-stage--ready' : 'public-phone-stage--loading'
      }`}
    >
      <div
        className={`public-phone-float ${
          ready ? (reduced ? 'public-phone-float--static' : '') : 'public-phone-float--pending'
        }`}
      >
        <div className="public-phone-glow" aria-hidden />

        <div className={ready && !reduced ? 'public-phone-bob' : undefined}>
          <div
            className="public-phone-tilt"
            style={
              reduced || !ready
                ? undefined
                : {
                    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  }
            }
          >
            <div className="public-device-btn public-device-btn--silent" aria-hidden />
            <div className="public-device-btn public-device-btn--vol-up" aria-hidden />
            <div className="public-device-btn public-device-btn--vol-down" aria-hidden />
            <div className="public-device-btn public-device-btn--power" aria-hidden />

            <div className="public-device public-device--pro-max">
              <div className="public-device-shell">
                <div className="public-device-bezel">
                  <div className="public-device-screen">
                    <Image
                      src={src}
                      alt={alt}
                      width={2132}
                      height={4610}
                      priority
                      className="public-device-shot"
                      sizes="(max-width: 640px) 270px, 290px"
                      onLoad={() => setReady(true)}
                      onError={() => setReady(true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
