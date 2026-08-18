import { Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { SessionProvider } from '@/context/SessionProvider';
import ExtensionErrorGuard from '@/components/ExtensionErrorGuard';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: {
    default: 'JU LOFO · Jazeera University Lost & Found',
    template: '%s · JU LOFO',
  },
  description: 'Jazeera University Lost & Found. Public browse and admin console.',
  icons: {
    icon: [{ url: '/jazeera_logo.png', type: 'image/png' }],
    shortcut: [{ url: '/jazeera_logo.png', type: 'image/png' }],
    apple: [{ url: '/jazeera_logo.png', type: 'image/png' }],
  },
};

function isAdminOrLoginPath(pathname = '') {
  return pathname.startsWith('/admin') || pathname.startsWith('/login');
}

export default async function RootLayout({ children }) {
  const jar = await cookies();
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') || '';
  const mode = jar.get('ju-public-mode')?.value;
  // Public site defaults to dark. Admin/login stay light.
  const dark = mode !== 'light' && !isAdminOrLoginPath(pathname);

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased${dark ? ' public-dark' : ''}`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]">
        <ExtensionErrorGuard />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
