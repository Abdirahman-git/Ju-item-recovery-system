import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import ReAnimated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, normalizeItemRow, getUserPendingClaimCount } from '../../../src/services/supabase';
import ItemStatusBadge from '../../../src/components/ItemStatusBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import { useFocusEffect } from 'expo-router';
import SuccessToast from '../../../src/components/SuccessToast';
import { showAppConfirm, showAppError, showAppFailure } from '../../../src/utils/appAlert';
import { ITEM_STATUS, normalizeItemStatus } from '../../../src/utils/itemStatus';
import { getItemPlaceholderMciIcon } from '../../../src/utils/itemPlaceholderIcon';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

function isMyItemsLive(item) {
  const status = normalizeItemStatus(item);
  return status === ITEM_STATUS.LIVE;
}

function isMyItemsPending(item) {
  return normalizeItemStatus(item) === ITEM_STATUS.PENDING_REVIEW;
}

export default function MyItemsPage() {
  const WITHDRAW_WINDOW_MINUTES = 15;
  const WITHDRAW_WINDOW_MS = WITHDRAW_WINDOW_MINUTES * 60 * 1000;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('lost'); // 'lost' or 'found'
  const [statusFilter, setStatusFilter] = useState('live'); // 'live' | 'pending'
  const [loading, setLoading] = useState(true);
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [user, setUser] = useState(null);
  const [pendingClaimCount, setPendingClaimCount] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const toastRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchUserAndItems = async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      if (!sessionData) {
        setLoading(false);
        return;
      }
      const userData = JSON.parse(sessionData);
      setUser(userData);

      const userEmail = userData.email;

      // Fetch Lost Items
      const { data: lostData, error: lostError } = await supabase
        .from('lost_items')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false });

      if (lostError) throw lostError;
      setLostItems((lostData || []).map(normalizeItemRow));

      // Fetch Found Items
      const { data: foundData, error: foundError } = await supabase
        .from('found_items')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false });

      if (foundError) throw foundError;
      setFoundItems((foundData || []).map(normalizeItemRow));

      const pendingCount = await getUserPendingClaimCount(userEmail);
      setPendingClaimCount(pendingCount);

    } catch (error) {
      console.error('Error fetching items:', error.message);
      showAppError('Load failed', 'Failed to load your items.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserAndItems();
    }, [])
  );

  const tabItems = useMemo(
    () => [
      ...lostItems.map((item) => ({ ...item, listType: 'lost' })),
      ...foundItems.map((item) => ({ ...item, listType: 'found' })),
    ],
    [lostItems, foundItems]
  );
  const pendingCountForTab = tabItems.filter(isMyItemsPending).length;
  const liveCountForTab = tabItems.filter(isMyItemsLive).length;
  const visibleItems = tabItems.filter((item) =>
    statusFilter === 'pending' ? isMyItemsPending(item) : isMyItemsLive(item)
  );

  const getWithdrawMeta = (item) => {
    if (!item?.created_at) {
      return { canWithdraw: false, minutesLeft: 0, label: '' };
    }

    const createdAtMs = new Date(item.created_at).getTime();
    if (Number.isNaN(createdAtMs)) {
      return { canWithdraw: false, minutesLeft: 0, label: '' };
    }

    const elapsed = Math.max(0, nowTs - createdAtMs);
    const remainingMs = WITHDRAW_WINDOW_MS - elapsed;
    const canWithdraw = remainingMs > 0;
    const minutesLeft = canWithdraw ? Math.ceil(remainingMs / 60000) : 0;

    return {
      canWithdraw,
      minutesLeft,
      label: canWithdraw ? `Withdraw in ${minutesLeft} min` : '',
    };
  };

  const handleWithdraw = async (item, type) => {
    const meta = getWithdrawMeta(item);
    if (!meta.canWithdraw) {
      toastRef.current?.show(
        'Withdraw Expired',
        `You can withdraw only within ${WITHDRAW_WINDOW_MINUTES} minutes after posting.`,
        'error'
      );
      return;
    }

    showAppConfirm({
      title: 'Withdraw item',
      message: `Are you sure you want to withdraw this report? (${meta.minutesLeft} min left)`,
      confirmText: 'Withdraw',
      destructive: true,
      onConfirm: async () => {
        try {
          const table = type === 'lost' ? 'lost_items' : 'found_items';
          const { error } = await supabase.from(table).delete().eq('id', item.id);
          if (error) throw error;

          toastRef.current?.show('Withdrawn!', 'Your report has been withdrawn successfully.');

          if (type === 'lost') {
            setLostItems(lostItems.filter(i => i.id !== item.id));
          } else {
            setFoundItems(foundItems.filter(i => i.id !== item.id));
          }
        } catch (error) {
          showAppFailure('Could not withdraw item. Please try again.', 'Withdraw failed');
        }
      },
    });
  };

  const handleClearAll = async () => {
    const withdrawableItems = visibleItems.filter((item) => getWithdrawMeta(item).canWithdraw);
    const skippedCount = visibleItems.length - withdrawableItems.length;
    if (withdrawableItems.length === 0) {
      toastRef.current?.show(
        'No Withdrawable Items',
        `Only items posted within ${WITHDRAW_WINDOW_MINUTES} minutes can be withdrawn.`,
        'error'
      );
      return;
    }

    showAppConfirm({
      title: 'Withdraw recent items',
      message: `Withdraw ${withdrawableItems.length} item(s)? ${skippedCount > 0 ? `${skippedCount} old item(s) will be kept.` : ''}`,
      confirmText: 'Withdraw',
      destructive: true,
      onConfirm: async () => {
        try {
          const lostIds = withdrawableItems.filter((i) => i.listType === 'lost').map((i) => i.id);
          const foundIds = withdrawableItems.filter((i) => i.listType === 'found').map((i) => i.id);
          if (lostIds.length) {
            const { error } = await supabase.from('lost_items').delete().in('id', lostIds);
            if (error) throw error;
          }
          if (foundIds.length) {
            const { error } = await supabase.from('found_items').delete().in('id', foundIds);
            if (error) throw error;
          }

          toastRef.current?.show(
            'Withdraw Complete',
            skippedCount > 0
              ? `${withdrawableItems.length} withdrawn. ${skippedCount} older item(s) were not changed.`
              : `All eligible items were withdrawn.`
          );

          if (lostIds.length) setLostItems((prev) => prev.filter((i) => !lostIds.includes(i.id)));
          if (foundIds.length) setFoundItems((prev) => prev.filter((i) => !foundIds.includes(i.id)));
        } catch (error) {
          showAppError('Withdraw failed', 'Could not withdraw items.');
        }
      },
    });
  };

  const ItemCard = ({ item, type, index }) => {
    const withdrawMeta = getWithdrawMeta(item);
    return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={styles.card}
      onPress={() => router.push({
        pathname: `/(user)/item/${item.id}`,
        params: { data: JSON.stringify({ ...item, type: type.toUpperCase() }) }
      })}
    >
      <View style={styles.imageWrapper}>
        {item.imageURI ? (
          <Image source={{ uri: item.imageURI }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialCommunityIcons
              name={getItemPlaceholderMciIcon(item.itemName || item.item_name, item.category)}
              size={40}
              color="#94A3B8"
            />
          </View>
        )}
        {withdrawMeta.canWithdraw && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              handleWithdraw(item, type);
            }}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={18}
              color="#EF4444"
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: type === 'lost' ? '#FEE2E2' : '#DCFCE7' }]}>
            <Text style={[styles.statusText, { color: type === 'lost' ? '#EF4444' : '#10B981' }]}>
              {type.toUpperCase()}
            </Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{String(item.category || 'General').toUpperCase()}</Text>
          </View>
          <ItemStatusBadge item={item} compact />
        </View>

        <Text style={styles.itemTitle}>{item.itemName}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}> Reported {type === 'lost' ? item.dateLost : item.dateFound}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}>
            {type === 'lost'
              ? (item.timeLost || item.timelost || 'Time not specified')
              : (item.timeFound || item.timefound || 'Time not specified')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}> {item.location}</Text>
        </View>
        {statusFilter === 'pending' ? (
          <View style={styles.pendingHintRow}>
            <Ionicons name="hourglass-outline" size={14} color="#B45309" />
            <Text style={styles.pendingHintText}> Waiting for admin review</Text>
          </View>
        ) : null}
        {withdrawMeta.canWithdraw && (
          <View style={styles.withdrawInfoRow}>
            <Ionicons
              name="timer-outline"
              size={14}
              color="#16A34A"
            />
            <Text style={styles.withdrawInfoText}>
              {' '}{withdrawMeta.label}
            </Text>
          </View>
        )}
      </View>
      </TouchableOpacity>
  );
  };

  const hasWithdrawableItems = visibleItems.some((item) => getWithdrawMeta(item).canWithdraw);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header aligned with other pages */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.headerLogoSmall} />
          <Text style={styles.headerBrandText}>Jazeera University</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
             <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>My Items</Text>
                <Text style={styles.pageSubtitle}>
                  Your lost/found reports. Live = on the feed. Pending = waiting for admin. Ownership claims are under Requests.
                </Text>
             </View>
             <View style={styles.titleActions}>
               <TouchableOpacity
                 style={styles.requestsBtn}
                 onPress={() => router.push('/(user)/MyRequests')}
               >
                 <Ionicons name="document-text-outline" size={16} color="#7C3AED" />
                 <Text style={styles.requestsBtnText}>Requests</Text>
                 {pendingClaimCount > 0 && (
                   <View style={styles.requestsBadge}>
                     <Text style={styles.requestsBadgeText}>{pendingClaimCount}</Text>
                   </View>
                 )}
               </TouchableOpacity>
               {hasWithdrawableItems && (
                 <TouchableOpacity 
                   style={styles.clearAllBtn}
                   onPress={() => handleClearAll()}
                 >
                    <Ionicons name="arrow-undo-outline" size={16} color="#EF4444" />
                    <Text style={styles.clearAllText}>Withdraw Recent</Text>
                 </TouchableOpacity>
               )}
             </View>
          </View>
        </View>

        {/* My lost items (all live reports until returned) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, styles.activeTab]}
            onPress={() => setActiveTab('lost')}
          >
            <Text style={[styles.tabLabel, styles.activeTabLabel]}>My Lost Items</Text>
          </TouchableOpacity>
        </View>

        {/* Live (default) vs Pending review */}
        <View style={styles.statusFilterRow}>
          <TouchableOpacity
            style={[styles.statusChip, statusFilter === 'live' && styles.statusChipActiveLive]}
            onPress={() => setStatusFilter('live')}
          >
            <Text style={[styles.statusChipText, statusFilter === 'live' && styles.statusChipTextActive]}>
              Live{liveCountForTab > 0 ? ` (${liveCountForTab})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusChip, statusFilter === 'pending' && styles.statusChipActivePending]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[styles.statusChipText, statusFilter === 'pending' && styles.statusChipTextActivePending]}>
              Pending{pendingCountForTab > 0 ? ` (${pendingCountForTab})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#94A3B8" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.itemsList}>
            {visibleItems.length > 0 ? (
              visibleItems.map((item, index) => (
                <ItemCard key={`${item.listType}-${item.id}`} item={item} type={item.listType || 'lost'} index={index} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name={statusFilter === 'pending' ? 'timer-sand' : 'folder-open-outline'}
                  size={60}
                  color="#CBD5E1"
                />
                <Text style={styles.emptyText}>
                  {statusFilter === 'pending'
                    ? 'No reports waiting for admin review.'
                    : 'No live lost items yet.'}
                </Text>
                {statusFilter === 'live' && pendingCountForTab > 0 ? (
                  <TouchableOpacity onPress={() => setStatusFilter('pending')} style={styles.emptyLinkBtn}>
                    <Text style={styles.emptyLinkText}>
                      View {pendingCountForTab} pending report{pendingCountForTab === 1 ? '' : 's'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>

      <CustomBottomTab />
      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10,
    backgroundColor: '#FFF'
  },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerLogoSmall: { width: 28, height: 28, marginRight: 8 },
  headerBrandText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  scrollContainer: { paddingHorizontal: 20, paddingTop: 20 },
  titleSection: { marginBottom: 25 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleActions: { alignItems: 'flex-end', gap: 8 },
  requestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 6,
  },
  requestsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  requestsBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  requestsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 18 },
  clearAllBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF1F2', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  clearAllText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#EF4444', 
    marginLeft: 6 
  },

  tabContainer: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 25, padding: 6, marginBottom: 30
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  tabLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeTabLabel: { color: '#1E40AF' },

  statusFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActiveLive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusChipActivePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  statusChipTextActive: {
    color: '#15803D',
  },
  statusChipTextActivePending: {
    color: '#B45309',
  },
  pendingHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pendingHintText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '700',
  },
  emptyLinkBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A56DB',
  },

  itemsList: { gap: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginBottom: 20
  },
  imageWrapper: { height: 190, width: '100%', position: 'relative', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: {
    position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3
  },
  cardBody: { padding: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  categoryBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  itemTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  withdrawInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  withdrawInfoText: { fontSize: 12, color: '#16A34A', fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#94A3B8', fontWeight: '600' },
});

