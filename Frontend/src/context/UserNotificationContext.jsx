import React, { createContext, useContext, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import NotificationBanner from '../components/NotificationBanner';
import useLiveNotificationBadge from '../hooks/useLiveNotificationBadge';
import { resolveNotificationItemImage } from '../services/supabase';

const UserNotificationContext = createContext({
  unreadCount: 0,
  userEmail: '',
  refresh: async () => 0,
});

export function UserNotificationProvider({ children }) {
  const bannerRef = useRef(null);
  const router = useRouter();

  const live = useLiveNotificationBadge({
    onNewNotification: ({ grew, title, body, row }) => {
      const msg =
        title ||
        (grew === 1 ? 'New notification' : `${grew} new notifications`);
      const openInbox = () => router.push('/(user)/Notifications');

      const show = (imageUrl) => {
        bannerRef.current?.show(msg, body || '', 'success', {
          durationMs: 5000,
          onPress: openInbox,
          imageUrl: imageUrl || null,
        });
      };

      if (row?.item_id && row?.item_type) {
        resolveNotificationItemImage(row.item_type, row.item_id)
          .then((uri) => show(uri))
          .catch(() => show(null));
      } else {
        show(null);
      }
    },
  });

  return (
    <UserNotificationContext.Provider value={live}>
      <View style={styles.root}>
        {children}
        <NotificationBanner ref={bannerRef} />
      </View>
    </UserNotificationContext.Provider>
  );
}

export function useUserNotifications() {
  return useContext(UserNotificationContext);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
