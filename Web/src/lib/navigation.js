export const NAV_SECTIONS = [
  {
    title: 'Command Center',
    items: [
      { href: '/admin', label: 'Overview', icon: 'grid', exact: true },
      { href: '/admin/pending', label: 'Pending Reports', icon: 'hourglass', badgeKey: 'pending' },
      { href: '/admin/claims', label: 'Ownership Requests', icon: 'clipboard', badgeKey: 'claims' },
    ],
  },
  {
    title: 'Directory & Logs',
    items: [
      { href: '/admin/users', label: 'All Users', icon: 'people' },
      { href: '/admin/items', label: 'All Items', icon: 'cube' },
      { href: '/admin/drafts', label: 'Drafts', icon: 'file-text' },
      { href: '/admin/returned', label: 'Returned Items', icon: 'gift' },
      { href: '/admin/archived', label: 'Archived Items', icon: 'archive', superAdminOnly: true },
      {
        href: '/admin/contact-messages',
        label: 'Contact Messages',
        icon: 'mail',
        superAdminOnly: true,
        badgeKey: 'contact',
      },
    ],
  },
  {
    title: 'Field Reports',
    items: [
      { href: '/admin/lost', label: 'Report Lost', icon: 'search' },
      { href: '/admin/found', label: 'Report Found', icon: 'checkmark-circle' },
      { href: '/admin/secure-found', label: 'Secure Found', icon: 'shield-checkmark' },
      { href: '/admin/my-items', label: 'My Items', icon: 'folder-open' },
    ],
  },
  {
    title: 'System Reports',
    items: [
      { href: '/admin/reports', label: 'All System Reports', icon: 'bar-chart' },
      { href: '/admin/backup', label: 'Deleted Records', icon: 'hard-drive', superAdminOnly: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/admin/profile', label: 'My Profile', icon: 'person' },
      { href: '/admin/change-password', label: 'Change Password', icon: 'lock-closed' },
    ],
  },
];
