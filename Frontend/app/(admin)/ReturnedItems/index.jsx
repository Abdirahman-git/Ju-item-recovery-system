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
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import SuccessToast from '../../../src/components/SuccessToast';
import { getAllReturnedItems } from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

const TYPE_TABS = [
  { id: 'all', label: 'All', icon: 'albums-outline' },
  { id: 'found', label: 'Found', icon: 'checkmark-circle-outline' },
  { id: 'lost', label: 'Lost', icon: 'help-buoy-outline' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name', label: 'A–Z' },
  { id: 'recipient', label: 'Recipient' },
];

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSubmittedAt(item) {
  if (item.submitted_at) {
    const date = new Date(item.submitted_at);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }

  const datePart = item.date_reported ? formatDate(item.date_reported) : '';
  const timePart = item.time_reported ? String(item.time_reported).slice(0, 5) : '';
  if (datePart && datePart !== 'N/A' && timePart) return `${datePart} · ${timePart}`;
  if (datePart && datePart !== 'N/A') return datePart;

  const raw = String(item.imageURI || item.imageuri || '');
  const match = raw.match(/(?:^|\/)items\/(\d{12,14})_/i);
  if (match) {
    const inferred = new Date(Number(match[1]));
    if (!Number.isNaN(inferred.getTime()) && inferred.getFullYear() >= 2020) {
      return inferred.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }

  return 'Not recorded';
}

function daysBetween(start) {
  const date = new Date(start);
  if (!start || Number.isNaN(date.getTime())) return null;
  const diff = Math.max(0, Date.now() - date.getTime());
  return Math.max(1, Math.round(diff / 86_400_000));
}

function sortReturnedItems(list, sortBy) {
  const rows = [...list];
  if (sortBy === 'oldest') {
    return rows.sort(
      (a, b) => new Date(a.returned_at || 0).getTime() - new Date(b.returned_at || 0).getTime()
    );
  }
  if (sortBy === 'name') {
    return rows.sort((a, b) =>
      String(a.item_name || a.itemName || '').localeCompare(String(b.item_name || b.itemName || ''))
    );
  }
  if (sortBy === 'recipient') {
    return rows.sort((a, b) =>
      String(a.recipient_name || '').localeCompare(String(b.recipient_name || ''))
    );
  }
  return rows.sort(
    (a, b) => new Date(b.returned_at || 0).getTime() - new Date(a.returned_at || 0).getTime()
  );
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

export default function ReturnedItemsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toastRef = useRef(null);

  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getAllReturnedItems();
      setReturnedItems(data || []);
    } catch (error) {
      console.error('Error fetching returned items:', error);
      showAppFailure('Failed to retrieve returned archives.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  const lostCount = returnedItems.filter((i) => String(i.type).toUpperCase() === 'LOST').length;
  const foundCount = returnedItems.filter((i) => String(i.type).toUpperCase() === 'FOUND').length;

  const categories = useMemo(() => {
    const set = new Set();
    returnedItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['all', ...Array.from(set).sort()];
  }, [returnedItems]);

  const avgArchiveDays = useMemo(() => {
    if (!returnedItems.length) return 0;
    const total = returnedItems.reduce((sum, item) => sum + (daysBetween(item.returned_at) || 1), 0);
    return Math.round(total / returnedItems.length);
  }, [returnedItems]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const next = returnedItems.filter((item) => {
      const type = String(item.type || '').toUpperCase();
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'lost' && type === 'LOST') ||
        (activeTab === 'found' && type === 'FOUND');
      const matchesCategory = category === 'all' || item.category === category;
      const haystack = [
        item.item_name,
        item.itemName,
        item.category,
        item.location,
        item.recipient_name,
        item.recipient_student_id,
        item.original_reporter,
        item.reporter_email,
      ]
        .join(' ')
        .toLowerCase();

      return matchesTab && matchesCategory && (!query || haystack.includes(query));
    });

    return sortReturnedItems(next, sortBy);
  }, [returnedItems, activeTab, category, searchQuery, sortBy]);

  const tabCounts = {
    all: returnedItems.length,
    found: foundCount,
    lost: lostCount,
  };

  const activeFilterCount = (category !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  const openArchiveItem = (item) => {
    router.push({
      pathname: `/(admin)/item/${item.id}`,
      params: { data: JSON.stringify({ ...item, type: item.type, isArchive: true }) },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Archives"
        subtitle="Recovered item history"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <PressScale style={styles.refreshBtn} onPress={fetchItems}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primaryDark} />
          </PressScale>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.heroCard}>
          <LinearGradient
            colors={['#064E3B', '#047857', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEyebrow}>ARCHIVE LEDGER</Text>
            <Text style={styles.heroTitle}>Returned records</Text>
            <Text style={styles.heroSubtitle}>
              Track completed recoveries and verify who received each campus item.
            </Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaPill}>
                <Ionicons name="people-outline" size={14} color="#A7F3D0" />
                <Text style={styles.heroMetaText}>{returnedItems.length} reunited</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <Ionicons name="time-outline" size={14} color="#A7F3D0" />
                <Text style={styles.heroMetaText}>{avgArchiveDays}d avg</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.statsRow}>
          <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-done-outline" size={16} color="#047857" />
            </View>
            <Text style={[styles.statNum, { color: '#047857' }]}>{returnedItems.length}</Text>
            <Text style={styles.statLabel}>Total returned</Text>
            <Text style={styles.statSub}>
              {foundCount} found · {lostCount} lost
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="hourglass-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={[styles.statNum, { color: Colors.primaryDark }]}>
              {returnedItems.length ? `${avgArchiveDays}d` : '0d'}
            </Text>
            <Text style={styles.statLabel}>Avg. archive age</Text>
            <Text style={styles.statSub}>Since return date</Text>
          </Animated.View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search item, recipient, reporter..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChips}>
          {TYPE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <PressScale
                key={tab.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? Colors.white : Colors.slate500}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tab.label}</Text>
                <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                  {tabCounts[tab.id]}
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
                const active = category === cat;
                return (
                  <PressScale
                    key={cat}
                    style={[styles.softChip, active && styles.softChipActive]}
                    onPress={() => setCategory(cat)}
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
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                      {opt.label}
                    </Text>
                  </PressScale>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>
            {filteredItems.length} record{filteredItems.length === 1 ? '' : 's'}
          </Text>
          {(category !== 'all' || sortBy !== 'newest') && (
            <PressScale
              onPress={() => {
                setCategory('all');
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
            <Text style={styles.loadingText}>Loading returned archive...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const isLost = String(item.type).toUpperCase() === 'LOST';
            const imageUri = item.imageURI || item.imageuri;
            const categoryLabel = String(item.category || 'General');

            return (
              <Animated.View
                key={`returned-${item.id}`}
                entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(360)}
              >
                <PressScale style={styles.itemCard} onPress={() => openArchiveItem(item)}>
                  <View style={styles.thumbWrap}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.itemCardImg} />
                    ) : (
                      <View
                        style={[
                          styles.itemCardImg,
                          styles.placeholderImg,
                          {
                            backgroundColor: isLost ? Colors.lostBadge : Colors.foundBadge,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isLost ? 'help-buoy-outline' : 'checkmark-circle-outline'}
                          size={26}
                          color={isLost ? Colors.lostBadgeText : Colors.foundBadgeText}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemCardBody}>
                    <View style={styles.itemTopRow}>
                      <Text style={styles.itemCategory} numberOfLines={1} ellipsizeMode="tail">
                        {categoryLabel}
                      </Text>
                      <View style={styles.reunitedPill}>
                        <Ionicons name="heart" size={10} color="#047857" style={{ marginRight: 4 }} />
                        <Text style={styles.reunitedPillText}>Reunited</Text>
                      </View>
                    </View>

                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.item_name || item.itemName}
                    </Text>

                    <View style={styles.recipientCard}>
                      <Text style={styles.recipientLabel}>Returned to</Text>
                      <Text style={styles.recipientValue} numberOfLines={1}>
                        {item.recipient_name || 'N/A'}
                      </Text>
                      {item.recipient_student_id ? (
                        <Text style={styles.recipientId}>{item.recipient_student_id}</Text>
                      ) : null}
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.slate400} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {formatDate(item.returned_at)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={13} color={Colors.slate400} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        Submitted {formatSubmittedAt(item)}
                      </Text>
                    </View>

                    <View style={styles.openHint}>
                      <Text style={styles.openHintText}>View archive</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.slate400} />
                    </View>
                  </View>
                </PressScale>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="archive-outline" size={32} color="#047857" />
            </View>
            <Text style={styles.emptyTitle}>No archive matches</Text>
            <Text style={styles.emptyText}>Try another keyword or switch the type filter.</Text>
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
        shadowColor: '#064E3B',
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
    color: '#A7F3D0',
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
    color: 'rgba(236,253,245,0.92)',
    lineHeight: 20,
    maxWidth: 290,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroMetaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#ECFDF5',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
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
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate700,
  },
  statSub: {
    marginTop: 3,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.slate500,
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
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.white,
  },
  typeChips: {
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
    backgroundColor: '#047857',
    borderColor: '#047857',
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
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  softChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate600,
  },
  softChipTextActive: {
    color: '#047857',
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
    color: '#047857',
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
    height: 118,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
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
  reunitedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
  },
  reunitedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#047857',
    textTransform: 'uppercase',
  },
  itemName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.slate900,
    marginBottom: 8,
  },
  recipientCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  recipientLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipientValue: {
    marginTop: 2,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.slate800,
  },
  recipientId: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate500,
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
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
    minHeight: 28,
  },
  openHintText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate400,
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
    backgroundColor: '#ECFDF5',
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
