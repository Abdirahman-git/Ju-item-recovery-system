import Link from 'next/link';
import { ArrowRight, ClipboardCheck, HandHelping, Smartphone } from 'lucide-react';
import RevealOnScroll from '@/components/public/RevealOnScroll';
import SectionHeading from '@/components/public/SectionHeading';

const STEPS = [
  {
    n: '01',
    icon: Smartphone,
    title: 'Report it',
    body: 'Lost or found something on campus? Open the JU LOFO app and submit a photo with a few details.',
    hint: 'Takes about a minute',
    tone: 'blue',
  },
  {
    n: '02',
    icon: ClipboardCheck,
    title: 'Staff checks',
    body: 'Campus admins review the report. Nothing goes public until it is verified.',
    hint: 'Keeps the feed trustworthy',
    tone: 'indigo',
  },
  {
    n: '03',
    icon: HandHelping,
    title: 'Get it back',
    body: 'Approved items show here and in the app. The owner claims, staff confirms, item returned.',
    hint: 'Browse → claim → recover',
    tone: 'sky',
  },
];

export default function HowItWorksFlow() {
  return (
    <section className="public-how relative mx-auto max-w-7xl px-4 py-10 sm:px-6 xl:px-8">
      <div className="public-how-panel relative overflow-visible rounded-[28px] border border-slate-200/80 px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <div className="public-how-glow" aria-hidden />
        <div className="public-how-grid" aria-hidden />

        <RevealOnScroll>
          <SectionHeading
            eyebrow="Simple flow"
            title="How it works"
            subtitle="Three clear steps — report, verify, recover. Built for trust on campus."
          />
        </RevealOnScroll>

        <ol className="public-how-track relative mt-12 grid gap-5 md:grid-cols-3 md:gap-0">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealOnScroll key={step.title} delay={i * 90} className="relative">
                <li className={`public-how-step public-how-step--${step.tone} group relative h-full`}>
                  <Link
                    href="/how-it-works"
                    className="public-how-card relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="public-how-icon flex h-14 w-14 items-center justify-center rounded-2xl">
                        <Icon size={24} strokeWidth={2.25} />
                      </div>
                      <span className="public-how-num font-black tabular-nums tracking-tight">
                        {step.n}
                      </span>
                    </div>

                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Step {i + 1}
                    </p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">
                      {step.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-600">
                      {step.body}
                    </p>
                    <span className="public-how-hint mt-5 inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold">
                      {step.hint}
                    </span>
                  </Link>
                </li>
              </RevealOnScroll>
            );
          })}
        </ol>

        <RevealOnScroll delay={280}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/how-it-works"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(26,86,219,0.28)] transition hover:bg-[#1E40AF] hover:scale-[1.02] active:scale-[0.98]"
            >
              See full process
              <ArrowRight size={15} />
            </Link>
            <a
              href="#get-app"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-[#1A56DB] active:scale-[0.98]"
            >
              <Smartphone size={15} />
              Get the App
            </a>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
