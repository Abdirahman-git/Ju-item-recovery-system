import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect, useNavigation, DrawerActions } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllInventoryItems, deleteInventoryItem } from '../../../src/services/supabase';
import { isSecureFoundItem, normalizeItemStatus, ITEM_STATUS } from '../../../src/utils/itemStatus';
import SuccessToast from '../../../src/components/SuccessToast';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import { Colors } from '../../../src/constants/colors';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'secure', label: 'Secure' },
  { id: 'lost', label: 'Lost' },
];

function getAdminIdentity(user) {
  return {
    email: String(user?.email || '').trim().toLowerCase(),
    name: String(user?.userName || user?.name || '').trim().toLowerCase(),
    studentId: String(user?.studentId || user?.student_id || '').trim().toUpperCase(),
  };
}

function isAdminCreatedItem(item, user) {
  if (!user) return false;
  const { email, name, studentId } = getAdminIdentity(user);
  const itemEmail = String(item.email || '').trim().toLowerCase();
  const itemName = String(item.ownerName || item.finderName || item.itemName || '').trim().toLowerCase();
  const itemId = String(item.studentId || item.student_id || '').trim().toUpperCase();
  return itemEmail === email || itemName === name || itemId === studentId || itemEmail.includes(email);
}

function getCardMeta(item) {
  const status = normalizeItemStatus(item);
  const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
  const isSecure = isSecureFoundItem(item);

  if (isSecure && status === ITEM_STATUS.LIVE) {
    return { filter: 'secure', badge: { label: 'Lost', bg: Colors.error, color: '#FFF' } };
  }
  if (itemType === 'found') return { filter: 'lost', badge: { label: 'Lost', bg: Colors.error, color: '#FFF' } };
  return { filter: 'lost', badge: { label: 'Lost', bg: Colors.error, color: '#FFF' } };
}

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminMyItemsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);

  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUserAndItems = useCallback(async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      const userData = sessionData ? JSON.parse(sessionData) : null;
      setUser(userData);
      const allItems = await fetchAllInventoryItems();
      setItems((allItems || []).filter((item) => isAdminCreatedItem(item, userData)));
    } catch (error) {
      console.error('Error fetching items:', error.message);
      showAppFailure('Failed to load your items.', 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserAndItems();
    }, [fetchUserAndItems])
  );

  const counts = useMemo(() => {
    const c = { all: items.length, secure: 0, lost: 0 };
    items.forEach((item) => {
      const meta = getCardMeta(item);
      if (c[meta.filter] != null) c[meta.filter] += 1;
    });
    return c;
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const meta = getCardMeta(item);
      const matchesStatus = statusFilter === 'all' || meta.filter === statusFilter;
      const haystack = [item.itemName, item.category, item.location, item.ownerName, item.finderName, item.description]
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [items, statusFilter, searchQuery]);

  const handleDelete = (item) => {
    showAppConfirm({
      title: 'Delete item',
      message: `Remove "${item.itemName || 'this item'}" permanently?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteInventoryItem(item);
          setItems((prev) => prev.filter((i) => i.id !== item.id || i.itemType !== item.itemType));
          toastRef.current?.show('Deleted!', 'Item has been removed successfully.', 'success');
        } catch (error) {
          showAppFailure(error?.message || 'Could not delete item.', 'Delete failed');
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="My Items"
        subtitle="Items you reported"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchUserAndItems}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="My Property"
          title="My Items"
          subtitle="Manage every report you created — all live items are Lost until returned."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNum}>{counts.all}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSecure]}>
            <Text style={styles.statNum}>{counts.secure}</Text>
            <Text style={styles.statLabel}>Secure</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLost]}>
            <Text style={styles.statNum}>{counts.lost}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your items..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.tabBar}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, statusFilter === tab.id && styles.tabBtnActive]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.tabText, statusFilter === tab.id && styles.tabTextActive]}>
                {tab.label} ({counts[tab.id]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your items...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const meta = getCardMeta(item);
            const isSecure = meta.filter === 'secure';
            return (
              <TouchableOpacity
                key={`${item.itemType}-${item.id}`}
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: `/(admin)/item/${item.id}`,
                    params: { data: JSON.stringify({ ...item, type: meta.filter.toUpperCase() }) },
                  })
                }
              >
                {isSecure ? (
                  <View style={[styles.itemCardImg, styles.secureImg]}>
                    <Text style={styles.secureBang}>!</Text>
                  </View>
                ) : item.imageURI ? (
                  <Image source={{ uri: item.imageURI }} style={styles.itemCardImg} />
                ) : (
                  <View
                    style={[
                      styles.itemCardImg,
                      styles.placeholderImg,
                      { backgroundColor: meta.filter === 'lost' ? Colors.lostBadge : Colors.foundBadge },
                    ]}
                  >
                    <Ionicons
                      name={meta.filter === 'lost' ? 'help-buoy-outline' : 'checkmark-circle-outline'}
                      size={28}
                      color={meta.filter === 'lost' ? Colors.lostBadgeText : Colors.foundBadgeText}
                    />
                  </View>
                )}

                <View style={styles.itemCardInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
                    <View style={[styles.badge, { backgroundColor: meta.badge.bg }]}>
                      <Text style={[styles.badgeText, { color: meta.badge.color }]}>{meta.badge.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.itemName || item.item_name}
                  </Text>
                  <Text style={styles.itemLine} numberOfLines={1}>
                    <Ionicons name="location-outline" size={13} color={Colors.slate500} /> {item.location || 'Unknown'}
                  </Text>
                  <Text style={styles.itemLine} numberOfLines={1}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.slate500} /> {formatDate(item.created_at)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.itemDeleteBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleDelete(item);
                  }}
                >
                  <Ionicons name="trash-outline" size={19} color={Colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={56} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No items</Text>
            <Text style={styles.emptyText}>You have not created any matching items yet.</Text>
          </View>
        )}
      </ScrollView>

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.slate50 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  statCardPrimary: { backgroundColor: Colors.primaryLight, borderColor: '#BFDBFE' },
  statCardSecure: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  statCardFound: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statCardLost: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statNum: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: Colors.slate900 },
  statLabel: { marginTop: 2, fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.slate600 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.slate900 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.slate100, borderRadius: 12, padding: 3, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.slate500 },
  tabTextActive: { color: Colors.slate900 },
  loadingContainer: { paddingTop: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: 'Inter_500Medium', color: Colors.slate500 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  itemCardImg: { width: 78, height: 78, borderRadius: 14, backgroundColor: Colors.slate100 },
  placeholderImg: { alignItems: 'center', justifyContent: 'center' },
  secureImg: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7' },
  secureBang: { fontSize: 46, fontFamily: 'Poppins_700Bold', color: '#D97706' },
  itemCardInfo: { flex: 1, marginLeft: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  itemCategory: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.slate500, textTransform: 'uppercase' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  itemName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: Colors.slate900, marginBottom: 6 },
  itemLine: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.slate600, marginBottom: 2 },
  itemDeleteBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.slate700 },
  emptyText: { marginTop: 6, fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.slate500, textAlign: 'center' },
});
