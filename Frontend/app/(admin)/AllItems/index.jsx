import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  fetchAllInventoryItems,
  deleteInventoryItem,
  markSecureFoundReturned,
} from '../../../src/services/supabase';
import { isSecureFoundItem, normalizeItemStatus, ITEM_STATUS } from '../../../src/utils/itemStatus';
import { canMarkInventoryItemReturned } from '../../../src/utils/inventory';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'secure', label: 'Secure' },
  { id: 'found', label: 'Found' },
  { id: 'lost', label: 'Lost' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name', label: 'A–Z' },
  { id: 'name-desc', label: 'Z–A' },
];

function getCardMeta(item) {
  const status = normalizeItemStatus(item);
  const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
  const isSecure = isSecureFoundItem(item);

  if (status === ITEM_STATUS.DRAFT || item.status === 'draft') {
    return {
      filter: 'draft',
      badge: isSecure ? { label: 'Secure Draft', bg: '#F59E0B', color: '#FFF' } : { label: 'Draft', bg: '#7C3AED', color: '#FFF' },
      action: { label: isSecure ? 'Continue Secure' : itemType === 'found' ? 'Continue Found' : 'Continue Lost', variant: 'primary' },
    };
  }

  if (isSecure && status === ITEM_STATUS.LIVE) {
    return {
      filter: 'secure',
      badge: { label: 'Secure', bg: '#D97706', color: '#FFF' },
      action: { label: 'Mark Returned', variant: 'success' },
    };
  }

  if (itemType === 'found') {
    return {
      filter: 'found',
      badge: { label: 'Found', bg: Colors.success, color: '#FFF' },
      action: { label: 'Details', variant: 'ghost' },
    };
  }

  return {
    filter: 'lost',
    badge: { label: 'Lost', bg: Colors.error, color: '#FFF' },
    action: { label: 'Details', variant: 'ghost' },
  };
}

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sortItems(list, sortBy) {
  const rows = [...list];
  const key = (item) => new Date(item.created_at || item.id || 0).getTime();
  if (sortBy === 'oldest') return rows.sort((a, b) => key(a) - key(b));
  if (sortBy === 'name') return rows.sort((a, b) => String(a.itemName || '').localeCompare(String(b.itemName || '')));
  if (sortBy === 'name-desc') return rows.sort((a, b) => String(b.itemName || '').localeCompare(String(a.itemName || '')));
  return rows.sort((a, b) => key(b) - key(a));
}

