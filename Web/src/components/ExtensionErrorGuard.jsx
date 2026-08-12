'use client';

import { useEffect } from 'react';

const METAMASK_EXTENSION_ID = 'nkbihfbeogaeaoehlefnkodbefgpgknn';

function isMetaMaskConnectionError(value, source) {
  const message = value && value.message ? value.message : String(value || '');
  const stack = value && value.stack ? value.stack : '';
  const location = source || '';

  return (
    message.includes('Failed to connect to MetaMask') &&
    (stack.includes(METAMASK_EXTENSION_ID) ||
      location.includes(METAMASK_EXTENSION_ID) ||
      stack.includes('MetaMask') ||
      location.includes('metamask'))
  );
}

/** Suppress noisy MetaMask extension connection errors in the console. */
export default function ExtensionErrorGuard() {
  useEffect(() => {
    const onRejection = (event) => {
      if (isMetaMaskConnectionError(event.reason)) event.preventDefault();
    };
    const onError = (event) => {
      if (
        isMetaMaskConnectionError(event.error, event.filename) ||
        isMetaMaskConnectionError(event.message, event.filename)
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', onRejection, true);
    window.addEventListener('error', onError, true);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true);
      window.removeEventListener('error', onError, true);
    };
  }, []);

  return null;
}
