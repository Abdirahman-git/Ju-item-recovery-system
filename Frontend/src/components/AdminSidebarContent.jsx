import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import {
  getPendingLostItems,
  getPendingFoundItems,
  getPendingItemClaimCount,
} from '../services/supabase';
import { showAppConfirm } from '../utils/appAlert';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

const NAV_SECTIONS = [
  {
    title: 'Command Center',
    items: [
      { icon: 'grid', label: 'Overview', routeName: 'DashBoard/index', path: '/(admin)/DashBoard' },
      {
        icon: 'hourglass',
        label: 'Pending Reports',
        routeName: 'PendingReports/index',
        path: '/(admin)/PendingReports',
        badgeKey: 'pending',
      },
      {
        icon: 'clipboard',
        label: 'Ownership Requests',
        routeName: 'MatchClaims/index',
        path: '/(admin)/MatchClaims',
        badgeKey: 'claims',
      },
    ],
  },
  {
    title: 'Directory & Logs',
    items: [
      { icon: 'people', label: 'All Users', routeName: 'AllUsers/index', path: '/(admin)/AllUsers' },
      { icon: 'cube', label: 'All Items', routeName: 'AllItems/index', path: '/(admin)/AllItems' },
      { icon: 'gift', label: 'Returned Items', routeName: 'ReturnedItems/index', path: '/(admin)/ReturnedItems' },
    ],
  },
  {
    title: 'Field Reports',
    items: [
      { icon: 'search', label: 'Report Lost', routeName: 'Lost/index', path: '/(admin)/Lost' },
      { icon: 'checkmark-circle', label: 'Report Found', routeName: 'Found/index', path: '/(admin)/Found' },
      { icon: 'folder-open', label: 'My Items', routeName: 'MyItems/index', path: '/(admin)/MyItems' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person', label: 'My Profile', routeName: 'MyProfile/index', path: '/(admin)/MyProfile' },
      { icon: 'lock-closed', label: 'Change Password', routeName: 'ChangePassword/index', path: '/(admin)/ChangePassword' },
    ],
  },
];

export default function AdminSidebarContent(props) {
  const router = useRouter();
  const [adminName, setAdminName] = useState('Administrator');
  const [pendingCount, setPendingCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);

  const { state } = props;
  const activeRouteName = state?.routeNames[state.index];

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('userSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.userName) setAdminName(session.userName);
        }
      } catch (e) {
        console.error('Error loading admin session for sidebar', e);
      }
    };

    const fetchPendingCount = async () => {
      try {
        const [pendingLost, pendingFound, claims] = await Promise.all([
          getPendingLostItems(),
          getPendingFoundItems(),
          getPendingItemClaimCount(),
        ]);
        setPendingCount((pendingLost?.length || 0) + (pendingFound?.length || 0));
        setClaimsCount(claims);
      } catch (e) {
        console.error('Error fetching sidebar counts', e);
      }
    };

    loadAdminData();
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    showAppConfirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out from the Admin Control Panel?',
      confirmText: 'Sign out',
      destructive: true,
      onConfirm: async () => {
        try {
          await AsyncStorage.multiRemove(['isLoggedIn', 'userSession']);
          await AsyncStorage.setItem('showLogoutToast', 'true');
          router.replace('/(auth)/login');
        } catch (e) {
          console.error('Logout error', e);
        }
      },
    });
  };

  const badgeFor = (key) => {
    if (key === 'pending') return pendingCount;
    if (key === 'claims') return claimsCount;
    return 0;
  };

  const NavItem = ({ icon, label, routeName, onPress, badge = 0 }) => {
    const active = activeRouteName === routeName;

    return (
      <TouchableOpacity
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {active && <View style={styles.activeBar} />}
        <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
          <Ionicons name={icon} size={18} color={active ? '#FFFFFF' : Colors.admin.muted} />
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        {badge > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.admin.heroStart, Colors.admin.heroEnd]} style={styles.hero}>
        <View style={styles.heroTop}>
          <Image source={JU_LOGO} style={styles.heroLogo} resizeMode="contain" />
          <View style={styles.adminPill}>
            <View style={styles.onlineDot} />
            <Text style={styles.adminPillText}>ADMIN</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>JU LOFO Console</Text>
        <Text style={styles.heroName}>{adminName}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{pendingCount}</Text>
            <Text style={styles.heroStatLabel}>Pending</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{claimsCount}</Text>
            <Text style={styles.heroStatLabel}>Claims</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {NAV_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <NavItem
                key={item.routeName}
                icon={item.icon}
                label={item.label}
                routeName={item.routeName}
                badge={badgeFor(item.badgeKey)}
                onPress={() => router.push(item.path)}
              />
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#FCA5A5" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.admin.sidebar,
  },
  hero: {
    paddingTop: 54,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  adminPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.white,
  },
  heroName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.white,
  },
  heroStatLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.slate500,
    letterSpacing: 1.1,
    marginBottom: 8,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  navItemActive: {
    backgroundColor: Colors.admin.navActiveBg,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navIconWrapActive: {
    backgroundColor: Colors.primary,
  },
  navLabel: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.admin.muted,
  },
  navLabelActive: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  badgeContainer: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.white,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FCA5A5',
  },
});
