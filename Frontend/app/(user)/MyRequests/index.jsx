import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import { getUserItemClaims } from '../../../src/services/supabase';
import {
  CLAIM_STATUS,
  getClaimStatusBadgeConfig,
  normalizeClaimStatus,
} from '../../../src/utils/claimStatus';
import { OWNERSHIP_OFFICE_VISIT, challengeResultLabel } from '../../../src/utils/ownershipChallenge';
import { showAppError } from '../../../src/utils/appAlert';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const SLATE_900 = '#0F172A';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const PRIMARY = '#1A56DB';
const LOST_BLUE = '#3B82F6';
const FOUND_GREEN = '#10B981';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: CLAIM_STATUS.PENDING, label: 'Pending' },
  { key: CLAIM_STATUS.PHYSICAL, label: 'Visit office' },
  { key: CLAIM_STATUS.APPROVED, label: 'Approved' },
  { key: CLAIM_STATUS.REJECTED, label: 'Rejected' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ClaimCard({ claim, index, onPress }) {
  const item = claim.targetItem || {};
  const status = normalizeClaimStatus(claim);
  const badge = getClaimStatusBadgeConfig(status);
  const isLost = item.type === 'LOST' || claim.itemType === 'lost';
  const typeColor = LOST_BLUE;
  const typeLabel = 'LOST';
  const canOpenItem = item.id && !item.archived && status !== CLAIM_STATUS.REJECTED;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={canOpenItem ? 0.92 : 1}
        onPress={() => onPress(claim, canOpenItem)}
      >
        <View style={styles.cardTop}>
          <View style={styles.thumbWrap}>
            {item.imageURI ? (
              <Image source={{ uri: item.imageURI }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbPlaceholder, { backgroundColor: typeColor + '12' }]}>
                <MaterialCommunityIcons
                  name={isLost ? 'magnify' : 'hand-heart-outline'}
                  size={28}
                  color={typeColor}
                />
              </View>
            )}
            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
              <Text style={styles.typePillText}>{typeLabel}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.itemName || 'Requested item'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Ionicons name={badge.icon} size={12} color={badge.color} />
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>

            {item.category ? (
              <View style={styles.categoryRow}>
                <MaterialCommunityIcons name="tag-outline" size={13} color={SLATE_400} />
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}

            <Text style={styles.reasonText} numberOfLines={2}>
              "{claim.description}"
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="paper-plane-outline" size={14} color={SLATE_400} />
            <Text style={styles.metaText}>Sent {formatDate(claim.created_at)}</Text>
          </View>
          {claim.reviewed_at ? (
            <View style={styles.metaItem}>
              <Ionicons name="checkmark-done-outline" size={14} color={SLATE_400} />
              <Text style={styles.metaText}>Reviewed {formatDateTime(claim.reviewed_at)}</Text>
            </View>
          ) : null}
        </View>

        {status === CLAIM_STATUS.APPROVED && (
          <View style={styles.noteBoxApproved}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.noteTextApproved}>
              {claim.challenge_score != null && claim.challenge_score > 0
                ? `Challenge ${claim.challenge_score}% · ${challengeResultLabel('auto_pass')}`
                : `Your ownership was confirmed. Please ${OWNERSHIP_OFFICE_VISIT}.`}
            </Text>
          </View>
        )}

        {status === CLAIM_STATUS.PHYSICAL && (
          <View style={styles.noteBoxPhysical}>
            <Ionicons name="business" size={16} color="#4338CA" />
            <Text style={styles.noteTextPhysical}>
              {claim.challenge_score != null
                ? `Challenge ${claim.challenge_score}% · ${challengeResultLabel('physical')}`
                : `Please ${OWNERSHIP_OFFICE_VISIT} for physical verification.`}
            </Text>
          </View>
        )}

        {status === CLAIM_STATUS.REJECTED && (
          <View style={styles.noteBoxRejected}>
            <Ionicons name="information-circle" size={16} color="#DC2626" />
            <Text style={styles.noteTextRejected}>
              {claim.admin_note ||
                (claim.challenge_score != null
                  ? `Challenge score ${claim.challenge_score}%. Ownership was not matched.`
                  : 'Ownership request was rejected.')}
            </Text>
          </View>
        )}

        {status === CLAIM_STATUS.PENDING && (
          <View style={styles.noteBoxPending}>
            <Ionicons name="hourglass-outline" size={16} color="#B45309" />
            <Text style={styles.noteTextPending}>Admin is reviewing your ownership request.</Text>
          </View>
        )}

        {canOpenItem && (
          <View style={styles.openHint}>
            <Text style={styles.openHintText}>Tap to view item</Text>
            <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MyRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      if (!sessionData) {
        setClaims([]);
        return;
      }
      const user = JSON.parse(sessionData);
      const data = await getUserItemClaims(user.email);
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching claims:', error.message);
      showAppError('Load failed', 'Could not load your ownership requests.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClaims();
    }, [])
  );

  const counts = {
    all: claims.length,
    pending: claims.filter((c) => normalizeClaimStatus(c) === CLAIM_STATUS.PENDING).length,
    approved: claims.filter((c) => normalizeClaimStatus(c) === CLAIM_STATUS.APPROVED).length,
    rejected: claims.filter((c) => normalizeClaimStatus(c) === CLAIM_STATUS.REJECTED).length,
  };

  const filteredClaims =
    activeFilter === 'all'
      ? claims
      : claims.filter((c) => normalizeClaimStatus(c) === activeFilter);

  const handleClaimPress = (claim, canOpen) => {
    if (!canOpen || !claim.targetItem) return;
    router.push({
      pathname: `/(user)/item/${claim.targetItem.id}`,
      params: { data: JSON.stringify(claim.targetItem) },
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
          <Text style={styles.headerBrandText}>Jazeera University</Text>
        </View>
        <TouchableOpacity onPress={fetchClaims} style={styles.headerIconBtn}>
          <Ionicons name="refresh-outline" size={22} color={SLATE_600} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.eyebrow}>OWNERSHIP TRACKER</Text>
          <Text style={styles.pageTitle}>My Requests</Text>
          <Text style={styles.pageSubtitle}>
            Track every "This is mine" request — pending, approved, or rejected by admin.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statPending]}>
            <Text style={styles.statNumber}>{counts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, styles.statApproved]}>
            <Text style={styles.statNumber}>{counts.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={[styles.statCard, styles.statRejected]}>
            <Text style={styles.statNumber}>{counts.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.key;
            const count = counts[tab.key] ?? counts.all;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {tab.key === 'all' ? counts.all : count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color={SLATE_400} style={{ marginTop: 48 }} />
        ) : filteredClaims.length > 0 ? (
          <View style={styles.list}>
            {filteredClaims.map((claim, index) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                index={index}
                onPress={handleClaimPress}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={SLATE_400} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'No requests yet' : `No ${activeFilter} requests`}
            </Text>
            <Text style={styles.emptySubtitle}>
              When you tap "This is mine" on a found or lost item, your ownership requests will appear here.
            </Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(user)/DashBoard')}>
              <Ionicons name="compass-outline" size={18} color="#FFF" />
              <Text style={styles.browseBtnText}>Browse Items</Text>
            </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerLogoSmall: { width: 28, height: 28, marginRight: 8 },
  headerBrandText: { fontSize: 15, fontWeight: '800', color: SLATE_900 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  heroSection: { marginBottom: 22 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  pageTitle: { fontSize: 32, fontWeight: '900', color: SLATE_900, marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: SLATE_500, lineHeight: 21 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  statPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statApproved: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statNumber: { fontSize: 24, fontWeight: '900', color: SLATE_900 },
  statLabel: { fontSize: 11, fontWeight: '700', color: SLATE_500, marginTop: 4 },
  filterRow: { gap: 10, paddingBottom: 4, marginBottom: 20 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 13, fontWeight: '700', color: SLATE_600 },
  filterChipTextActive: { color: '#FFF' },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 11, fontWeight: '800', color: SLATE_500 },
  filterCountTextActive: { color: '#FFF' },
  list: { gap: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  cardTop: { flexDirection: 'row', gap: 14 },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  typePill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: { fontSize: 8, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  cardBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  itemTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: SLATE_900, lineHeight: 22 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  categoryText: { fontSize: 11, fontWeight: '700', color: SLATE_400, textTransform: 'uppercase' },
  reasonText: { fontSize: 13, color: SLATE_500, lineHeight: 18, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, fontWeight: '600', color: SLATE_400 },
  noteBoxApproved: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  noteTextApproved: { flex: 1, fontSize: 12, fontWeight: '600', color: '#15803D', lineHeight: 17 },
  noteBoxRejected: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noteTextRejected: { flex: 1, fontSize: 12, fontWeight: '600', color: '#DC2626', lineHeight: 17 },
  noteBoxPending: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteTextPending: { flex: 1, fontSize: 12, fontWeight: '600', color: '#B45309', lineHeight: 17 },
  noteBoxPhysical: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  noteTextPhysical: { flex: 1, fontSize: 12, fontWeight: '600', color: '#4338CA', lineHeight: 17 },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
  },
  openHintText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: SLATE_900, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: SLATE_500, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
  },
  browseBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});
