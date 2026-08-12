import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Images,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import CtaBand from '@/components/public/CtaBand';
import RevealOnScroll from '@/components/public/RevealOnScroll';

export const metadata = {
  title: 'About',
  description:
    'About JU Item Recovery (LOFO): Jazeera University’s secure mobile lost & found for reporting, searching, and recovering campus belongings.',
};

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Report on mobile',
    text: 'Lost & found reporting from your smartphone, anywhere on campus.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified accounts',
    text: 'Student accounts via university directory and OTP verification.',
  },
  {
    icon: Search,
    title: 'Search listings',
    text: 'Browse approved campus items by keyword, category, or place.',
  },
  {
    icon: Images,
    title: 'Photo evidence',
    text: 'Attach photos so belongings are easier to identify and claim.',
  },
  {
    icon: CalendarClock,
    title: 'Date & time',
    text: 'Record when an item was lost or found for clearer matches.',
  },
  {
    icon: Users,
    title: 'Admin review',
    text: 'Reports and ownership claims reviewed fairly before anything goes live.',
  },
];

const PILLARS = [
  { icon: ShieldCheck, label: 'Admin verified', hint: 'Every listing reviewed' },
  { icon: MapPin, label: 'Campus only', hint: 'Jazeera University' },
  { icon: Users, label: 'Privacy first', hint: 'Contact stays in-app' },
];

