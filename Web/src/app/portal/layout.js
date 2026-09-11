import PortalShell from '@/components/portal/PortalShell';

export const metadata = {
  title: 'Student & Staff Portal | JU Lost & Found',
  description: 'Jazeera University Lost Item Recovery System - Student & Staff Portal',
};

export default function PortalLayout({ children }) {
  return <PortalShell>{children}</PortalShell>;
}
