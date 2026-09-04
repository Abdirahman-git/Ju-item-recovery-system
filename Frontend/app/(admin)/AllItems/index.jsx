import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation, DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
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
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'draft', label: 'Draft', icon: 'document-text-outline' },
  { id: 'secure', label: 'Secure', icon: 'shield-checkmark-outline' },
  { id: 'lost', label: 'Lost', icon: 'help-buoy-outline' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest', icon: 'arrow-down-outline' },
  { id: 'oldest', label: 'Oldest', icon: 'arrow-up-outline' },
  { id: 'name', label: 'A–Z', icon: 'text-outline' },
  { id: 'name-desc', label: 'Z–A', icon: 'text-outline' },
];

const STAT_META = {
  all: { label: 'Total', icon: 'albums-outline', tint: Colors.primary, soft: Colors.primaryLight },
  draft: { label: 'Draft', icon: 'create-outline', tint: '#7C3AED', soft: '#EDE9FE' },
  secure: { label: 'Secure', icon: 'lock-closed-outline', tint: '#D97706', soft: '#FEF3C7' },
  lost: { label: 'Lost', icon: 'alert-circle-outline', tint: Colors.error, soft: '#FEF2F2' },
};

function getCardMeta(item) {
  const status = normalizeItemStatus(item);
  const itemType = item.itemType || (String(item.type || '').toUpperCase() === 'LOST' ? 'lost' : 'found');
  const isSecure = isSecureFoundItem(item);

  if (status === ITEM_STATUS.DRAFT || item.status === 'draft') {
    return {
      filter: 'draft',
      badge: isSecure
        ? { label: 'Secure Draft', bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74' }
        : { label: 'Draft', bg: '#F5F3FF', color: '#6D28D9', border: '#C4B5FD' },
    };
  }

  if (isSecure && status === ITEM_STATUS.LIVE) {
    return {
      filter: 'secure',
      badge: { label: 'Lost', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
    };
  }

  if (itemType === 'found') {
    return {
      filter: 'lost',
      badge: { label: 'Lost', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
    };
  }

  return {
    filter: 'lost',
    badge: { label: 'Lost', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
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

function PressScale({ children, onPress, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [style, pressed && !disabled && { transform: [{ scale: 0.96 }] }]}
    >
      {children}
    </Pressable>
  );
}

export default function AllItemsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);
  const { initialTab } = useLocalSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(
    ['all', 'draft', 'secure', 'lost'].includes(initialTab) ? initialTab : 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    const c = { all: items.length, draft: 0, secure: 0, lost: 0 };
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

  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

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
        title="Inventory"
        subtitle="Campus property desk"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <PressScale style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primaryDark} />
          </PressScale>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.heroCard}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1A56DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEyebrow}>ITEM MANAGEMENT</Text>
            <Text style={styles.heroTitle}>Property logs</Text>
            <Text style={styles.heroSubtitle}>
              Review, release, and keep every campus report in one clean desk.
            </Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaPill}>
                <Ionicons name="layers-outline" size={14} color="#BFDBFE" />
                <Text style={styles.heroMetaText}>{counts.all} items</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <Ionicons name="flash-outline" size={14} color="#BFDBFE" />
                <Text style={styles.heroMetaText}>{counts.secure} secure</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
          style={styles.statsRow}
        >
          {STATUS_TABS.map((tab, index) => {
            const meta = STAT_META[tab.id];
            const active = statusFilter === tab.id;
            return (
              <Animated.View key={tab.id} entering={FadeInDown.delay(60 * index).duration(380)}>
                <PressScale
                  style={[styles.statCard, active && styles.statCardActive, { backgroundColor: meta.soft }]}
                  onPress={() => setStatusFilter(tab.id)}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: '#FFF' }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.tint} />
                  </View>
                  <Text style={[styles.statNum, { color: meta.tint }]}>{counts[tab.id]}</Text>
                  <Text style={styles.statLabel}>{meta.label}</Text>
                </PressScale>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={styles.toolbar}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, place, person..."
              placeholderTextColor={Colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <PressScale onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.slate400} />
              </PressScale>
            ) : null}
          </View>

          <PressScale
            style={[styles.filterToggle, filtersOpen && styles.filterToggleActive]}
            onPress={() => setFiltersOpen((v) => !v)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filtersOpen || activeFilterCount ? Colors.primaryDark : Colors.slate600}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </PressScale>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChips}>
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <PressScale
                key={tab.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatusFilter(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? Colors.white : Colors.slate500}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {tab.label}
                </Text>
                <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                  {counts[tab.id]}
                </Text>
              </PressScale>
            );
          })}
        </ScrollView>

        {filtersOpen ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.filterPanel}>
            <Text style={styles.filterSectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelChips}>
              {categories.map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <PressScale
                    key={cat}
                    style={[styles.softChip, active && styles.softChipActive]}
                    onPress={() => setCategoryFilter(cat)}
                  >
                    <Text style={[styles.softChipText, active && styles.softChipTextActive]} numberOfLines={1}>
                      {cat === 'all' ? 'All categories' : cat}
                    </Text>
                  </PressScale>
                );
              })}
            </ScrollView>

            <Text style={[styles.filterSectionLabel, { marginTop: 12 }]}>Sort</Text>
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.id;
                return (
                  <PressScale
                    key={opt.id}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    onPress={() => setSortBy(opt.id)}
                  >
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{opt.label}</Text>
                  </PressScale>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>
            {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}
          </Text>
          {(categoryFilter !== 'all' || sortBy !== 'newest') && (
            <PressScale
              onPress={() => {
                setCategoryFilter('all');
                setSortBy('newest');
              }}
            >
              <Text style={styles.clearFilters}>Reset</Text>
            </PressScale>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading property logs...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const meta = getCardMeta(item);
            const isSecure = meta.filter === 'secure';
            const showReturn = canMarkInventoryItemReturned(item);
            const categoryLabel = String(item.category || 'General');

            return (
              <Animated.View
                key={`${item.itemType}-${item.id}`}
                entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(360)}
              >
                <PressScale style={styles.itemCard} onPress={() => handleOpenItem(item)}>
                  <View style={styles.thumbWrap}>
                    {isSecure ? (
                      <View style={[styles.itemCardImg, styles.secureImg]}>
                        <Ionicons name="shield" size={28} color="#D97706" />
                      </View>
                    ) : item.imageURI ? (
                      <Image source={{ uri: item.imageURI }} style={styles.itemCardImg} />
                    ) : (
                      <View
                        style={[
                          styles.itemCardImg,
                          styles.placeholderImg,
                          {
                            backgroundColor:
                              meta.filter === 'lost' ? Colors.lostBadge : Colors.foundBadge,
                          },
                        ]}
                      >
                        <Ionicons
                          name={meta.filter === 'lost' ? 'help-buoy-outline' : 'checkmark-circle-outline'}
                          size={26}
                          color={meta.filter === 'lost' ? Colors.lostBadgeText : Colors.foundBadgeText}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemCardBody}>
                    <View style={styles.itemTopRow}>
                      <Text style={styles.itemCategory} numberOfLines={1} ellipsizeMode="tail">
                        {categoryLabel}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: meta.badge.bg,
                            borderColor: meta.badge.border,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: meta.badge.color }]}>
                          {meta.badge.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.itemName || item.item_name}
                    </Text>

                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color={Colors.slate400} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.location || 'Unknown location'}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.slate400} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>

                    <View style={styles.cardActions}>
                      {showReturn ? (
                        <PressScale
                          style={styles.returnBtn}
                          onPress={() => handleMarkReturned(item)}
                        >
                          <Ionicons name="return-down-back-outline" size={14} color="#047857" />
                          <Text style={styles.returnBtnText}>Return</Text>
                        </PressScale>
                      ) : (
                        <View style={styles.openHint}>
                          <Text style={styles.openHintText}>Open</Text>
                          <Ionicons name="chevron-forward" size={14} color={Colors.slate400} />
                        </View>
                      )}

                      <PressScale
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </PressScale>
                    </View>
                  </View>
                </PressScale>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="albums-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No matching items</Text>
            <Text style={styles.emptyText}>Try another filter, search, or clear the advanced options.</Text>
          </View>
        )}
      </ScrollView>

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
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
    paddingBottom: 48,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  heroEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#93C5FD',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.white,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(226,232,240,0.9)',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 16,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroMetaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#E2E8F0',
  },
  statsRow: {
    marginBottom: 14,
    marginHorizontal: -20,
  },
  statsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    width: 88,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statCardActive: {
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate900,
    paddingVertical: 0,
  },
  filterToggle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#93C5FD',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.white,
  },
  statusChips: {
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate600,
  },
  chipTextActive: {
    color: Colors.white,
  },
  chipCount: {
    marginLeft: 6,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.slate400,
    fontVariant: ['tabular-nums'],
  },
  chipCountActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  filterPanel: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  filterSectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.slate400,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  panelChips: {
    gap: 8,
  },
  softChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate100,
    maxWidth: 160,
  },
  softChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#93C5FD',
  },
  softChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate600,
  },
  softChipTextActive: {
    color: Colors.primaryDark,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  sortChipActive: {
    backgroundColor: Colors.slate900,
    borderColor: Colors.slate900,
  },
  sortChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate600,
  },
  sortChipTextActive: {
    color: Colors.white,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
  listHeaderTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.slate500,
  },
  clearFilters: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.primary,
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
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  thumbWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  itemCardImg: {
    width: 92,
    height: 108,
    borderRadius: 16,
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
  itemCardBody: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemCategory: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  itemName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.slate900,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  metaText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.slate500,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    minHeight: 40,
  },
  returnBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#047857',
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 40,
  },
  openHintText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate400,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emptyContainer: {
    paddingTop: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.slate800,
  },
  emptyText: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