export default function AboutPage() {
  return (
    <div className="public-about-page">
      {/* Full-bleed brand hero */}
      <section className="public-about-hero-bleed relative isolate overflow-hidden">
        <Image
          src="/ju-campus-about.png"
          alt="Jazeera University main campus building, Mogadishu"
          fill
          priority
          quality={92}
          className="public-about-hero-photo object-cover object-[center_28%]"
          sizes="100vw"
        />
        <div className="public-about-hero-veil" aria-hidden />

        <div className="relative z-[1] mx-auto flex min-h-[min(58vh,32rem)] max-w-7xl flex-col justify-end px-4 pb-11 pt-20 sm:min-h-[min(56vh,30rem)] sm:px-6 sm:pb-12 sm:pt-24 xl:px-8">
          <RevealOnScroll>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
              <Image
                src="/jazeera_logo.png"
                alt=""
                width={28}
                height={28}
                className="public-brand-logo h-7 w-7 object-contain drop-shadow-sm"
              />
              About JU LOFO
            </p>
            <h1 className="mt-3.5 max-w-3xl text-balance text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_18px_rgba(15,23,42,0.35)] sm:text-5xl sm:leading-[1.05] lg:text-[3.25rem]">
              JU <span className="text-[#BFDBFE]">Lost</span>
              <span className="mt-1 block text-[0.55em] font-bold uppercase tracking-[0.14em] text-white/92 sm:mt-1.5">
                Item Recovery
              </span>
            </h1>
            <p className="mt-3.5 max-w-xl text-pretty text-base font-medium leading-relaxed text-white/95 sm:text-lg">
              A secure mobile platform for Jazeera University students to report, search, and
              recover lost belongings on campus.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#get-app"
                className="public-press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-[#1A56DB] shadow-[0_12px_28px_rgba(15,23,42,0.22)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_16px_34px_rgba(15,23,42,0.28)]"
              >
                <Smartphone size={16} strokeWidth={2.2} />
                Get the App
              </a>
              <Link
                href="/browse"
                className="public-press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/50 bg-white/18 px-5 text-sm font-bold text-white backdrop-blur-md transition-[transform,background-color,border-color] duration-200 hover:border-white/70 hover:bg-white/28"
              >
                Browse items
                <ArrowRight size={15} className="translate-x-px" />
              </Link>
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white/88">
              <MapPin size={13} strokeWidth={2.4} />
              Jazeera University · Mogadishu
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Mission — cool showcase panel */}
      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 xl:px-8">
        <RevealOnScroll>
          <article className="public-about-mission relative overflow-hidden rounded-[1.85rem]">
            <div className="public-about-mission-glow" aria-hidden />
            <div className="public-about-mission-mesh" aria-hidden />
            <div className="public-about-mission-accent" aria-hidden />

            <div className="relative z-[1] px-6 pb-14 pt-9 sm:px-9 sm:pb-16 sm:pt-11 lg:px-12 lg:pb-[4.5rem] lg:pt-12">
              <div className="flex flex-col gap-12 sm:gap-14 lg:gap-16">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-10 xl:gap-12">
                  <div className="relative z-[3]">
                    <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A56DB]">
                      <span className="public-about-mission-dot" aria-hidden />
                      Our mission
                    </p>
                    <h2 className="mt-4 max-w-xl text-balance text-[1.9rem] font-black tracking-tight text-[#0F172A] sm:text-[2.55rem] sm:leading-[1.08]">
                      One trusted campus system for lost & found
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <span className="public-about-mission-chip">Campus trusted</span>
                      <span className="public-about-mission-chip public-about-mission-chip--soft">
                        Mogadishu
                      </span>
                    </div>
                    <p className="mt-4 max-w-lg text-pretty text-[15px] font-medium leading-relaxed text-slate-600 sm:text-base">
                      JU LOFO replaces scattered paper notices and informal posts with one secure
                      mobile system for Jazeera University students.
                    </p>
                  </div>

                  <div className="public-about-mission-aside">
                    <p className="public-about-mission-aside-label">Why it matters</p>
                    <p className="public-about-mission-aside-text">
                      Every listing is verified before it goes live — so browsing stays safe, fair,
                      and useful for the whole campus.
                    </p>
                    <Link
                      href="/how-it-works"
                      className="public-about-mission-cta public-press"
                    >
                      See the recovery flow
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>

                <ul className="public-about-mission-points grid gap-4 sm:grid-cols-3 sm:gap-5">
                  <li className="public-about-mission-point group">
                    <span className="public-about-mission-point-icon">
                      <Smartphone size={18} strokeWidth={2.15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold tracking-tight text-[#0F172A]">
                        Report & search
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        Lost or found items from the student app
                      </p>
                      <span className="public-about-mission-point-btn">App first</span>
                    </div>
                  </li>
                  <li className="public-about-mission-point group">
                    <span className="public-about-mission-point-icon">
                      <ShieldCheck size={18} strokeWidth={2.15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold tracking-tight text-[#0F172A]">
                        Verified accounts
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        University directory and OTP before anything goes live
                      </p>
                      <span className="public-about-mission-point-btn">OTP secure</span>
                    </div>
                  </li>
                  <li className="public-about-mission-point group">
                    <span className="public-about-mission-point-icon">
                      <Users size={18} strokeWidth={2.15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold tracking-tight text-[#0F172A]">
                        Fair admin review
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        Claims handled through a structured campus process
                      </p>
                      <span className="public-about-mission-point-btn">Staff checked</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </RevealOnScroll>

        <RevealOnScroll delay={90}>
          <ul className="public-about-pillars mt-7 grid gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-5">
            {PILLARS.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="public-about-pillar group">
                  <div className="flex items-start justify-between gap-3">
                    <span className="public-about-pillar-icon">
                      <Icon size={22} strokeWidth={2.1} />
                    </span>
                    <span className="public-about-pillar-num tabular-nums">0{i + 1}</span>
                  </div>
                  <p className="mt-5 text-base font-extrabold tracking-tight text-[#0F172A]">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-500">
                    {item.hint}
                  </p>
                </li>
              );
            })}
          </ul>
        </RevealOnScroll>
      </section>

      {/* What you can do */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10 xl:px-8">
        <RevealOnScroll>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A56DB]">
                What you can do
              </p>
              <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Built for everyday campus recovery
              </h2>
              <p className="mt-3 max-w-xl text-pretty text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                Everything students need in the JU LOFO mobile app · clear, verified, and campus-ready.
              </p>
            </div>
            <Link
              href="/how-it-works"
              className="public-press inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-[transform,color,border-color] duration-200 hover:border-blue-200 hover:text-[#1A56DB] lg:self-auto"
            >
              See how it works
              <ArrowRight size={15} className="translate-x-px" />
            </Link>
          </div>
        </RevealOnScroll>

        <ul className="public-about-feature-grid mt-10">
          {FEATURES.map((item, i) => {
            const Icon = item.icon;
            const featured = i === 0;
            return (
              <RevealOnScroll key={item.title} delay={i * 50} className="h-full">
                <li
                  className={`public-about-feature group h-full ${featured ? 'public-about-feature--featured' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="public-about-feature-icon inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[#1A56DB]">
                      <Icon size={22} strokeWidth={2.05} />
                    </span>
                    <span className="public-about-feature-index tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-extrabold tracking-tight text-[#0F172A] sm:text-[1.05rem]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-pretty text-sm font-medium leading-relaxed text-slate-600">
                    {item.text}
                  </p>
                </li>
              </RevealOnScroll>
            );
          })}
        </ul>
      </section>

      <CtaBand
        title="Report, search, and recover on campus"
        subtitle="Download the JU LOFO app to use the full Item Recovery flow with verified student accounts and admin review."
      />
    </div>
  );
}
