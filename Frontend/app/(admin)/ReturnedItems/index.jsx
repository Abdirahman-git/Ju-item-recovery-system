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
import { useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import { getAllReturnedItems } from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

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

export default function ReturnedItemsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toastRef = useRef(null);

  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | lost | found
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

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

  const openArchiveItem = (item) => {
    router.push({
      pathname: `/(admin)/item/${item.id}`,
      params: { data: JSON.stringify({ ...item, type: item.type, isArchive: true }) },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Returned Archives"
        subtitle="Recovered item history"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchItems}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Archive Ledger"
          title="Returned records"
          subtitle="Track completed recoveries and verify who received each item."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNum}>{returnedItems.length}</Text>
            <Text style={styles.statLabel}>Total returned</Text>
            <Text style={styles.statSub}>
              {foundCount} found · {lostCount} lost
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardArchive]}>
            <Text style={styles.statNum}>{returnedItems.length ? `${avgArchiveDays}d` : '0d'}</Text>
            <Text style={styles.statLabel}>Avg. archive age</Text>
            <Text style={styles.statSub}>Since return date</Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search item, recipient or reporter..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({returnedItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'found' && styles.tabBtnActive]}
            onPress={() => setActiveTab('found')}
          >
            <Text style={[styles.tabText, activeTab === 'found' && styles.tabTextActive]}>
              Found ({foundCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'lost' && styles.tabBtnActive]}
            onPress={() => setActiveTab('lost')}
          >
            <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>
              Lost ({lostCount})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
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
            <Text style={styles.loadingText}>Loading returned archive...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isLost = String(item.type).toUpperCase() === 'LOST';
            return (
              <TouchableOpacity
                key={`returned-${item.id}`}
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() => openArchiveItem(item)}
              >
                {item.imageURI || item.imageuri ? (
                  <Image source={{ uri: item.imageURI || item.imageuri }} style={styles.itemCardImg} />
                ) : (
                  <View
                    style={[
                      styles.itemCardImgPlaceholder,
                      { backgroundColor: isLost ? Colors.primaryLight : Colors.foundBadge },
                    ]}
                  >
                    <Ionicons
                      name={isLost ? 'help-buoy-outline' : 'checkmark-circle-outline'}
                      size={28}
                      color={isLost ? Colors.primary : Colors.success}
                    />
                  </View>
                )}

                <View style={styles.itemCardInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
                    <View style={styles.reunitedPill}>
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

                  <View style={styles.metaColumn}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.slate500} />{' '}
                      {formatDate(item.returned_at)}
                    </Text>
                    <Text style={styles.submittedMeta} numberOfLines={1}>
                      Submitted {formatSubmittedAt(item)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={56} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No archive matches</Text>
            <Text style={styles.emptyText}>Try another keyword or switch the tab filter.</Text>
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
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  statCardArchive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.primaryDark,
    lineHeight: 23,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
  },
  statSub: {
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.slate500,
    textAlign: 'center',
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate900,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate500,
  },
  tabTextActive: {
    color: Colors.primaryDark,
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
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  itemCardImg: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: Colors.slate100,
  },
  itemCardImgPlaceholder: {
    width: 78,
    height: 78,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  itemCategory: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate500,
    textTransform: 'uppercase',
  },
  reunitedPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reunitedPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.success,
    textTransform: 'uppercase',
  },
  itemName: {
    marginTop: 4,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: Colors.slate900,
  },
  recipientCard: {
    marginTop: 8,
    backgroundColor: Colors.slate50,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recipientLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.slate400,
    textTransform: 'uppercase',
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
  metaColumn: {
    marginTop: 8,
    gap: 2,
  },
  metaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.slate600,
  },
  submittedMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate400,
  },
  emptyContainer: {
    paddingVertical: 60,
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
