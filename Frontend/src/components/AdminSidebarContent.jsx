import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import {
  getPendingLostItems,
  getPendingFoundItems,
  getPendingItemClaimCount,
} from '../services/supabase';
import { showAppConfirm } from '../utils/appAlert';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

/** Same structure as Web admin navigation.js */
const NAV_SECTIONS = [
  {
    title: 'Command Center',
    items: [
      { icon: 'grid', label: 'Overview', path: '/(admin)/DashBoard', match: '/DashBoard' },
      {
        icon: 'hourglass',
        label: 'Pending Reports',
        path: '/(admin)/PendingReports',
        match: '/PendingReports',
        badgeKey: 'pending',
      },
      {
        icon: 'clipboard',
        label: 'Ownership Requests',
        path: '/(admin)/MatchClaims',
        match: '/MatchClaims',
        badgeKey: 'claims',
      },
    ],
  },
  {
    title: 'Directory & Logs',
    items: [
      { icon: 'people', label: 'All Users', path: '/(admin)/AllUsers', match: '/AllUsers' },
      { icon: 'cube', label: 'All Items', path: '/(admin)/AllItems', match: '/AllItems' },
      { icon: 'document-text', label: 'Drafts', path: '/(admin)/Drafts', match: '/Drafts' },
      { icon: 'gift', label: 'Returned Items', path: '/(admin)/ReturnedItems', match: '/ReturnedItems' },
    ],
  },
  {
    title: 'Field Reports',
    items: [
      { icon: 'search', label: 'Report Lost', path: '/(admin)/Lost', match: '/Lost' },
      {
        icon: 'shield-checkmark',
        label: 'Secure Lost',
        path: '/(admin)/SecureFound',
        match: '/SecureFound',
      },
      { icon: 'folder-open', label: 'My Items', path: '/(admin)/MyItems', match: '/MyItems' },
    ],
  },
  {
    title: 'System Reports',
    items: [
      {
        icon: 'stats-chart',
        label: 'All System Reports',
        path: '/(admin)/SystemReports',
        match: '/SystemReports',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person', label: 'My Profile', path: '/(admin)/MyProfile', match: '/MyProfile' },
      {
        icon: 'lock-closed',
        label: 'Change Password',
        path: '/(admin)/ChangePassword',
        match: '/ChangePassword',
      },
    ],
  },
];

export default function AdminSidebarContent(props) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [adminName, setAdminName] = useState('Administrator');
  const [pendingCount, setPendingCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);

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

  const isActivePath = (match) => Boolean(match && pathname.includes(match));

  const goTo = (path) => {
    props.navigation?.closeDrawer?.();
    router.push(path);
  };

  const NavItem = ({ icon, label, path, match, badge = 0 }) => {
    const active = isActivePath(match);

    return (
      <TouchableOpacity
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={() => goTo(path)}
        activeOpacity={0.85}
      >
        {active ? <View style={styles.activeBar} /> : null}
        <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
          <Ionicons name={icon} size={17} color="#FFFFFF" />
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        {badge > 0 ? (
          <View style={[styles.badge, active && styles.badgeOnActive]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#0f2d6b', '#1a56db', '#2563eb', '#1e40af']}
      locations={[0, 0.38, 0.72, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Ambient glow — matches web glass-sidebar */}
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <View pointerEvents="none" style={styles.glowFade} />

      {/* Header — compact like web */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoOuter}>
              <View style={styles.logoCard}>
                <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>JU LOFO</Text>
              <Text style={styles.brandName} numberOfLines={1}>
                {adminName}
              </Text>
            </View>
          </View>

          <View style={styles.adminPill}>
            <Ionicons name="shield" size={11} color="#FFFFFF" />
            <Text style={styles.adminPillText}>ADMIN</Text>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NAV_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <NavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                match={item.match}
                badge={badgeFor(item.badgeKey)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer sign out */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#FECACA" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: 40,
    left: -40,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 64,
    right: -32,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(165, 180, 252, 0.15)',
  },
  glowFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 128,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  logoOuter: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 2,
  },
  logoCard: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    padding: 4,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  brandName: {
    marginTop: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  adminPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 8,
    paddingLeft: 8,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.88)',
  },
  navItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
    transform: [{ translateX: 3 }],
  },
  activeBar: {
    position: 'absolute',
    left: -3,
    top: '19%',
    bottom: '19%',
    width: 4,
    borderRadius: 999,
    backgroundColor: '#60A5FA',
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  navIconWrapActive: {
    borderColor: 'rgba(26, 86, 219, 0.2)',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  navLabel: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  navLabelActive: {
    fontFamily: 'Inter_700Bold',
    color: '#0f2744',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.5)',
  },
  badgeOnActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    paddingBottom: 28,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 12,
  },
  logoutText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FECACA',
  },
});
