'use client';

import { createContext, useContext } from 'react';

export const BadgeContext = createContext({
  badgeCounts: { pending: 0, claims: 0, contact: 0 },
  setBadgeCounts: () => {},
  bumpBadge: () => {},
});

export function useAdminBadges() {
  return useContext(BadgeContext);
}

/** Wrap layout setState so pages can decrement/increment badges safely. */
export function createBadgeHelpers(setBadgeCounts) {
  const bumpBadge = (key, delta = -1) => {
    setBadgeCounts((prev) => {
      const current = prev || { pending: 0, claims: 0, contact: 0 };
      const nextValue = Math.max(0, (Number(current[key]) || 0) + delta);
      if (current[key] === nextValue) return current;
      return { ...current, [key]: nextValue };
    });
  };

  return { setBadgeCounts, bumpBadge };
}
