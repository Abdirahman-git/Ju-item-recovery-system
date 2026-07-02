import React, { useState, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import {
  getPendingItemClaims,
} from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

export default function OwnershipRequestsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectModal, setRejectModal] = useState({ visible: false, claim: null });
  const [rejectNote, setRejectNote] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getPendingItemClaims();
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
      showAppFailure(error?.message || 'Could not load requests.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const filtered = claims.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.claimer_name?.toLowerCase().includes(q) ||
      c.claimer_student_id?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.targetItem?.itemName?.toLowerCase().includes(q)
    );
  });

  const openDetails = (claim) => {
    router.push({
      pathname: '/(admin)/MatchClaims/detail/[id]',
      params: { id: String(claim.id) },
    });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const lostCount = claims.filter((c) => c.itemType === 'lost' || c.targetItem?.type === 'LOST').length;
  const foundCount = claims.length - lostCount;

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Ownership Requests"
        subtitle="Claim review"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={21} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.heroWrap}>
        <AdminPageHero
          eyebrow="Student claims"
          title="This is mine"
          subtitle="Approve when the claimant is the rightful owner. The item will be archived as returned."
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statChip, styles.statPending]}>
          <Text style={styles.statNum}>{claims.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statChip, styles.statLost]}>
          <Text style={styles.statNum}>{lostCount}</Text>
          <Text style={styles.statLabel}>Lost reports</Text>
        </View>
        <View style={[styles.statChip, styles.statFound]}>
          <Text style={styles.statNum}>{foundCount}</Text>
          <Text style={styles.statLabel}>Found reports</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.slate400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search student or item..."
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="clipboard-outline" size={56} color={Colors.slate300} />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySub}>When a student taps “This is mine”, it appears here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map((claim) => {
            const item = claim.targetItem;
            const isLost = claim.itemType === 'lost' || item?.type === 'LOST';
            return (
              <TouchableOpacity
                key={String(claim.id)}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => openDetails(claim)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.typePillWrap, isLost ? styles.typePillLost : styles.typePillFound]}>
                    <Text style={[styles.typePillText, isLost ? styles.typePillTextLost : styles.typePillTextFound]}>
                      {isLost ? 'LOST REPORT' : 'FOUND REPORT'}
                    </Text>
                  </View>
                  <View style={styles.cardTopRight}>
                    <Text style={styles.timeText}>{formatDate(claim.created_at)}</Text>
                    <View style={styles.infoBtn}>
                      <Ionicons name="open-outline" size={16} color={Colors.primary} />
                      <Text style={styles.infoBtnText}>Open</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.claimantBox}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{getInitials(claim.claimer_name)}</Text>
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.claimantName}>{claim.claimer_name}</Text>
                    <Text style={styles.claimantMeta}>
                      {claim.claimer_student_id || 'No ID'}
                    </Text>
                  </View>
                </View>

                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Claim reason</Text>
                  <Text style={styles.descText}>{claim.description || 'No description provided.'}</Text>
                </View>

                {item ? (
                  <View style={styles.itemBox}>
                    <Text style={styles.itemBoxTitle}>Linked item</Text>
                    <View style={styles.itemRow}>
                    {item.imageURI ? (
                      <Image source={{ uri: item.imageURI }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPh]}>
                        <Ionicons name="cube-outline" size={22} color={Colors.slate400} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>{item.location}</Text>
                    </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.openHintRow}>
                  <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
                  <Text style={styles.openHintText}>Tap anywhere on this report to view full details</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.slate50 },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: { paddingHorizontal: 20, paddingTop: 8 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statPending: {
    backgroundColor: '#EEF2FF',
    borderColor: '#DBEAFE',
  },
  statLost: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statFound: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.slate900,
    lineHeight: 22,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#0F172A' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  emptySub: { marginTop: 8, fontSize: 14, color: '#64748B', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTopRight: {
    alignItems: 'flex-end',
  },
  typePillWrap: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  typePillLost: {
    backgroundColor: '#FEF2F2',
  },
  typePillFound: {
    backgroundColor: '#ECFDF5',
  },
  typePillText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.7,
  },
  typePillTextLost: {
    color: Colors.error,
  },
  typePillTextFound: {
    color: Colors.success,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate400,
  },
  infoBtn: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoBtnText: {
    marginLeft: 4,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
  },
  claimantBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.primary,
  },
  claimantName: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#0F172A' },
  claimantMeta: { fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: 'Inter_500Medium' },
  reasonBox: {
    backgroundColor: Colors.slate50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  descText: { fontSize: 14, color: '#334155', lineHeight: 20, fontFamily: 'Inter_400Regular' },
  itemBox: {
    borderWidth: 1,
    borderColor: Colors.slate100,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    backgroundColor: '#FFF',
  },
  itemBoxTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPh: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  itemMeta: { fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: 'Inter_400Regular' },
  openHintRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openHintText: {
    marginLeft: 6,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.primary,
  },
});
