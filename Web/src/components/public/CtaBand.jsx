import Link from 'next/link';
import { ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import RevealOnScroll from '@/components/public/RevealOnScroll';

export default function CtaBand({
  id = 'get-app',
  title = 'Ready to reunite with your things?',
  subtitle = 'Download the JU LOFO app to report items, browse matches, and claim what is yours, securely on campus.',
}) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 xl:px-8">
      <RevealOnScroll>
        <div className="public-cta-band relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:rounded-[32px] sm:px-10 sm:py-16 lg:px-14 lg:py-[4.25rem]">
          <div className="public-cta-glow" aria-hidden />
          <div className="public-cta-orb public-cta-orb-a" aria-hidden />
          <div className="public-cta-orb public-cta-orb-b" aria-hidden />
          <div className="public-cta-grid" aria-hidden />
          <div className="public-cta-shine" aria-hidden />

          <div className="relative z-[1] mx-auto max-w-2xl">
            <p className="public-cta-eyebrow inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              <ShieldCheck size={13} strokeWidth={2.4} className="opacity-90" />
              Campus recovery
            </p>

            <h2 className="mt-4 text-balance text-[1.85rem] font-extrabold tracking-tight text-white sm:text-4xl sm:leading-[1.12] lg:text-[2.65rem]">
              {title}
            </h2>

            <p className="mx-auto mt-3.5 max-w-lg text-pretty text-[15px] font-medium leading-relaxed text-blue-50/90 sm:text-base">
              {subtitle}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
              <span className="public-cta-primary public-press inline-flex min-h-12 cursor-default items-center gap-2.5 rounded-full bg-white pl-5 pr-6 text-sm font-extrabold text-[#1A56DB]">
                <span className="public-cta-primary-icon inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8EDFB]">
                  <Smartphone size={16} strokeWidth={2.2} />
                </span>
                Coming soon on App Store & Google Play
              </span>

              <Link
                href="/browse"
                className="public-cta-secondary public-press inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-6 text-sm font-bold text-white"
              >
                Browse all items
                <ArrowRight size={16} className="translate-x-px opacity-90" />
              </Link>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
