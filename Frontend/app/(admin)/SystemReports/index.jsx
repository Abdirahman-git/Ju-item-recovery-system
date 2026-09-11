import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import { fetchSystemReportsSummary } from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

function StatCard({ icon, label, value, bg, color }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SystemReportsScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await fetchSystemReportsSummary();
      setSummary(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching system reports summary:', error);
      showAppFailure(error?.message || 'Failed to load system reports.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [])
  );

  const formattedUpdatedAt = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '—';

  const claimsTotal = summary?.claimsTotal ?? 0;
  const claimsPending = summary?.claimsPending ?? 0;
  const claimsApproved = summary?.claimsApproved ?? 0;
  const claimsRejected = summary?.claimsRejected ?? 0;
  const approvedPct = claimsTotal ? Math.round((claimsApproved / claimsTotal) * 100) : 0;

  return (
    <View style={styles.container}>
      <AdminHeader
        title="System Reports"
        subtitle="Platform-wide summary"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchSummary}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Reports"
          title="System-wide snapshot"
          subtitle="A quick overview of users, reports, and claim outcomes across the platform."
        />

        <View style={styles.updatedRow}>
          <Ionicons name="time-outline" size={13} color={Colors.slate400} />
          <Text style={styles.updatedText}>Last updated {formattedUpdatedAt}</Text>
        </View>

        {loading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading system reports...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard icon="people-outline" label="Users" value={summary?.users ?? 0} bg="#EEF2FF" color="#4338CA" />
              <StatCard icon="help-buoy-outline" label="Lost" value={summary?.lost ?? 0} bg="#FEF2F2" color={Colors.error} />
              <StatCard icon="checkmark-circle-outline" label="Lost" value={(summary?.found ?? 0) + (summary?.lost ?? 0)} bg="#FEF2F2" color={Colors.error} />
              <StatCard icon="archive-outline" label="Returned" value={summary?.returned ?? 0} bg="#EFF6FF" color={Colors.primary} />
            </View>

            <View style={styles.claimsCard}>
              <View style={styles.claimsHeader}>
                <View>
                  <Text style={styles.claimsTitle}>Ownership claims</Text>
                  <Text style={styles.claimsSubtitle}>{claimsTotal} total requests submitted</Text>
                </View>
                <View style={styles.claimsBadge}>
                  <Text style={styles.claimsBadgeText}>{approvedPct}% approved</Text>
                </View>
              </View>

              <View style={styles.claimsRow}>
                <View style={[styles.claimChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Text style={[styles.claimChipNum, { color: '#B45309' }]}>{claimsPending}</Text>
                  <Text style={styles.claimChipLabel}>Pending</Text>
                </View>
                <View style={[styles.claimChip, { backgroundColor: '#DCFCE7', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.claimChipNum, { color: '#15803D' }]}>{claimsApproved}</Text>
                  <Text style={styles.claimChipLabel}>Approved</Text>
                </View>
                <View style={[styles.claimChip, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.claimChipNum, { color: '#DC2626' }]}>{claimsRejected}</Text>
                  <Text style={styles.claimChipLabel}>Rejected</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${claimsTotal ? (claimsApproved / claimsTotal) * 100 : 0}%`, backgroundColor: Colors.success },
                  ]}
                />
                <View
                  style={[
                    styles.progressFill,
                    { width: `${claimsTotal ? (claimsPending / claimsTotal) * 100 : 0}%`, backgroundColor: Colors.warning },
                  ]}
                />
                <View
                  style={[
                    styles.progressFill,
                    { width: `${claimsTotal ? (claimsRejected / claimsTotal) * 100 : 0}%`, backgroundColor: Colors.error },
                  ]}
                />
              </View>
            </View>

            <View style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.slate400} />
              <Text style={styles.footerNoteText}>
                Figures reflect current database counts. Tap refresh to fetch the latest numbers.
              </Text>
            </View>
          </>
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
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  updatedText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.slate400 },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: 'Inter_500Medium', color: Colors.slate500 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  statCard: {
    width: '47.5%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: Colors.slate900 },
  statLabel: { marginTop: 2, fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.slate600 },
  claimsCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.slate100,
    marginBottom: 16,
  },
  claimsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  claimsTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.slate900 },
  claimsSubtitle: { marginTop: 2, fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.slate500 },
  claimsBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  claimsBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.primaryDark },
  claimsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  claimChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  claimChipNum: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  claimChipLabel: { marginTop: 2, fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.slate600 },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.slate100,
  },
  progressFill: { height: '100%' },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  footerNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.slate500, lineHeight: 17 },
});
