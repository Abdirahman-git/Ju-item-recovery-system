import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect, DrawerActions } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  getAllUsers,
  getAllLostItems,
  getAllFoundItems,
  getPendingLostItems,
  getPendingFoundItems,
  getConfirmedMatchCount,
} from '../../../src/services/supabase';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

export default function AdminDashboardOverview() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);

  // States
  const [users, setUsers] = useState([]);
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [confirmedMatchCount, setConfirmedMatchCount] = useState(0);
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
      
      const [allUsers, allLost, allFound, pendingLost, pendingFound, confirmedCount] = await Promise.all([
        getAllUsers(),
        getAllLostItems(),
        getAllFoundItems(),
        getPendingLostItems(),
        getPendingFoundItems(),
        getConfirmedMatchCount(),
      ]);
      
      setUsers(allUsers || []);
      setLostItems(allLost || []);
      setFoundItems(allFound || []);
      
      const totalPending = (pendingLost?.length || 0) + (pendingFound?.length || 0);
      setPendingReportsCount(totalPending);
      setConfirmedMatchCount(confirmedCount);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toastRef.current?.show('Load Failed', 'Failed to retrieve ledger data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const studentCount = users.filter(u => u.role === 'user').length;

  return (
    <View style={styles.container}>
      {/* Top Header with Drawer Trigger */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.headerUniversityName}>LOFO ADMIN</Text>
            <Text style={styles.headerMotto}>Jazeera University Console</Text>
          </View>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard index...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Welcome Card Banner */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeTextSection}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{adminName} ⚡</Text>
              <Text style={styles.welcomeQuote}>
                "Control the flow, secure the campus assets."
              </Text>
            </View>
            <View style={styles.shieldIconContainer}>
              <Ionicons name="shield-checkmark" size={70} color="rgba(255,255,255,0.15)" />
            </View>
          </View>

          {/* Stats Cards Section */}
          <Text style={styles.sectionHeader}>System Overview</Text>
          <View style={styles.statsGrid}>
            {/* Stat 1: Pending Reports */}
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: Colors.warning }]}
              onPress={() => router.push('/(admin)/PendingReports')}
            >
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Pending Reports</Text>
                <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="hourglass" size={14} color={Colors.warning} />
                </View>
              </View>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>
                {pendingReportsCount}
              </Text>
              <Text style={styles.statSubtext}>Requires approval</Text>
            </TouchableOpacity>

            {/* Stat 2: Active Users */}
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: Colors.primary }]}
              onPress={() => router.push('/(admin)/AllUsers')}
            >
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Total Students</Text>
                <View style={[styles.statIconBg, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="people" size={16} color={Colors.primary} />
                </View>
              </View>
              <Text style={styles.statNumber}>{studentCount}</Text>
              <Text style={styles.statSubtext}>Active in system</Text>
            </TouchableOpacity>

            {/* Stat 3: Lost Items */}
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: Colors.error }]}
              onPress={() => router.push({ pathname: '/(admin)/AllItems', params: { initialTab: 'lost' } })}
            >
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Lost Items</Text>
                <View style={[styles.statIconBg, { backgroundColor: Colors.lostBadge }]}>
                  <Ionicons name="search" size={16} color={Colors.error} />
                </View>
              </View>
              <Text style={styles.statNumber}>{lostItems.length}</Text>
              <Text style={styles.statSubtext}>Property missing</Text>
            </TouchableOpacity>

            {/* Stat 4: Found Items */}
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: Colors.success }]}
              onPress={() => router.push({ pathname: '/(admin)/AllItems', params: { initialTab: 'found' } })}
            >
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Found Items</Text>
                <View style={[styles.statIconBg, { backgroundColor: Colors.foundBadge }]}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                </View>
              </View>
              <Text style={styles.statNumber}>{foundItems.length}</Text>
              <Text style={styles.statSubtext}>Property recovered</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions Shortcuts */}
          <Text style={styles.sectionHeader}>Shortcuts</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(admin)/PendingReports')}
            >
              <Ionicons name="checkmark-done-circle" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Approve Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.slate800 }]}
              onPress={() => router.push('/(admin)/ReturnedItems')}
            >
              <Ionicons name="gift" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Returned Items</Text>
            </TouchableOpacity>
          </View>

          {confirmedMatchCount > 0 && (
            <TouchableOpacity
              style={styles.confirmedBanner}
              onPress={() => router.push('/(admin)/ConfirmedMatches')}
            >
              <View style={styles.confirmedBannerLeft}>
                <MaterialCommunityIcons name="link-variant" size={22} color="#1E40AF" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.confirmedBannerTitle}>Confirmed Matches</Text>
                  <Text style={styles.confirmedBannerSub}>
                    {confirmedMatchCount} pair{confirmedMatchCount > 1 ? 's' : ''} awaiting admin review
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#1E40AF" />
            </TouchableOpacity>
          )}

          {/* System Integrity & Diagnostics */}
          <View style={styles.systemStatusCard}>
            <View style={styles.systemStatusHeader}>
              <Ionicons name="pulse" size={20} color={Colors.success} />
              <Text style={styles.systemStatusTitle}>Live Diagnostics Ledger</Text>
            </View>
            <View style={styles.systemStatusRow}>
              <Text style={styles.statusLabel}>Database Service Connection</Text>
              <View style={styles.statusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.statusPillText}>Operational</Text>
              </View>
            </View>
            <View style={styles.systemStatusRow}>
              <Text style={styles.statusLabel}>University Geofencing Lock</Text>
              <View style={styles.statusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.statusPillText}>Active (500m)</Text>
              </View>
            </View>
            <View style={[styles.systemStatusRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.statusLabel}>OTP Activator Nodemailer</Text>
              <View style={styles.statusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.statusPillText}>Active</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  headerUniversityName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  headerMotto: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#64748B',
    marginTop: -2,
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
    backgroundColor: Colors.slate900,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  welcomeTextSection: {
    flex: 1,
    zIndex: 2,
  },
  welcomeGreeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate400,
  },
  welcomeName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: Colors.white,
    marginTop: 2,
  },
  welcomeQuote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.slate300,
    fontStyle: 'italic',
    marginTop: 8,
  },
  shieldIconContainer: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    zIndex: 1,
  },
  sectionHeader: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 15,
    color: Colors.slate900,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate400,
  },
  statIconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.slate900,
    marginVertical: 4,
  },
  statSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.slate400,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.white,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  confirmedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  confirmedBannerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#1E40AF',
  },
  confirmedBannerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  systemStatusCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  systemStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  systemStatusTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.slate900,
  },
  systemStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  statusLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.slate600,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.success,
  },
});
