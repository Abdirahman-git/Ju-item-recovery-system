'use client';

import { HelpCircle, User, FileEdit, ShieldCheck } from 'lucide-react';

const FAQ_GROUPS = [
  {
    title: 'Account & Login',
    icon: User,
    items: [
      {
        q: 'How do I create an account?',
        a: 'On the login page use Activate account, enter your university ID, verify the OTP sent to your university email, then set your password.',
      },
      {
        q: 'I forgot my password. What should I do?',
        a: 'On the login screen use Forgot password, verify OTP, and create a new password.',
      },
    ],
  },
  {
    title: 'Reporting Items',
    icon: FileEdit,
    items: [
      {
        q: 'What information do I need to report an item?',
        a: 'Item name, category, where you lost it, date/time, and an optional photo. Your account details are filled in automatically.',
      },
      {
        q: 'What happens after submitting?',
        a: 'Your report enters pending review. After admin approval it becomes visible on the campus feed.',
      },
    ],
  },
  {
    title: 'Claims & Recovery',
    icon: ShieldCheck,
    items: [
      {
        q: 'How do I claim an item?',
        a: 'Open item details, tap Claim Item, and complete the ownership challenge. Campus admin will review your answers.',
      },
      {
        q: 'Can I contact the reporter?',
        a: 'No. Reporter names and phone numbers are hidden for privacy. Submit a claim and campus admin will handle contact and return.',
      },
    ],
  },
];

export default function PortalHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 text-[#1A56DB]">
          <HelpCircle size={20} />
          <span className="text-xs font-bold uppercase tracking-wider">Support</span>
        </div>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Help & FAQ</h1>
        <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
          Fast answers for using the JU Item Recovery portal.
        </p>
      </div>

      {FAQ_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <section
            key={group.title}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1A56DB]">
                <Icon size={18} />
              </span>
              <h2 className="text-sm font-black text-slate-900">{group.title}</h2>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.q} className="rounded-xl bg-slate-50/80 p-3.5">
                  <p className="text-xs font-bold text-slate-900">{item.q}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
