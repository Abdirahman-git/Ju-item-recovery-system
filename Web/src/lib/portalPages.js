/**
 * Portal top-bar titles — mirrors admin getAdminPageMeta.
 */
const PORTAL_PAGE_META = {
  '/portal': {
    title: 'Home',
    subtitle: 'Campus lost & found overview and recent activity.',
  },
  '/portal/lost': {
    title: 'Report Lost Item',
    subtitle: 'Log missing campus property with optional photo evidence.',
  },
  '/portal/browse': {
    title: 'All Items',
    subtitle: 'Search and browse lost listings across campus.',
  },
  '/portal/my-items': {
    title: 'My Items',
    subtitle: 'Track items you reported on JU LOFO.',
  },
  '/portal/my-requests': {
    title: 'My Requests',
    subtitle: 'Ownership claims and recovery requests you submitted.',
  },
  '/portal/notifications': {
    title: 'Notifications',
    subtitle: 'Updates about your reports, matches, and claims.',
  },
  '/portal/profile': {
    title: 'My Profile',
    subtitle: 'Your student identity and account details.',
  },
  '/portal/change-password': {
    title: 'Change Password',
    subtitle: 'Update your portal login credentials securely.',
  },
  '/portal/help': {
    title: 'Help / FAQ',
    subtitle: 'Answers to common questions about JU LOFO.',
  },
  '/portal/privacy': {
    title: 'Privacy Policy',
    subtitle: 'How we handle your data on JU LOFO.',
  },
};

export function getPortalPageMeta(pathname) {
  if (!pathname) {
    return { title: 'JU LOFO', subtitle: 'Student & Staff Portal' };
  }

  const exact = PORTAL_PAGE_META[pathname];
  if (exact) return exact;

  const match = Object.keys(PORTAL_PAGE_META)
    .filter((key) => key !== '/portal' && pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (match) return PORTAL_PAGE_META[match];

  return {
    title: 'JU LOFO',
    subtitle: 'Student & Staff Portal',
  };
}
