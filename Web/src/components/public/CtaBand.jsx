import Link from 'next/link';
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Smartphone } from 'lucide-react';
import RevealOnScroll from '@/components/public/RevealOnScroll';

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.64c.03 2.66 2.33 3.55 2.36 3.56-.02.06-.37 1.26-1.22 2.5-.73 1.06-1.5 2.12-2.7 2.14-1.18.02-1.56-.7-2.91-.7-1.36 0-1.78.68-2.9.72-1.16.04-2.05-1.15-2.8-2.21-1.53-2.16-2.7-6.1-1.13-8.77.78-1.33 2.17-2.18 3.68-2.2 1.15-.02 2.23.77 2.91.77.68 0 1.96-.95 3.3-.81.56.02 2.14.23 3.16 1.73-.08.05-1.89 1.1-1.87 3.27zM14.16 5.9c.62-.75 1.04-1.79.93-2.83-.9.04-1.99.6-2.63 1.35-.58.67-1.08 1.74-.95 2.76 1.01.08 2.04-.51 2.65-1.28z"
      />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="currentColor" d="M4.5 3.8v16.4c0 .7.76 1.13 1.36.77l13.2-8.2a.9.9 0 0 0 0-1.54L5.86 3.03A.9.9 0 0 0 4.5 3.8z" />
    </svg>
  );
}

const HIGHLIGHTS = [
  { icon: Search, title: 'Report', text: 'Lost or found in minutes' },
  { icon: ShieldCheck, title: 'Verified', text: 'Admin-approved listings' },
  { icon: BadgeCheck, title: 'Recover', text: 'Claim on campus, securely' },
];

export default function CtaBand({
  id = 'get-app',
  title = 'Ready to reunite with your things?',
  subtitle = 'Download the JU LOFO app to report items, browse matches, and claim what is yours, securely on campus.',
}) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-16 xl:px-8">
      <RevealOnScroll>
        <div className="public-cta-band relative overflow-hidden">
          <div className="public-cta-glow" aria-hidden />
          <div className="public-cta-orb public-cta-orb-a" aria-hidden />
          <div className="public-cta-orb public-cta-orb-b" aria-hidden />
          <div className="public-cta-mesh" aria-hidden />
          <div className="public-cta-shine" aria-hidden />

          <div className="public-cta-layout relative z-[1]">
            <div className="public-cta-copy min-w-0">
              <p className="public-cta-eyebrow">
                <ShieldCheck size={13} strokeWidth={2.4} />
                Campus recovery
              </p>

              <h2 className="public-cta-title text-balance">{title}</h2>
              <p className="public-cta-subtitle text-pretty">{subtitle}</p>

              <div className="public-cta-actions">
                <Link href="/browse" className="public-cta-primary public-press">
                  Browse all items
                  <ArrowRight size={16} strokeWidth={2.2} />
                </Link>
                <span className="public-cta-soon">
                  <Smartphone size={14} strokeWidth={2.3} />
                  App coming soon
                </span>
              </div>

              <div className="public-cta-stores">
                <div className="public-cta-store">
                  <span className="public-cta-store-icon">
                    <AppleMark />
                  </span>
                  <span className="min-w-0">
                    <span className="public-cta-store-kicker">Download on the</span>
                    <span className="public-cta-store-name">App Store</span>
                  </span>
                </div>
                <div className="public-cta-store">
                  <span className="public-cta-store-icon">
                    <PlayMark />
                  </span>
                  <span className="min-w-0">
                    <span className="public-cta-store-kicker">Get it on</span>
                    <span className="public-cta-store-name">Google Play</span>
                  </span>
                </div>
              </div>
            </div>

            <ul className="public-cta-aside">
              {HIGHLIGHTS.map(({ icon: Icon, title: itemTitle, text }) => (
                <li key={itemTitle} className="public-cta-feature">
                  <span className="public-cta-feature-icon">
                    <Icon size={18} strokeWidth={2.15} />
                  </span>
                  <span className="min-w-0">
                    <span className="public-cta-feature-title">{itemTitle}</span>
                    <span className="public-cta-feature-text">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
