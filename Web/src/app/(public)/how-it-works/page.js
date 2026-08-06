'use client';

import { useState } from 'react';
import { ChevronDown, Smartphone, ClipboardCheck, Radio, CircleCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import SectionHeading from '@/components/public/SectionHeading';
import CtaBand from '@/components/public/CtaBand';
import RevealOnScroll from '@/components/public/RevealOnScroll';

const STEPS = [
  {
    icon: Smartphone,
    title: 'Report lost or found',
    body: 'Open the JU LOFO mobile app, add photos and details, and submit your report from campus.',
  },
  {
    icon: ClipboardCheck,
    title: 'Admin reviews and approves',
    body: 'Campus administrators check the listing for accuracy and safety before it is published.',
  },
  {
    icon: Radio,
    title: 'Item goes live',
    body: 'Approved items appear on this Browse page and in the student app feed at the same time.',
  },
  {
    icon: CircleCheck,
    title: 'Claim and return',
    body: 'The rightful owner claims through the app. Staff verify ownership and mark the item returned.',
  },
];

const FAQS = [
  {
    q: 'I see my item on Browse — what do I do next?',
    a: 'Open the JU LOFO mobile app to claim or contact through the verified flow. This public site intentionally hides phone numbers and emails.',
  },
  {
    q: 'How long does approval take?',
    a: 'Most reports are reviewed by campus staff during working hours. Until approval, items stay private and do not appear here.',
  },
  {
    q: 'Can I report an item from this website?',
    a: 'Reporting and claiming happen in the mobile app. This site is for discovering approved listings and learning how the system works.',
  },
  {
    q: 'Why don’t I see a phone number on the item page?',
    a: 'Privacy. Contact details are reserved for authenticated app users so campus recovery stays safe and accountable.',
  },
  {
    q: 'Who can use JU LOFO?',
    a: 'Jazeera University students and staff. Administrators manage reviews from the web console.',
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-[#0F172A] sm:text-base">{item.q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#1A56DB] transition duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm font-medium leading-relaxed text-slate-600">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <RevealOnScroll>
          <SectionHeading
            eyebrow="Process"
            title="How JU LOFO works"
            subtitle="From the moment something is reported to the moment it is returned — one clear campus flow."
          />
        </RevealOnScroll>

        <div className="relative mt-14">
          <div
            className="pointer-events-none absolute left-6 top-4 bottom-4 hidden w-px bg-gradient-to-b from-[#1A56DB]/40 via-blue-200 to-transparent md:left-1/2 md:block"
            aria-hidden
          />
          <ol className="space-y-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const odd = i % 2 === 1;
              return (
                <RevealOnScroll key={step.title} delay={i * 70}>
                  <li
                    className={`relative grid items-center gap-4 md:grid-cols-2 ${
                      odd ? 'md:text-right' : ''
                    }`}
                  >
                    <div className={`${odd ? 'md:order-2 md:pl-10' : 'md:pr-10'}`}>
                      <div
                        className={`public-step-card rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${
                          odd ? 'md:ml-auto' : ''
                        } max-w-md`}
                      >
                        <div
                          className={`flex items-center gap-3 ${odd ? 'md:flex-row-reverse' : ''}`}
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A56DB] text-white shadow-md shadow-blue-500/30">
                            <Icon size={20} />
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            Step {i + 1}
                          </p>
                        </div>
                        <h3 className="mt-4 text-xl font-black text-[#0F172A]">{step.title}</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{step.body}</p>
                      </div>
                    </div>
                    <div className={`hidden md:block ${odd ? 'md:order-1' : ''}`} />
                  </li>
                </RevealOnScroll>
              );
            })}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/browse"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1E40AF] active:scale-[0.98]"
          >
            Browse Items
            <ArrowRight size={15} />
          </Link>
          <a
            href="#get-app"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-[#1A56DB] active:scale-[0.98]"
          >
            <Smartphone size={15} />
            Get the App
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <RevealOnScroll>
          <SectionHeading eyebrow="FAQ" title="Common questions" />
        </RevealOnScroll>
        <div className="mt-8 space-y-3">
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex((prev) => (prev === i ? -1 : i))}
            />
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
