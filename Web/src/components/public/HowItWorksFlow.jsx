import Link from 'next/link';
import { ArrowRight, ClipboardCheck, HandHelping, Smartphone } from 'lucide-react';
import RevealOnScroll from '@/components/public/RevealOnScroll';
import SectionHeading from '@/components/public/SectionHeading';

const STEPS = [
  {
    n: '01',
    icon: Smartphone,
    title: 'Report it',
    body: 'Lost something on campus? Open the JU LOFO app and submit a photo with a few details.',
    hint: 'Takes about a minute',
  },
  {
    n: '02',
    icon: ClipboardCheck,
    title: 'Staff checks',
    body: 'Campus admins review the report. Nothing goes public until it is verified.',
    hint: 'Keeps the feed trustworthy',
  },
  {
    n: '03',
    icon: HandHelping,
    title: 'Get it back',
    body: 'Approved items show here and in the app. The owner claims, staff confirms, item returned.',
    hint: 'Browse, claim, recover',
  },
];

export default function HowItWorksFlow() {
  return (
    <section className="public-how relative mx-auto max-w-7xl px-4 py-10 sm:px-6 xl:px-8">
      <div className="public-how-panel relative overflow-visible rounded-[28px] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <div className="public-how-glow" aria-hidden />
        <div className="public-how-grid" aria-hidden />

        <RevealOnScroll>
          <SectionHeading
            eyebrow="Simple flow"
            title="How it works"
            subtitle="Three clear steps: report, verify, recover. Built for trust on campus."
          />
        </RevealOnScroll>

        <ol className="public-how-track relative mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealOnScroll key={step.title} delay={i * 90} className="relative overflow-visible">
                <li className="public-how-step relative h-full">
                  <Link href="/how-it-works" className="public-how-card">
                    <span className="public-how-clip" aria-hidden>
                      <span className="public-how-accent" />
                      <span className="public-how-sheen" />
                    </span>

                    <div className="relative z-[1] flex items-start justify-between gap-3">
                      <div className="public-how-icon">
                        <Icon size={22} strokeWidth={2.2} />
                      </div>
                      <span className="public-how-num tabular-nums">{step.n}</span>
                    </div>

                    <h3 className="public-how-title text-balance">{step.title}</h3>
                    <p className="public-how-body text-pretty">{step.body}</p>
                    <span className="public-how-hint">{step.hint}</span>
                  </Link>
                </li>
              </RevealOnScroll>
            );
          })}
        </ol>

        <RevealOnScroll delay={280}>
          <div className="public-how-actions mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/how-it-works" className="public-how-btn-primary public-press">
              See full process
              <ArrowRight size={15} />
            </Link>
            <a href="#get-app" className="public-how-btn-ghost public-press">
              <Smartphone size={15} />
              Get the App
            </a>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
