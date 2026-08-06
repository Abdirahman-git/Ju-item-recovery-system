import Link from 'next/link';
import { Smartphone, ArrowRight } from 'lucide-react';

export default function CtaBand({
  id = 'get-app',
  title = 'Ready to reunite with your things?',
  subtitle = 'Download the JU LOFO app to report items, browse matches, and claim what is yours — securely on campus.',
}) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-16 sm:px-6 xl:px-8">
      <div className="public-cta-band relative overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-10 sm:py-14">
        <div className="public-cta-orb public-cta-orb-a" aria-hidden />
        <div className="public-cta-orb public-cta-orb-b" aria-hidden />
        <div className="relative z-[1]">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-blue-100 sm:text-base">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex cursor-default items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#1A56DB] shadow-lg transition hover:scale-[1.02] active:scale-[0.98]">
              <Smartphone size={17} />
              Coming soon on App Store & Google Play
            </span>
            <Link
              href="/browse"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
            >
              Browse all items
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
