'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  CircleCheck,
  HandHelping,
  Radio,
  Smartphone,
} from 'lucide-react';
import RevealOnScroll from '@/components/public/RevealOnScroll';

const STEPS = [
  {
    n: 1,
    title: 'Report',
    body: 'Open the app, add a photo and details, and submit from anywhere on campus.',
    tag: 'App',
    Icon: Smartphone,
  },
  {
    n: 2,
    title: 'Review',
    body: 'Campus admins check every listing for accuracy before anything goes live.',
    tag: 'Admin',
    Icon: ClipboardCheck,
  },
  {
    n: 3,
    title: 'Goes live',
    body: 'Approved items appear in the student app feed, ready to be found.',
    tag: 'Feed',
    Icon: Radio,
  },
  {
    n: 4,
    title: 'Claim',
    body: 'If it is yours, claim in the verified app flow. Contact stays private.',
    tag: 'Verified',
    Icon: HandHelping,
  },
  {
    n: 5,
    title: 'Recovered',
    body: 'Staff confirm ownership, complete the handoff, and close the loop.',
    tag: 'Done',
    Icon: CircleCheck,
  },
];

/** Path progress milestones: step N appears when snake reaches this fraction. */
const STEP_AT = [0, 0.25, 0.5, 0.75, 1];
const DRAW_MS = 4200;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function StepCopy({ step, visible }) {
  return (
    <div className={`public-wf-copy public-wf-pop ${visible ? 'is-on' : ''}`}>
      <p className="public-wf-tag">{step.tag}</p>
      <h3 className="public-wf-title">{step.title}</h3>
      <p className="public-wf-body">{step.body}</p>
    </div>
  );
}

function StepNode({ step, visible, size = 'md' }) {
  const Icon = step.Icon;
  return (
    <div
      className={`public-wf-node group/node public-wf-pop ${visible ? 'is-on' : ''} ${
        size === 'sm' ? 'public-wf-node--sm' : ''
      }`}
    >
      <span className="public-wf-badge tabular-nums">{step.n}</span>
      <span className="public-wf-circle">
        <Icon size={size === 'sm' ? 18 : 26} strokeWidth={1.85} aria-hidden />
      </span>
    </div>
  );
}

