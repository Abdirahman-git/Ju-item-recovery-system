import Link from 'next/link';
import { ArrowRight, MapPin, ShieldCheck, Smartphone, Users } from 'lucide-react';
import ItemCard from '@/components/public/ItemCard';
import SectionHeading from '@/components/public/SectionHeading';
import CtaBand from '@/components/public/CtaBand';
import RevealOnScroll from '@/components/public/RevealOnScroll';
import HeroPhoneFrame from '@/components/public/HeroPhoneFrame';
import HowItWorksFlow from '@/components/public/HowItWorksFlow';
import { fetchPublicLiveItems, toPublicItemCard } from '@/lib/publicItems';

export const revalidate = 15;

const TRUST = [
  { icon: ShieldCheck, label: 'Admin verified' },
  { icon: MapPin, label: 'Campus only' },
  { icon: Users, label: 'Free for students and staff' },
];

export default async function HomePage() {
  let preview = [];
  try {
    const live = await fetchPublicLiveItems();
    preview = live.slice(0, 6).map(toPublicItemCard).filter(Boolean);
  } catch {
    preview = [];
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.2fr_0.9fr] lg:gap-8 lg:pb-20 lg:pt-12 xl:gap-10 xl:px-8">
          <div className="public-hero-enter min-w-0 lg:pr-2">
            <p className="inline-flex items-center rounded-full border border-[#1A56DB]/20 bg-[#1A56DB]/8 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#1A56DB]">
              Jazeera University
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-[#0F172A] sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem]">
              Lost it.{' '}
              <span className="text-[#1A56DB]">Found it.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
              Lost something on campus? Report it. Found something? Turn it in. JU LOFO brings them back together.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {TRUST.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm"
                >
                  <Icon size={13} className="text-[#1A56DB]" />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(26,86,219,0.3)] transition hover:bg-[#1E40AF] hover:scale-[1.02] active:scale-[0.98]"
              >
                Browse Items
                <ArrowRight size={16} />
              </Link>
              <a
                href="#get-app"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-[#1A56DB] active:scale-[0.98]"
              >
                <Smartphone size={16} />
                Get the App
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroPhoneFrame
              src="/phone.png"
              alt="JU LOFO mobile app — campus lost and found feed"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 xl:px-8">
        <RevealOnScroll>
          <SectionHeading
            eyebrow="Live on campus"
            title="Latest recovered items"
            subtitle="Only admin-approved listings appear here — the same LIVE feed students see in the app."
          />
        </RevealOnScroll>

        {preview.length === 0 ? (
          <RevealOnScroll delay={80} className="mt-10">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center">
              <p className="text-base font-bold text-slate-700">No live items yet</p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                When campus reports are approved, they will show up here automatically.
              </p>
              <Link
                href="/how-it-works"
                className="mt-5 inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-[#1A56DB] hover:underline"
              >
                How approval works
                <ArrowRight size={14} />
              </Link>
            </div>
          </RevealOnScroll>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((item, i) => (
              <ItemCard key={item.slug} item={item} index={i} />
            ))}
          </div>
        )}

        {preview.length > 0 ? (
          <div className="mt-8 text-center">
            <Link
              href="/browse"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-black text-[#1A56DB] transition hover:gap-3"
            >
              View all items
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : null}
      </section>

      <HowItWorksFlow />

      <CtaBand />
    </>
  );
}
