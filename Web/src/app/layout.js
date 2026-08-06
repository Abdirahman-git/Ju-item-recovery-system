import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { SessionProvider } from '@/context/SessionProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: {
    default: 'JU LOFO — Jazeera University Lost & Found',
    template: '%s · JU LOFO',
  },
  description: 'Jazeera University Lost & Found — public browse and admin console.',
  icons: {
    icon: [{ url: '/jazeera_logo.png', type: 'image/png' }],
    shortcut: [{ url: '/jazeera_logo.png', type: 'image/png' }],
    apple: [{ url: '/jazeera_logo.png', type: 'image/png' }],
  },
};

const extensionErrorGuard = `
(() => {
  const METAMASK_EXTENSION_ID = 'nkbihfbeogaeaoehlefnkodbefgpgknn';

  function isMetaMaskConnectionError(value, source) {
    const message = value && value.message ? value.message : String(value || '');
    const stack = value && value.stack ? value.stack : '';
    const location = source || '';

    return (
      message.includes('Failed to connect to MetaMask') &&
      (
        stack.includes(METAMASK_EXTENSION_ID) ||
        location.includes(METAMASK_EXTENSION_ID) ||
        stack.includes('MetaMask') ||
        location.includes('metamask')
      )
    );
  }

  window.addEventListener('unhandledrejection', (event) => {
    if (isMetaMaskConnectionError(event.reason)) {
      event.preventDefault();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (
      isMetaMaskConnectionError(event.error, event.filename) ||
      isMetaMaskConnectionError(event.message, event.filename)
    ) {
      event.preventDefault();
    }
  }, true);
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Script id="extension-error-guard" strategy="beforeInteractive">
          {extensionErrorGuard}
        </Script>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
