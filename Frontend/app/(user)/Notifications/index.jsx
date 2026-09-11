import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import {
  fetchAppNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getAllLostItems,
  getAllFoundItems,
  subscribeToAppNotifications,
} from '../../../src/services/supabase';
import { showAppConfirm, showAppError } from '../../../src/utils/appAlert';
import { clearNotificationsInbox } from '../../../src/utils/notificationInbox';
import { useUserNotifications } from '../../../src/context/UserNotificationContext';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const SLATE_900 = '#0F172A';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const PRIMARY = '#1A56DB';
const LOST_BLUE = '#3B82F6';
const FOUND_GREEN = '#10B981';

function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.round(diffMs / 3_600_000)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { refresh: refreshBadge } = useUserNotifications();
  const [userEmail, setUserEmail] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async (opts) => {
    const silent = Boolean(opts && typeof opts === 'object' && opts.silent);
    try {
      if (!silent) setLoading(true);
      setLoadError('');
      const raw = await AsyncStorage.getItem('userSession');
      const session = raw ? JSON.parse(raw) : null;
      const email = session?.email || '';
      setUserEmail(email);
      const rows = await fetchAppNotifications(email);
      setNotifications(Array.isArray(rows) ? rows : []);
      refreshBadge?.(email);
    } catch (e) {
      const msg = e?.message || 'Could not load notifications.';
      setLoadError(msg);
      if (!silent) showAppError(msg, 'Inbox');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [refreshBadge]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Live inbox: new rows appear without leaving / refreshing the page.
  useEffect(() => {
    const unsub = subscribeToAppNotifications(() => {
      load({ silent: true });
    });
    const poll = setInterval(() => load({ silent: true }), 15_000);
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const openNotification = async (note) => {
    if (userEmail && !note.isRead) {
      await markNotificationRead(note.id, userEmail);
      setNotifications((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, isRead: true } : n))
      );
      refreshBadge?.(userEmail);
    }

    if (!note.item_id) return;

    try {
      const type = note.item_type === 'lost' ? 'lost' : 'found';
      const list = type === 'lost' ? await getAllLostItems() : await getAllFoundItems();
      const item = (list || []).find((row) => Number(row.id) === Number(note.item_id));
      if (!item) {
        showAppError('This item is no longer on the live feed.', 'Item unavailable');
        return;
      }
      const payload = { ...item, type: type === 'lost' ? 'LOST' : 'FOUND' };
      router.push({
        pathname: `/(user)/item/${item.id}`,
        params: { data: JSON.stringify(payload) },
      });
    } catch (e) {
      showAppError(e?.message || 'Could not open item.', 'Open failed');
    }
  };

  const handleMarkAll = async () => {
    if (!userEmail || unreadCount === 0) return;
    await markAllNotificationsRead(userEmail);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    refreshBadge?.(userEmail);
  };

  const handleClearInbox = () => {
    if (!userEmail || notifications.length === 0) return;
    showAppConfirm({
      title: 'Clear notifications?',
      message: 'Old notifications will be removed from your inbox. Only new ones will appear after this.',
      confirmText: 'Clear',
      destructive: true,
      onConfirm: async () => {
        try {
          await markAllNotificationsRead(userEmail);
          await clearNotificationsInbox(userEmail);
          setNotifications([]);
          refreshBadge?.(userEmail);
        } catch (e) {
          showAppError(e?.message || 'Could not clear inbox.', 'Clear failed');
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color={SLATE_900} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.headerLogoSmall} />
          <Text style={styles.headerBrandText}>Inbox</Text>
        </View>
        <TouchableOpacity onPress={() => load()} style={styles.headerIconBtn}>
          <Ionicons name="refresh-outline" size={22} color={SLATE_600} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Notifications</Text>
            <Text style={styles.pageSubtitle}>
              {loadError
                ? 'Could not load inbox'
                : unreadCount > 0
                  ? `${unreadCount} unread`
                  : notifications.length > 0
                    ? `${notifications.length} notifications`
                    : 'No new notifications'}
            </Text>
            {loadError ? (
              <Text style={styles.errorText} numberOfLines={4}>
                {loadError}
              </Text>
            ) : null}
          </View>
          {notifications.length > 0 ? (
            <View style={styles.heroActions}>
              {unreadCount > 0 ? (
                <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearInbox}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={SLATE_400} style={{ marginTop: 48 }} />
        ) : notifications.length > 0 ? (
          <View style={styles.list}>
            {notifications.map((note, index) => {
              const accent = note.item_type === 'found' ? FOUND_GREEN : LOST_BLUE;
              const hasImage = Boolean(note.imageURI);
              return (
                <Animated.View key={note.id} entering={FadeInDown.delay(index * 40).springify()}>
                  <TouchableOpacity
                    style={[styles.card, !note.isRead && styles.cardUnread]}
                    activeOpacity={0.9}
                    onPress={() => openNotification(note)}
                  >
                    <View style={[styles.iconWrap, !hasImage && { backgroundColor: `${accent}15` }]}>
                      {hasImage ? (
                        <Image source={{ uri: note.imageURI }} style={styles.itemThumb} />
                      ) : (
                        <MaterialCommunityIcons
                          name={note.item_type === 'found' ? 'package-variant' : 'magnify'}
                          size={22}
                          color={accent}
                        />
                      )}
                      {!note.isRead ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {note.title || 'Notification'}
                        </Text>
                        <Text style={styles.cardTime}>{formatWhen(note.created_at)}</Text>
                      </View>
                      <Text style={styles.cardBodyText} numberOfLines={2}>
                        {note.body || note.item_name || 'New approved item'}
                      </Text>
                      <Text style={[styles.cardMeta, { color: accent }]}>
                        Tap to view item
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-outline" size={40} color={SLATE_400} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              If Supabase Table Editor shows rows but this screen is empty, run
              supabase/fix_notifications_rls.sql then tap refresh again.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <CustomBottomTab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogoSmall: { width: 28, height: 28 },
  headerBrandText: { fontSize: 15, fontWeight: '800', color: SLATE_900 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: SLATE_900 },
  pageSubtitle: { marginTop: 4, fontSize: 13, color: SLATE_500, fontWeight: '600', lineHeight: 18 },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 17,
  },
  heroActions: { alignItems: 'flex-end', gap: 8 },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: `${PRIMARY}12`,
  },
  markAllText: { fontSize: 12, fontWeight: '800', color: PRIMARY },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  clearBtnText: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardUnread: {
    borderColor: `${PRIMARY}40`,
    backgroundColor: '#F8FBFF',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  itemThumb: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: SLATE_900 },
  cardTime: { fontSize: 11, fontWeight: '700', color: SLATE_400 },
  cardBodyText: { marginTop: 4, fontSize: 13, color: SLATE_600, lineHeight: 18, fontWeight: '600' },
  cardMeta: { marginTop: 6, fontSize: 11, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: SLATE_900 },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: SLATE_500,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
});
