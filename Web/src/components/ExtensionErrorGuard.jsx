'use client';

import { useEffect } from 'react';

const METAMASK_EXTENSION_ID = 'nkbihfbeogaeaoehlefnkodbefgpgknn';

function textOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const message = value.message ? String(value.message) : '';
  const stack = value.stack ? String(value.stack) : '';
  const cause = value.cause ? textOf(value.cause) : '';
  try {
    return `${message}\n${stack}\n${cause}\n${String(value)}`;
  } catch {
    return message || stack || cause;
  }
}

function isMetaMaskNoise(value, source = '') {
  const haystack = `${textOf(value)}\n${source}`.toLowerCase();
  return (
    haystack.includes('metamask') ||
    haystack.includes(METAMASK_EXTENSION_ID) ||
    haystack.includes('failed to connect to metamask') ||
    haystack.includes('metamask extension not found')
  );
}

/**
 * MetaMask (and similar wallet extensions) inject scripts that throw on every page.
 * Swallow those so Next.js dev overlay does not treat them as app runtime errors.
 */
export default function ExtensionErrorGuard() {
  useEffect(() => {
    const onRejection = (event) => {
      if (!isMetaMaskNoise(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
    };

    const onError = (event) => {
      if (!isMetaMaskNoise(event.error, event.filename) && !isMetaMaskNoise(event.message, event.filename)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    };

    // Capture phase so we run before Next.js / React overlay handlers.
    window.addEventListener('unhandledrejection', onRejection, true);
    window.addEventListener('error', onError, true);

    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true);
      window.removeEventListener('error', onError, true);
    };
  }, []);

  return null;
}
