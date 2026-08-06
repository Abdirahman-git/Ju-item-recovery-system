import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllLostItems, getAllFoundItems } from '../../../src/services/supabase';
import { Colors } from '../../../src/constants/colors';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import FeedItemCard from '../../../src/components/FeedItemCard';
import CategoryPills from '../../../src/components/CategoryPills';
import { useDynamicCategories } from '../../../src/hooks/useDynamicCategories';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const PRIMARY = '#1A56DB';
const LOST_BLUE = '#3B82F6';
const FOUND_GREEN = '#10B981';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All', icon: 'view-grid-outline', color: PRIMARY },
  { id: 'LOST', label: 'Lost', icon: 'magnify', color: LOST_BLUE },
  { id: 'FOUND', label: 'Found', icon: 'cube-outline', color: FOUND_GREEN },
];

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function AllItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { categoryEntries, loading: categoriesLoading } = useDynamicCategories(items);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const [lost, found] = await Promise.all([getAllLostItems(), getAllFoundItems()]);
      const combined = [
        ...lost.map((i) => ({ ...i, type: 'LOST', timeAgo: formatTimeAgo(i.created_at) })),
        ...found.map((i) => ({ ...i, type: 'FOUND', timeAgo: formatTimeAgo(i.created_at) })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setItems(combined);
    } catch (error) {
      console.error('Error fetching all items:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  const filtered = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (item.itemName || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || item.type === statusFilter;

    const itemCategory = String(item.category || item.public_category || '').trim().toLowerCase();
    const matchesCategory =
      categoryFilter === 'all' ||
      itemCategory === String(categoryFilter).trim().toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>All Items</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.filtersBlock}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.statusPill,
                  { borderColor: `${opt.color}33` },
                  active && { backgroundColor: opt.color, borderColor: opt.color },
                ]}
                onPress={() => setStatusFilter(opt.id)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={16}
                  color={active ? '#FFF' : opt.color}
                />
                <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.filterLabel}>Category</Text>
        <CategoryPills
          entries={categoryEntries}
          selectedCategory={categoryFilter}
          onSelect={setCategoryFilter}
          accentColor={PRIMARY}
          loading={categoriesLoading}
          allowCustom={false}
          showAllOption
          allLabel="All"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.countText}>
          {loading
            ? 'Loading...'
            : `${filtered.length} item${filtered.length === 1 ? '' : 's'}${
                statusFilter !== 'all' || categoryFilter !== 'all' ? ' (filtered)' : ''
              }`}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length > 0 ? (
          filtered.map((item, index) => (
            <FeedItemCard
              key={`${item.type}-${item.id}-${index}`}
              item={item}
              onPress={() =>
                router.push({
                  pathname: `/(user)/item/${item.id}`,
                  params: { data: JSON.stringify(item) },
                })
              }
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No items match these filters.</Text>
        )}
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
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 22, height: 22 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E40AF' },
  filtersBlock: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#0F172A' },
  filterLabel: {
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 2,
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusRow: { gap: 8, paddingRight: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: '#FFF',
  },
  statusPillText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  statusPillTextActive: { color: '#FFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120, gap: 14 },
  countText: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontWeight: '600' },
});