export default function ProcessZigzag() {
  const rootRef = useRef(null);
  const pathRef = useRef(null);
  const rafRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [pathReady, setPathReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisibleCount(5);
      const path = pathRef.current;
      if (path) {
        path.style.strokeDasharray = 'none';
        path.style.strokeDashoffset = '0';
      }
      setPathReady(true);
      return undefined;
    }

    const el = rootRef.current;
    if (!el) return undefined;

    let started = false;
    let cancelled = false;

    const run = () => {
      if (started || cancelled) return;
      started = true;

      const path = pathRef.current;
      const length = path?.getTotalLength?.() || 1200;
      if (path) {
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        setPathReady(true);
      }

      // Step 1 pops first, then snake starts toward 2…5
      setVisibleCount(1);
      const start = performance.now();
      let lastShown = 1;

      const tick = (now) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / DRAW_MS);
        const p = easeOutCubic(t);

        if (path) {
          path.style.strokeDashoffset = `${length * (1 - p)}`;
        }

        let shown = 1;
        for (let i = 0; i < STEP_AT.length; i += 1) {
          if (p + 0.001 >= STEP_AT[i]) shown = i + 1;
        }
        if (shown !== lastShown) {
          lastShown = shown;
          setVisibleCount(shown);
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setVisibleCount(5);
          if (path) path.style.strokeDashoffset = '0';
          // Stop — no loop
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) run();
      },
      { threshold: 0.28, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isOn = (n) => visibleCount >= n;

  return (
    <RevealOnScroll>
      <div
        ref={rootRef}
        className="public-wf relative overflow-hidden rounded-[1.75rem] px-4 py-11 sm:px-8 sm:py-14 lg:px-12 lg:py-16"
      >
        <div className="public-wf-glow" aria-hidden />

        <div className="relative text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A56DB]">
            5 steps
          </p>
          <h2 className="mt-2.5 text-balance text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">
            Campus Recovery Workflow
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-sm font-medium leading-relaxed text-slate-600 sm:text-[15px]">
            From report to return, one clear flow built for trust on campus.
          </p>
        </div>

        {/* Mobile only — clean center-rail zigzag (no text/path overlap). Desktop W unchanged. */}
        <ol className="public-wf-snake mt-10" aria-label="Campus recovery steps">
          <svg className="public-wf-snake-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path className="public-wf-snake-track" d="M50 4 V96" />
            <path
              className={`public-wf-snake-draw ${pathReady || visibleCount > 0 ? 'is-ready' : ''} ${
                visibleCount >= 5 ? 'is-done' : ''
              }`}
              d="M50 4 V96"
              style={{
                strokeDasharray: 200,
                strokeDashoffset: Math.max(0, 200 * (1 - Math.max(visibleCount - 1, 0) / 4)),
              }}
            />
          </svg>

          {STEPS.map((step, i) => {
            const right = i % 2 === 1;
            return (
              <li
                key={step.n}
                className={`public-wf-snake-row ${right ? 'public-wf-snake-row--right' : ''} ${
                  isOn(step.n) ? 'is-on' : ''
                }`}
              >
                <div className="public-wf-snake-bundle">
                  {!right ? (
                    <div className={`public-wf-snake-copy public-wf-pop ${isOn(step.n) ? 'is-on' : ''}`}>
                      <p className="public-wf-tag">{step.tag}</p>
                      <h3 className="public-wf-title">{step.title}</h3>
                    </div>
                  ) : null}

                  <div className="public-wf-snake-node">
                    <span className="public-wf-snake-stub" aria-hidden />
                    <StepNode step={step} visible={isOn(step.n)} />
                  </div>

                  {right ? (
                    <div className={`public-wf-snake-copy public-wf-pop ${isOn(step.n) ? 'is-on' : ''}`}>
                      <p className="public-wf-tag">{step.tag}</p>
                      <h3 className="public-wf-title">{step.title}</h3>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Desktop / tablet wide — W diagram unchanged */}
        <div
          className="public-wf-diagram mx-auto mt-12 max-w-5xl lg:mt-14 lg:max-w-6xl"
          role="list"
          aria-label="Campus recovery steps"
        >
          <div className="grid grid-cols-5 gap-4 lg:gap-5">
            <div className="flex flex-col items-center gap-3.5" role="listitem">
              <StepCopy step={STEPS[0]} visible={isOn(1)} />
              <StepNode step={STEPS[0]} visible={isOn(1)} />
            </div>
            <div aria-hidden />
            <div className="flex flex-col items-center gap-3.5" role="listitem">
              <StepCopy step={STEPS[2]} visible={isOn(3)} />
              <StepNode step={STEPS[2]} visible={isOn(3)} />
            </div>
            <div aria-hidden />
            <div className="flex flex-col items-center gap-3.5" role="listitem">
              <StepCopy step={STEPS[4]} visible={isOn(5)} />
              <StepNode step={STEPS[4]} visible={isOn(5)} />
            </div>
          </div>

          <div className="public-wf-path-wrap relative -my-0.5 h-28 w-full lg:h-32">
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 1000 200"
              fill="none"
              aria-hidden
              preserveAspectRatio="none"
            >
              <path
                className="public-wf-dash public-wf-dash--track"
                d="M100 20 L300 180 L500 20 L700 180 L900 20"
              />
              <path
                ref={pathRef}
                className={`public-wf-dash public-wf-dash--draw ${pathReady ? 'is-ready' : ''}`}
                d="M100 20 L300 180 L500 20 L700 180 L900 20"
              />
            </svg>
          </div>

          <div className="grid grid-cols-5 gap-4 lg:gap-5">
            <div aria-hidden />
            <div className="flex flex-col items-center gap-3.5" role="listitem">
              <StepNode step={STEPS[1]} visible={isOn(2)} />
              <StepCopy step={STEPS[1]} visible={isOn(2)} />
            </div>
            <div aria-hidden />
            <div className="flex flex-col items-center gap-3.5" role="listitem">
              <StepNode step={STEPS[3]} visible={isOn(4)} />
              <StepCopy step={STEPS[3]} visible={isOn(4)} />
            </div>
            <div aria-hidden />
          </div>
        </div>

        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12">
          <a
            href="#get-app"
            className="public-press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(26,86,219,0.28)] transition hover:bg-[#1E40AF]"
          >
            <Smartphone size={16} />
            Get the App
          </a>
          <Link
            href="/browse"
            className="public-press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-[#1A56DB]"
          >
            Browse items
            <ArrowRight size={15} className="translate-x-px" />
          </Link>
        </div>
      </div>
    </RevealOnScroll>
  );
}
