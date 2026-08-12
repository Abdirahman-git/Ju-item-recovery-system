import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import ParticleField from '@/components/public/ParticleField';
import SmoothScrollAnchors from '@/components/public/SmoothScrollAnchors';

export const metadata = {
  title: {
    default: 'JU LOFO · Jazeera University Lost & Found',
    template: '%s · JU LOFO',
  },
  description:
    'Official Jazeera University Lost & Found. Browse approved campus items, learn how recovery works, and get the JU LOFO app.',
};

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <ParticleField />
      <SmoothScrollAnchors />
      <PublicNavbar />
      <main className="public-main relative z-[1] bg-transparent">{children}</main>
      <div className="relative z-[1] bg-transparent">
        <PublicFooter />
      </div>
    </div>
  );
}
