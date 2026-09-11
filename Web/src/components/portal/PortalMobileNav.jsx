'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, FileText, Home, LayoutGrid, User } from 'lucide-react';

/** Matches mobile CustomBottomTab: LOST | REQUESTS | HOME | ITEMS | PROFILE */
const LEFT_TABS = [
  { href: '/portal/lost', label: 'LOST', icon: Search, color: '#1D4ED8' },
  { href: '/portal/my-requests', label: 'REQUESTS', icon: FileText, color: '#0D9488' },
];

const HOME_TAB = {
  href: '/portal',
  label: 'HOME',
  icon: Home,
  color: '#1A56DB',
};

const RIGHT_TABS = [
  { href: '/portal/my-items', label: 'ITEMS', icon: LayoutGrid, color: '#7C3AED' },
  { href: '/portal/profile', label: 'PROFILE', icon: User, color: '#0F172A' },
];

function isActive(pathname, href) {
  if (href === '/portal') return pathname === '/portal';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SideTab({ tab, pathname }) {
  const active = isActive(pathname, tab.href);
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} style={{ color: active ? tab.color : '#94A3B8' }} />
      <span
        className={`text-[10px] tracking-wide ${active ? 'font-extrabold' : 'font-semibold'}`}
        style={{ color: active ? tab.color : '#94A3B8' }}
      >
        {tab.label}
      </span>
      {active ? (
        <span
          className="absolute bottom-0 h-1 w-1 rounded-full"
          style={{ backgroundColor: tab.color }}
        />
      ) : null}
    </Link>
  );
}

export default function PortalMobileNav() {
  const pathname = usePathname();
  const homeActive = isActive(pathname, HOME_TAB.href);
  const HomeIcon = HOME_TAB.icon;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="relative mx-auto max-w-lg px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex h-[72px] items-center rounded-[28px] border border-slate-200/80 bg-white/95 px-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex flex-1">
            {LEFT_TABS.map((tab) => (
              <SideTab key={tab.href} tab={tab} pathname={pathname} />
            ))}
          </div>

          {/* Spacer for floating HOME */}
          <div className="w-16 flex-shrink-0" />

          <div className="flex flex-1">
            {RIGHT_TABS.map((tab) => (
              <SideTab key={tab.href} tab={tab} pathname={pathname} />
            ))}
          </div>
        </div>

        <Link
          href={HOME_TAB.href}
          className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-3 flex-col items-center"
        >
          <span
            className={`flex h-[62px] w-[62px] items-center justify-center rounded-full text-white shadow-lg shadow-blue-500/35 transition ${
              homeActive ? 'bg-[#1E40AF] ring-4 ring-blue-100' : 'bg-[#1A56DB]'
            }`}
          >
            <HomeIcon size={28} strokeWidth={2.2} />
          </span>
          <span
            className={`mt-0.5 text-[10px] font-extrabold tracking-wide ${
              homeActive ? 'text-[#1A56DB]' : 'text-slate-500'
            }`}
          >
            HOME
          </span>
        </Link>
      </div>
    </nav>
  );
}
