'use client';

import { Construction } from 'lucide-react';

const TITLES = {
  pending: 'Pending Reports',
  claims: 'Ownership Requests',
  users: 'All Users',
  items: 'All Items',
  returned: 'Returned Items',
  lost: 'Report Lost',
  found: 'Report Lost',
  'secure-found': 'Secure Lost Hold',
  'my-items': 'My Items',
  profile: 'My Profile',
  'change-password': 'Change Password',
};

export default function ComingSoonPage({ params }) {
  const slug = params?.slug;
  const title = TITLES[slug] || 'Page';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
        <Construction size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This section is next in the build queue. Dashboard is live with real Supabase data.
      </p>
    </div>
  );
}
