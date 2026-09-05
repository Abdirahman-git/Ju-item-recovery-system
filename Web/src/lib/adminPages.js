import { NAV_SECTIONS } from './navigation';

const CUSTOM_META = {
  '/admin': {
    title: 'Dashboard Overview',
    subtitle: 'Real-time status of asset recovery across Jazeera University campus.',
  },
  '/admin/pending': {
    title: 'Pending Reports',
    subtitle: 'Review and verify items reported as lost or found within the campus ecosystem.',
  },
  '/admin/claims': {
    title: 'Ownership Requests',
    subtitle: 'Scores auto-decide Pass / Physical / Reject — confirm office visits when needed.',
  },
  '/admin/users': {
    title: 'All Users',
    subtitle: 'Directory of registered students and system administrators.',
  },
  '/admin/setup': {
    title: 'Setup',
    subtitle: 'Campus directory, CSV upload, and faculty program years for LOFO access.',
  },
  '/admin/items': {
    title: 'Global Inventory',
    subtitle: 'Real-time visibility across all campus property with category and status filters.',
  },
  '/admin/drafts': {
    title: 'Drafts',
    subtitle: 'Saved lost and secure notices that are not published yet.',
  },
  '/admin/lost': {
    title: 'Report Lost Item',
    subtitle: 'Enter lost property details, visual evidence, and last-seen context.',
  },
  '/admin/found': {
    title: 'Report Lost Item',
    subtitle: 'Found reporting is closed — all new campus reports are Lost until returned.',
  },
  '/admin/secure-found': {
    title: 'Secure Lost Hold',
    subtitle: 'Post a short secure lost notice with name and description.',
  },
  '/admin/my-items': {
    title: 'My Items',
    subtitle: 'Items posted from this admin account only.',
  },
  '/admin/profile': {
    title: 'My Profile',
    subtitle: 'Manage your admin identity, activity, and account preferences.',
  },
  '/admin/change-password': {
    title: 'Change Password',
    subtitle: 'Update your admin account credentials securely.',
  },
  '/admin/reports': {
    title: 'All System Reports',
    subtitle: 'University-wide data registry — users, items, claims, and recovery metrics in one place.',
  },
  '/admin/backup': {
    title: 'Deleted Records',
    subtitle: 'Recover users and inventory you removed by mistake.',
  },
  '/admin/archived': {
    title: 'Archived Items',
    subtitle: 'Stale unclaimed items removed from the mobile app feed (Super Admin only).',
  },
  '/admin/contact-messages': {
    title: 'Contact Messages',
    subtitle: 'Inbox of public contact form submissions from the JU LOFO website.',
  },
};

function metaFromNav(pathname) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const exact = item.exact && pathname === item.href;
      const prefix = !item.exact && pathname.startsWith(item.href);
      if (exact || prefix) {
        return {
          title: item.label,
          subtitle: `Manage ${item.label.toLowerCase()} in the admin console.`,
        };
      }
    }
  }
  return { title: 'Admin Console', subtitle: 'Jazeera University Lost & Found' };
}

export function getAdminPageMeta(pathname) {
  if (CUSTOM_META[pathname]) return CUSTOM_META[pathname];
  return metaFromNav(pathname);
}
