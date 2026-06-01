import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import { supabase } from '../../../src/services/supabase';

const { width } = Dimensions.get('window');

export default function MyProfileScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  // States
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    usersCount: 0,
    pendingReports: 0,
    totalItems: 0
  });

  const fetchProfileAndStats = async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // 1. Fetch admin details
        const { data: adminData, error: adminError } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.email)
          .single();

        if (adminError) throw adminError;
        setAdmin(adminData);

        // 2. Fetch system statistics for dashboard profile widgets
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        const { count: pendingLost } = await supabase
          .from('lost_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);

        const { count: pendingFound } = await supabase
          .from('found_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);

        const { count: totalLost } = await supabase
          .from('lost_items')
          .select('*', { count: 'exact', head: true });

        const { count: totalFound } = await supabase
          .from('found_items')
          .select('*', { count: 'exact', head: true });

        setStats({
          usersCount: usersCount || 0,
          pendingReports: (pendingLost || 0) + (pendingFound || 0),
          totalItems: (totalLost || 0) + (totalFound || 0)
        });
      }
    } catch (error) {
      console.error('Error fetching admin profile/stats:', error);
      toastRef.current?.show('Failed to retrieve profile data.', '', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileAndStats();
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ADMIN CONSOLE</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Admin Profile...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* VIP Admin Card (Glow, Sleek Dark Modern design) */}
          <View style={styles.profileCard}>
            <View style={styles.cardHeaderBackground} />
            
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Ionicons name="shield-checkmark" size={44} color="#FFFFFF" />
              </View>
              <View style={styles.onlineBadge} />
            </View>

            <Text style={styles.adminNameText}>{admin?.name}</Text>
            <Text style={styles.adminRoleText}>SYSTEM ADMINISTRATOR</Text>

            <View style={styles.rootAccessBadge}>
              <Ionicons name="key" size={12} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.rootAccessText}>FULL ROOT PRIVILEGES</Text>
            </View>
          </View>

          {/* Stat Mini Widgets (Aesthetic Grid) */}
          <Text style={styles.sectionHeader}>System Directory Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="people" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{stats.usersCount}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="hourglass" size={20} color="#D97706" />
              </View>
              <Text style={styles.statNumber}>{stats.pendingReports}</Text>
              <Text style={styles.statLabel}>Pending items</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="cube" size={20} color="#059669" />
              </View>
              <Text style={styles.statNumber}>{stats.totalItems}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
          </View>

          {/* Details Card */}
          <Text style={styles.sectionHeader}>Credentials & Directory Info</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Email Address</Text>
              </View>
              <Text style={styles.detailValue}>{admin?.email}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="card-outline" size={18} color="#64748B" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Admin ID Link</Text>
              </View>
              <Text style={styles.detailValue}>{admin?.student_id || 'N/A'}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="call-outline" size={18} color="#64748B" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Contact Phone</Text>
              </View>
              <Text style={styles.detailValue}>{admin?.phone || 'N/A'}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailLeft}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Security Profile</Text>
              </View>
              <View style={styles.secureBadge}>
                <Text style={styles.secureText}>OTP SIGNED</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Card */}
          <Text style={styles.sectionHeader}>Quick Panel Actions</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => navigation.navigate('PendingReports/index')}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconBg, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                </View>
                <Text style={styles.actionLabel}>Manage Pending Reports</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('ChangePassword/index')}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconBg, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="lock-open" size={18} color="#0284C7" />
                </View>
                <Text style={styles.actionLabel}>Change Security Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeaderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#1E293B', // Sleek dark banner background
  },
  avatarWrapper: {
    position: 'relative',
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  adminNameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#0F172A',
    marginBottom: 4,
  },
  adminRoleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  rootAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rootAccessText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: '#047857',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#94A3B8',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  secureBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secureText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    color: '#1D4ED8',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
});
