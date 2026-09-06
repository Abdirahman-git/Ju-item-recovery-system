import Link from 'next/link';
import { GraduationCap, ShieldCheck, Users, Building2, ArrowRight, Smartphone } from 'lucide-react';
import SectionHeading from '@/components/public/SectionHeading';
import CtaBand from '@/components/public/CtaBand';
import RevealOnScroll from '@/components/public/RevealOnScroll';

export const metadata = {
  title: 'About',
  description: 'Learn about JU LOFO — Jazeera University’s official Lost & Found system.',
};

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: 'Students',
    body: 'Report what you lost or found, browse approved listings, and claim items through the app.',
  },
  {
    icon: Users,
    title: 'Staff & faculty',
    body: 'Help keep campus property moving — the same trusted flow, less friction.',
  },
  {
    icon: Building2,
    title: 'Administrators',
    body: 'Review reports behind the scenes, approve what goes live, and manage returns securely.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
        <RevealOnScroll>
          <SectionHeading
            align="left"
            eyebrow="About JU LOFO"
            title="Built for Jazeera University campus recovery."
            subtitle="JU LOFO is the official Lost & Found platform for Jazeera University — connecting mobile reporting with admin review so the right people see the right items."
            className="!mx-0 max-w-3xl"
          />
        </RevealOnScroll>

        <RevealOnScroll delay={80} className="mt-10">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-8">
            <h2 className="text-xl font-black text-[#0F172A]">Our purpose</h2>
            <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-slate-600">
              Every semester, phones, IDs, bags, and keys go missing across campus. JU LOFO gives
              students a clear place to report and search — while administrators verify listings
              before they are published. One database powers the mobile app, the admin console, and
              this public browse site.
            </p>
          </div>
        </RevealOnScroll>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <RevealOnScroll>
          <SectionHeading title="Who it’s for" subtitle="A shared system with clear roles." />
        </RevealOnScroll>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((item, i) => {
            const Icon = item.icon;
            return (
              <RevealOnScroll key={item.title} delay={i * 60}>
                <div className="public-step-card h-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[#0F172A]">{item.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{item.body}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <RevealOnScroll>
          <div className="flex flex-col gap-5 rounded-[28px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-6 sm:flex-row sm:items-start sm:p-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0F172A]">Trust & safety first</h2>
              <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-slate-600">
                Items only appear on this site after an administrator approves them. Private contact
                details — phone numbers, emails, and owner identity — stay out of the public view. To
                claim or contact, use the JU LOFO mobile app where verification can happen safely.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
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
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <CtaBand
        title="Part of campus life at Jazeera University"
        subtitle="Whether you lost something in a lecture hall or found a wallet near the gate — JU LOFO is here for the whole campus."
      />
    </>
  );
}
