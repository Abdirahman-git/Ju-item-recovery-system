import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';

export const metadata = {
  title: {
    default: 'JU LOFO — Jazeera University Lost & Found',
    template: '%s · JU LOFO',
  },
  description:
    'Official Jazeera University Lost & Found. Browse approved campus items, learn how recovery works, and get the JU LOFO app.',
};

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <div className="public-atmosphere" aria-hidden>
        <div className="public-orb public-orb-a" />
        <div className="public-orb public-orb-b" />
        <div className="public-orb public-orb-c" />
      </div>
      <PublicNavbar />
      <main className="relative z-[1] pt-[72px]">{children}</main>
      <div className="relative z-[1]">
        <PublicFooter />
      </div>
    </div>
  );
}
