import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  getAllUsers,
  getAllLostItems,
  getAllFoundItems,
  getPendingLostItems,
  getPendingFoundItems,
  getPendingItemClaimCount,
  getAllReturnedItems,
} from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

const { width } = Dimensions.get('window');
const CARD_W = (width - 52) / 2;

export default function AdminDashboardOverview() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);

  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [returnedItems, setReturnedItems] = useState([]);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  const fetchData = async () => {
    try {
      setLoading(true);

      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setAdminName(session.userName || 'Admin');
      }

      const [allUsers, allLost, allFound, allReturned, pendingLost, pendingFound, claims] = await Promise.all([
        getAllUsers(),
        getAllLostItems(),
        getAllFoundItems(),
        getAllReturnedItems(),
        getPendingLostItems(),
        getPendingFoundItems(),
        getPendingItemClaimCount(),
      ]);

      setLostItems(allLost || []);
      setFoundItems(allFound || []);
      setReturnedItems(allReturned || []);
      setStudentCount((allUsers || []).filter((u) => u.role === 'user').length);
      setPendingReportsCount((pendingLost?.length || 0) + (pendingFound?.length || 0));
      setClaimsCount(claims || 0);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      showAppFailure('Failed to retrieve dashboard data.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const totalItems = lostItems.length + foundItems.length + returnedItems.length;
  const recoveryRate = totalItems ? Math.round((returnedItems.length / totalItems) * 100) : 0;

  const stats = [
    {
      label: 'Total Items',
      value: totalItems,
      sub: 'Lost + found + returned',
      icon: 'cube-outline',
      color: Colors.primary,
      bg: Colors.primaryLight,
      onPress: () => router.push('/(admin)/AllItems'),
    },
    {
      label: 'Pending Reports',
      value: pendingReportsCount,
      sub: 'Needs review',
      icon: 'hourglass-outline',
      color: Colors.warning,
      bg: '#FEF3C7',
      onPress: () => router.push('/(admin)/PendingReports'),
    },
    {
      label: 'Successful Recoveries',
      value: returnedItems.length,
      sub: `${recoveryRate}% recovery rate`,
      icon: 'checkmark-done-outline',
      color: Colors.success,
      bg: '#ECFDF5',
      onPress: () => router.push('/(admin)/ReturnedItems'),
    },
    {
      label: 'Active users',
      value: studentCount,
      sub: 'Registered users',
      icon: 'people-outline',
      color: '#7C3AED',
      bg: '#EDE9FE',
      onPress: () => router.push('/(admin)/AllUsers'),
    },
  ];

  const pulseBars = [
    {
      label: 'Total',
      value: totalItems,
      color: Colors.primary,
      track: Colors.primaryLight,
      onPress: () => router.push('/(admin)/AllItems'),
    },
    {
      label: 'Pending',
      value: pendingReportsCount,
      color: Colors.warning,
      track: '#FEF3C7',
      onPress: () => router.push('/(admin)/PendingReports'),
    },
    {
      label: 'Claims',
      value: claimsCount,
      color: '#7C3AED',
      track: '#EDE9FE',
      onPress: () => router.push('/(admin)/MatchClaims'),
    },
    {
      label: 'Returned',
      value: returnedItems.length,
      color: Colors.success,
      track: '#ECFDF5',
      onPress: () => router.push('/(admin)/ReturnedItems'),
    },
    {
      label: 'Users',
      value: studentCount,
      color: '#0F172A',
      track: '#E2E8F0',
      onPress: () => router.push('/(admin)/AllUsers'),
    },
  ];

  const pulseMax = Math.max(...pulseBars.map((b) => b.value), 1);

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Admin Console"
        subtitle="Lost & Found Control"
        onMenuPress={openDrawer}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[Colors.admin.heroStart, '#1E40AF', Colors.admin.heroEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#BFDBFE" />
                <Text style={styles.welcomeBadgeText}>Administrator</Text>
              </View>
              <Text style={styles.welcomeGreeting}>Good to see you,</Text>
              <Text style={styles.welcomeName}>{adminName}</Text>
              <Text style={styles.welcomeHint}>
                {pendingReportsCount + claimsCount > 0
                  ? `${pendingReportsCount + claimsCount} action(s) waiting for you`
                  : 'All caught up — campus feed is healthy'}
              </Text>
            </View>
            <View style={styles.welcomeOrb}>
              <Ionicons name="pulse" size={64} color="rgba(255,255,255,0.12)" />
            </View>
          </LinearGradient>

          <Text style={styles.sectionHeader}>Overview</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <TouchableOpacity
                key={stat.label}
                style={styles.statCard}
                onPress={stat.onPress}
                activeOpacity={0.85}
              >
                <View style={[styles.statIconBg, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={styles.statNumber}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statSubtext}>{stat.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeader}>Live Pulse</Text>

          <View style={styles.pulseCard}>
            <View style={styles.pulseCardHead}>
              <View>
                <Text style={styles.pulseTitle}>Campus metrics</Text>
                <Text style={styles.pulseSub}>Tap a bar to open that section</Text>
              </View>
              <View style={styles.pulseTotal}>
                <Text style={styles.pulseTotalNum}>
                  {pendingReportsCount + claimsCount + lostItems.length + foundItems.length}
                </Text>
                <Text style={styles.pulseTotalLabel}>Items</Text>
              </View>
            </View>

            <View style={styles.columnChart}>
              {pulseBars.map((bar) => {
                const heightPct = pulseMax > 0 ? (bar.value / pulseMax) * 100 : 0;
                const barHeight = Math.max((heightPct / 100) * 120, bar.value > 0 ? 12 : 4);
                return (
                  <TouchableOpacity
                    key={bar.label}
                    style={styles.columnWrap}
                    onPress={bar.onPress}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.columnValue}>{bar.value}</Text>
                    <View style={[styles.columnTrack, { backgroundColor: bar.track }]}>
                      <View
                        style={[
                          styles.columnFill,
                          { height: barHeight, backgroundColor: bar.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.columnLabel}>{bar.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.pulseLegend}>
              {pulseBars.map((bar) => (
                <View key={`legend-${bar.label}`} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: bar.color }]} />
                  <Text style={styles.legendText}>{bar.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
    marginTop: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    overflow: 'hidden',
    minHeight: 140,
  },
  welcomeContent: {
    zIndex: 2,
    maxWidth: '78%',
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  welcomeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#BFDBFE',
    letterSpacing: 0.5,
  },
  welcomeGreeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  welcomeName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: Colors.white,
    marginTop: 2,
  },
  welcomeHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    lineHeight: 18,
  },
  welcomeOrb: {
    position: 'absolute',
    right: -8,
    bottom: -12,
  },
  sectionHeader: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    color: Colors.slate800,
    marginBottom: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: CARD_W,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    color: Colors.slate900,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate700,
    marginTop: 4,
  },
  statSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.slate400,
    marginTop: 2,
  },
  pulseCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pulseCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pulseTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.slate900,
  },
  pulseSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 4,
  },
  pulseTotal: {
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  pulseTotalNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.primary,
    lineHeight: 24,
  },
  pulseTotalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.slate500,
    marginTop: 2,
  },
  columnChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  columnWrap: {
    flex: 1,
    alignItems: 'center',
  },
  columnValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.slate800,
    marginBottom: 6,
  },
  columnTrack: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 4,
  },
  columnFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  columnLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.slate600,
    marginTop: 8,
    textAlign: 'center',
  },
  pulseLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
  },
  pulseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.slate50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pulseFooterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
    flex: 1,
  },
});
