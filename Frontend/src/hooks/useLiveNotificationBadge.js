import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUnreadNotificationCount,
  subscribeToAppNotifications,
} from '../services/supabase';

const POLL_MS = 15_000;

/**
 * Keeps Home bell badge fresh without manual refresh:
 * - load on mount / email change
 * - Supabase realtime INSERT
 * - light polling fallback if realtime is not enabled yet
 */
export default function useLiveNotificationBadge({ onNewNotification } = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const prevCountRef = useRef(0);
  const readyRef = useRef(false);
  const onNewRef = useRef(onNewNotification);
  onNewRef.current = onNewNotification;

  const refresh = useCallback(async (emailOverride, opts) => {
    const silent = Boolean(opts && typeof opts === 'object' && opts.silent);
    const email =
      (typeof emailOverride === 'string' ? emailOverride : userEmail)?.trim().toLowerCase() ||
      '';
    if (!email) {
      setUnreadCount(0);
      return 0;
    }
    const count = await getUnreadNotificationCount(email);
    setUnreadCount(count);
    if (!silent && readyRef.current && count > prevCountRef.current) {
      const grew = count - prevCountRef.current;
      if (grew > 0 && onNewRef.current) {
        onNewRef.current({ count, grew });
      }
    }
    prevCountRef.current = count;
    return count;
  }, [userEmail]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('userSession').then((raw) => {
      if (cancelled || !raw) return;
      try {
        const session = JSON.parse(raw);
        const email = session?.email || '';
        setUserEmail(email);
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userEmail) return undefined;

    let active = true;
    readyRef.current = false;
    prevCountRef.current = 0;

    (async () => {
      const count = await getUnreadNotificationCount(userEmail);
      if (!active) return;
      prevCountRef.current = count;
      setUnreadCount(count);
      readyRef.current = true;
    })();

    const unsub = subscribeToAppNotifications((row) => {
      if (!active) return;
      // Optimistic badge bump so Profile / any screen updates instantly.
      prevCountRef.current += 1;
      setUnreadCount(prevCountRef.current);
      if (onNewRef.current) {
        const title = String(row?.title || '').trim();
        const body = String(row?.body || row?.item_name || '').trim();
        onNewRef.current({
          count: prevCountRef.current,
          grew: 1,
          title: title || 'New notification',
          body,
          row,
        });
      }
      // Reconcile exact unread count (no second toast).
      refresh(userEmail, { silent: true });
    });

    const poll = setInterval(() => {
      if (active) refresh(userEmail);
    }, POLL_MS);

    return () => {
      active = false;
      readyRef.current = false;
      clearInterval(poll);
      unsub();
    };
  }, [userEmail, refresh]);

  return { unreadCount, userEmail, refresh };
}