export default function AllItemsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);
  const { initialTab } = useLocalSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(
    ['all', 'draft', 'secure', 'found', 'lost'].includes(initialTab) ? initialTab : 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchAllInventoryItems();
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showAppFailure('Failed to retrieve property logs.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const counts = useMemo(() => {
    const c = { all: items.length, draft: 0, secure: 0, found: 0, lost: 0 };
    items.forEach((item) => {
      const meta = getCardMeta(item);
      if (c[meta.filter] != null) c[meta.filter] += 1;
    });
    return c;
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortItems(
      items.filter((item) => {
        const meta = getCardMeta(item);
        const matchesStatus = statusFilter === 'all' || meta.filter === statusFilter;
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const haystack = [item.itemName, item.category, item.location, item.ownerName, item.finderName, item.description]
          .join(' ')
          .toLowerCase();
        return matchesStatus && matchesCategory && (!q || haystack.includes(q));
      }),
      sortBy
    );
  }, [items, statusFilter, categoryFilter, searchQuery, sortBy]);

  const handleDelete = (item) => {
    showAppConfirm({
      title: 'Remove item',
      message: `Delete "${item.itemName || 'this item'}" permanently?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteInventoryItem(item);
          setItems((prev) => prev.filter((i) => i.id !== item.id || i.itemType !== item.itemType));
          toastRef.current?.show('Item Removed', 'Property report deleted.', 'success');
        } catch (err) {
          console.error('Delete failed:', err);
          showAppFailure(err?.message || 'Failed to remove item.', 'Delete failed');
        }
      },
    });
  };

  const handleMarkSecureReturned = (item) => {
    showAppConfirm({
      title: 'Mark secure hold returned',
      message: `Release "${item.itemName || 'this secure hold'}" to its verified owner?`,
      confirmText: 'Returned',
      onConfirm: async () => {
        try {
          await markSecureFoundReturned(item.id);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          toastRef.current?.show('Released', 'Secure hold archived as returned.', 'success');
        } catch (err) {
          showAppFailure(err?.message || 'Failed to release secure hold.', 'Release failed');
        }
      },
    });
  };

  const handleMarkReturned = (item) => {
    const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
    if (isSecureFoundItem(item) && normalizeItemStatus(item) === ITEM_STATUS.LIVE) {
      handleMarkSecureReturned(item);
      return;
    }
    router.push({
      pathname: `/(admin)/item/${item.id}`,
      params: {
        data: JSON.stringify({ ...item, type: itemType.toUpperCase() }),
        openReturn: '1',
      },
    });
  };

  const handleOpenItem = (item) => {
    const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
    const meta = getCardMeta(item);

    if (meta.filter === 'draft') {
      const isSecure = isSecureFoundItem(item);
      const path = isSecure ? '/(admin)/SecureFound' : itemType === 'found' ? '/(admin)/Found' : '/(admin)/Lost';
      router.push({ pathname: path, params: { draftId: String(item.id) } });
      return;
    }

    router.push({
      pathname: `/(admin)/item/${item.id}`,
      params: { data: JSON.stringify({ ...item, type: itemType.toUpperCase() }) },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="All Items"
        subtitle="University property logs"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Item Management"
          title="All property logs"
          subtitle="Browse, manage, and release every report in one unified inventory."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNum}>{counts.all}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, styles.statCardDraft]}>
            <Text style={styles.statNum}>{counts.draft}</Text>
            <Text style={styles.statLabel}>Draft</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSecure]}>
            <Text style={styles.statNum}>{counts.secure}</Text>
            <Text style={styles.statLabel}>Secure</Text>
          </View>
          <View style={[styles.statCard, styles.statCardFound]}>
            <Text style={styles.statNum}>{counts.found}</Text>
            <Text style={styles.statLabel}>Found</Text>
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
            placeholder="Search items, locations, reporters..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.chip, statusFilter === tab.id && styles.chipActive]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.chipText, statusFilter === tab.id && styles.chipTextActive]}>
                {tab.label} ({counts[tab.id]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, categoryFilter === cat && styles.chipActive]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>
                {cat === 'all' ? 'All categories' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.chip, sortBy === opt.id && styles.chipActive]}
              onPress={() => setSortBy(opt.id)}
            >
              <Text style={[styles.chipText, sortBy === opt.id && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading property logs...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const meta = getCardMeta(item);
            const isSecure = meta.filter === 'secure';
            const showReturn = canMarkInventoryItemReturned(item);
            return (
              <TouchableOpacity
                key={`${item.itemType}-${item.id}`}
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() => handleOpenItem(item)}
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
                {showReturn ? (
                  <TouchableOpacity
                    style={styles.itemReturnBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleMarkReturned(item);
                    }}
                  >
                    <Text style={styles.itemReturnBtnText}>Return</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={56} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No matching items</Text>
            <Text style={styles.emptyText}>Try another filter, search, or switch tabs.</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCardPrimary: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  statCardDraft: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  statCardSecure: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statCardFound: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statCardLost: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.slate900,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.slate600,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate900,
  },
  filterScroll: {
    marginBottom: 10,
  },
  chip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#93C5FD',
  },
  chipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate500,
  },
  chipTextActive: {
    color: Colors.primaryDark,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  itemCardImg: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: Colors.slate100,
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureImg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  secureBang: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    color: '#D97706',
  },
  itemCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  itemCategory: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate500,
    textTransform: 'uppercase',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  itemName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: Colors.slate900,
    marginBottom: 6,
  },
  itemLine: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.slate600,
    marginBottom: 2,
  },
  itemDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  itemReturnBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 4,
  },
  itemReturnBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#047857',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.slate700,
  },
  emptyText: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
  },
});
