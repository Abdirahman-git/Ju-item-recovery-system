'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Package } from 'lucide-react';

const DEMO_CARDS = [
  { id: 1, type: 'found', title: 'Blue backpack', place: 'Library lobby', cat: 'Bags' },
  { id: 2, type: 'lost', title: 'ID card', place: 'Lecture Hall B', cat: 'ID/Cards' },
  { id: 3, type: 'found', title: 'Wireless earbuds', place: 'Cafeteria', cat: 'Electronics' },
  { id: 4, type: 'lost', title: 'Black umbrella', place: 'Main gate', cat: 'Accessories' },
];

export default function PhoneMockup({ items = [] }) {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  const feed =
    items.length > 0
      ? items.slice(0, 4).map((item, i) => ({
          id: item.id ?? i,
          type: item.itemType,
          title: item.title,
          place: item.location,
          cat: item.category,
        }))
      : DEMO_CARDS;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % feed.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [feed.length, reduced]);

  useEffect(() => {
    if (reduced) return undefined;
    const el = wrapRef.current;
    if (!el) return undefined;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: py * -8, y: px * 10 });
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
    <div ref={wrapRef} className="public-phone-stage relative mx-auto w-[min(100%,280px)] sm:w-[300px]">
      <div className="public-phone-glow" aria-hidden />
      <div className={`public-phone-float ${reduced ? 'public-phone-float--static' : ''}`}>
        <div className={reduced ? undefined : 'public-phone-bob'}>
          <div
            className="public-phone-tilt"
            style={
              reduced
                ? undefined
                : {
                    transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  }
            }
          >
          <div className="public-phone-bezel">
            <div className="public-phone-notch" aria-hidden />
            <div className="public-phone-screen">
              <div className="flex items-center justify-between px-3 pt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">JU LOFO</p>
                  <p className="text-sm font-black text-white">Campus feed</p>
                </div>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-200">
                  Live
                </span>
              </div>

              <div className="mt-3 space-y-2 px-2.5 pb-4">
                {feed.map((card, i) => {
                  const isActive = i === active;
                  const isFound = card.type === 'found';
                  return (
                    <div
                      key={card.id}
                      className={`rounded-xl border px-2.5 py-2.5 transition duration-500 ${
                        isActive
                          ? 'scale-[1.02] border-white/35 bg-white/20 shadow-lg'
                          : 'border-white/10 bg-white/10 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isFound ? 'bg-blue-400/30 text-blue-50' : 'bg-amber-400/30 text-amber-50'
                          }`}
                        >
                          <Package size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-bold text-white">{card.title}</p>
                            {isActive ? (
                              <span className="public-pulse-badge shrink-0 rounded bg-emerald-400 px-1 py-px text-[8px] font-black uppercase text-emerald-950">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-100/70">
                            Lost · {card.cat}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-blue-100/80">
                            <MapPin size={10} />
                            <span className="truncate">{card.place}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
