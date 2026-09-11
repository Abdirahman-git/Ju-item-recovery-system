'use client';

import { ShieldCheck, FolderOpen, Shield, Settings, EyeOff, Mail } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Data we collect',
    icon: FolderOpen,
    points: [
      'ID, name, email, and phone from university records during account activation.',
      'Login credentials used to authenticate your account.',
      'Lost report details: item name, description, place, date, and optional photo.',
      'Claim notes submitted when selecting “This is mine”.',
    ],
  },
  {
    title: 'Data we do not keep',
    icon: Shield,
    points: ['OTP verification codes are temporary and are not stored permanently.'],
  },
  {
    title: 'How we use data',
    icon: Settings,
    points: [
      'Create and manage user accounts.',
      'Show approved campus lost & found listings.',
      'Support claim review between students and campus administrators.',
      'Allow admins to review reports and claims fairly.',
      'Send verification and reset OTP messages.',
    ],
  },
  {
    title: 'Privacy safeguards',
    icon: EyeOff,
    points: [
      'Reporter phone numbers and personal contacts are hidden from other students.',
      'Secure found items may hide photos and show only a public notice.',
      'Only authorized campus admins can manage claims and returns.',
    ],
  },
  {
    title: 'Contact',
    icon: Mail,
    points: [
      'For privacy questions, contact the Student Affairs / Lost & Found desk at Jazeera University.',
    ],
  },
];

export default function PortalPrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 text-[#1A56DB]">
          <ShieldCheck size={20} />
          <span className="text-xs font-bold uppercase tracking-wider">Legal</span>
        </div>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Privacy Policy</h1>
        <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
          How JU LOFO handles your campus account and report data.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1A56DB]">
                <Icon size={18} />
              </span>
              <h2 className="text-sm font-black text-slate-900">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.points.map((point) => (
                <li key={point} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1A56DB]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
