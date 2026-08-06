import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect, useNavigation, DrawerActions } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import { fetchDraftInventoryItems, deleteDraftInventoryItem } from '../../../src/services/supabase';
import { isSecureFoundItem, isSecureListing } from '../../../src/utils/itemStatus';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'lost', label: 'Lost' },
  { id: 'found', label: 'Found' },
  { id: 'secure', label: 'Secure' },
];

function isSecureDraft(draft) {
  return draft?.itemType === 'found' && isSecureListing(draft);
}

function isPublicFoundDraft(draft) {
  return draft?.itemType === 'found' && !isSecureListing(draft);
}

function draftBadge(draft) {
  if (isSecureDraft(draft)) return { label: 'Secure Draft', bg: '#FEF3C7', color: '#B45309' };
  if (draft.itemType === 'found') return { label: 'Found Draft', bg: '#D1FAE5', color: '#047857' };
  return { label: 'Lost Draft', bg: '#FEE2E2', color: '#B91C1C' };
}

function draftDescription(draft) {
  const raw = String(draft.public_notice || draft.description || '').trim();
  if (!raw) return 'No description added yet.';
  return raw.length > 110 ? `${raw.slice(0, 107).trim()}...` : raw;
}

function draftDate(draft) {
  const value = draft.itemType === 'found' ? draft.dateFound : draft.dateLost;
  if (!value) return 'Date not added';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not added';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DraftsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toastRef = useRef(null);

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const data = await fetchDraftInventoryItems();
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      showAppFailure(error?.message || 'Failed to load drafts.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [])
  );

  const counts = useMemo(
    () => ({
      all: drafts.length,
      lost: drafts.filter((d) => d.itemType === 'lost').length,
      found: drafts.filter(isPublicFoundDraft).length,
      secure: drafts.filter(isSecureDraft).length,
    }),
    [drafts]
  );

  const filteredDrafts = useMemo(() => {
    const tabFiltered = drafts.filter((draft) => {
      if (activeTab === 'lost') return draft.itemType === 'lost';
      if (activeTab === 'found') return isPublicFoundDraft(draft);
      if (activeTab === 'secure') return isSecureDraft(draft);
      return true;
    });

    const query = searchQuery.trim().toLowerCase();
    if (!query) return tabFiltered;

    return tabFiltered.filter((draft) =>
      [draft.itemName, draft.category, draft.location, draft.description, draft.public_notice]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [drafts, activeTab, searchQuery]);

  const handleContinue = (draft) => {
    if (isSecureDraft(draft)) {
      router.push({ pathname: '/(admin)/SecureFound', params: { draftId: String(draft.id) } });
    } else if (draft.itemType === 'found') {
      router.push({ pathname: '/(admin)/Found', params: { draftId: String(draft.id) } });
    } else {
      router.push({ pathname: '/(admin)/Lost', params: { draftId: String(draft.id) } });
    }
  };

  const handleDelete = (draft) => {
    showAppConfirm({
      title: 'Delete draft?',
      message: `"${draft.itemName || 'This draft'}" will be permanently removed.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          setDeletingId(draft.id);
          await deleteDraftInventoryItem(draft);
          setDrafts((prev) => prev.filter((d) => !(d.id === draft.id && d.itemType === draft.itemType)));
          toastRef.current?.show('Draft deleted', 'The draft has been removed.');
        } catch (error) {
          showAppFailure(error?.message || 'Could not delete this draft.', 'Delete failed');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Draft Items"
        subtitle="Unpublished reports"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchDrafts}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Work in progress"
          title="Continue where you left off"
          subtitle="Drafts from Report Lost, Report Found, or Secure Found appear here before they are published."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <Text style={styles.statNum}>{counts.all}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Text style={[styles.statNum, { color: '#B91C1C' }]}>{counts.lost}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
            <Text style={[styles.statNum, { color: '#047857' }]}>{counts.found}</Text>
            <Text style={styles.statLabel}>Found</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Text style={[styles.statNum, { color: '#B45309' }]}>{counts.secure}</Text>
            <Text style={styles.statLabel}>Secure</Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search draft items..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label} ({counts[tab.id]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading drafts...</Text>
          </View>
        ) : filteredDrafts.length > 0 ? (
          filteredDrafts.map((draft) => {
            const badge = draftBadge(draft);
            const secure = isSecureDraft(draft);
            return (
              <View key={`${draft.itemType}-${draft.id}`} style={styles.card}>
                <View style={styles.cardImageWrap}>
                  {secure ? (
                    <View style={[styles.cardImage, styles.secureImagePlaceholder]}>
                      <Text style={styles.secureMark}>!</Text>
                    </View>
                  ) : draft.imageURI ? (
                    <Image source={{ uri: draft.imageURI }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, styles.placeholderImage]}>
                      <MaterialCommunityIcons name="cube-outline" size={30} color={Colors.slate400} />
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgePillText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Text style={styles.refText}>#{draft.id}</Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {draft.itemName || 'Untitled draft'}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {draftDescription(draft)}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color={Colors.slate400} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {draft.location || draft.security_location || 'Location not added'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.slate400} />
                    <Text style={styles.metaText}>{draftDate(draft)}</Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{draft.category || 'General'}</Text>
                    </View>
                    <View style={styles.footerActions}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(draft)}
                        disabled={deletingId === draft.id}
                      >
                        {deletingId === draft.id ? (
                          <ActivityIndicator size="small" color={Colors.error} />
                        ) : (
                          <Ionicons name="trash-outline" size={16} color={Colors.error} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.continueBtn} onPress={() => handleContinue(draft)}>
                        <Text style={styles.continueBtnText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No draft items found</Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'Try another search term or switch tabs.' : 'Save a draft from Lost, Found, or Secure Found to see it here.'}
            </Text>
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
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.slate500 },
  tabTextActive: { color: Colors.primaryDark },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: 'Inter_500Medium', color: Colors.slate500 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  cardImageWrap: { width: 84, height: 'auto' },
  cardImage: { width: 84, height: 108, borderRadius: 14, backgroundColor: Colors.slate100 },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  secureImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
  },
  secureMark: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    color: '#B45309',
  },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgePillText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },
  refText: { fontFamily: 'Inter_500Medium', fontSize: 10, color: Colors.slate400 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: Colors.slate900 },
  cardDesc: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.slate500, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  metaText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.slate500, flexShrink: 1 },
  cardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    backgroundColor: Colors.slate50,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  categoryChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.slate600 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  continueBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: Colors.white },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.slate700 },
  emptyText: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
