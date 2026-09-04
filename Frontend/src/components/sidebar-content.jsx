import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { showAppConfirm } from '../utils/appAlert';
import { useUserNotifications } from '../context/UserNotificationContext';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

const NAV_SECTIONS = [
  {
    title: 'Main Menu',
    items: [
      { icon: 'home', label: 'Home', routeName: 'DashBoard/index', path: '/(user)/DashBoard' },
      { icon: 'search', label: 'Report Lost', routeName: 'Lost/index', path: '/(user)/Lost' },
      { icon: 'folder-open', label: 'My Items', routeName: 'MyItems/index', path: '/(user)/MyItems' },
      { icon: 'document-text', label: 'My Requests', routeName: 'MyRequests/index', path: '/(user)/MyRequests' },
      { icon: 'notifications', label: 'Notifications', routeName: 'Notifications/index', path: '/(user)/Notifications' },
      { icon: 'person', label: 'My Profile', routeName: 'MyProfile/index', path: '/(user)/MyProfile' },
    ],
  },
  {
    title: 'Support & Info',
    items: [
      { icon: 'help-circle', label: 'Help / FAQ', routeName: 'Help/index', path: '/(user)/Help' },
      { icon: 'information-circle', label: 'About Us', routeName: 'AboutUs/index', path: '/(user)/AboutUs' },
      { icon: 'shield-checkmark', label: 'Privacy Policy', routeName: 'PrivacyPolicy/index', path: '/(user)/PrivacyPolicy' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'lock-closed', label: 'Change Password', routeName: 'ChangePassword/index', path: '/(user)/ChangePassword' },
    ],
  },
];

export default function SidebarContent(props) {
  const router = useRouter();
  const { unreadCount } = useUserNotifications();
  const [userName, setUserName] = useState('Student');
  const [studentId, setStudentId] = useState('—');

  const { state } = props;
  const activeRouteName = state?.routeNames[state.index];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('userSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.userName) setUserName(session.userName);
          if (session.studentId) setStudentId(session.studentId);
        }
      } catch (e) {
        console.error('Error loading user data for sidebar', e);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = () => {
    showAppConfirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
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

  const NavItem = ({ icon, label, routeName, onPress, badge }) => {
    const active = activeRouteName === routeName;
    const showBadge = Number(badge) > 0;

    return (
      <TouchableOpacity
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {active ? <View style={styles.activeBar} /> : null}
        <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
          <Ionicons name={icon} size={17} color="#FFFFFF" />
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        {showBadge ? (
          <View style={[styles.navBadge, active && styles.navBadgeActive]}>
            <Text style={styles.navBadgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
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
      {/* Ambient glow — web admin style */}
      <View style={styles.orbA} pointerEvents="none" />
      <View style={styles.orbB} pointerEvents="none" />
      <View style={styles.topFade} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoGlow}>
              <View style={styles.logoCard}>
                <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>JU LOFO</Text>
              <Text style={styles.brandName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.brandId} numberOfLines={1}>
                ID · {studentId}
              </Text>
            </View>
          </View>

          <View style={styles.rolePill}>
            <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
            <Text style={styles.rolePillText}>STUDENT</Text>
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
                key={item.routeName}
                icon={item.icon}
                label={item.label}
                routeName={item.routeName}
                badge={item.routeName === 'Notifications/index' ? unreadCount : 0}
                onPress={() => router.push(item.path)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer Sign Out */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
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
    overflow: 'hidden',
  },
  orbA: {
    position: 'absolute',
    top: 40,
    left: -40,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  orbB: {
    position: 'absolute',
    bottom: 64,
    right: -32,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(129, 140, 248, 0.18)',
  },
  topFade: {
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
    paddingBottom: 16,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  logoGlow: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  logoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 4,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  brandName: {
    marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.92)',
  },
  brandId: {
    marginTop: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  rolePill: {
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
  rolePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  scrollArea: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    transform: [{ translateX: 3 }],
  },
  activeBar: {
    position: 'absolute',
    left: -3,
    top: '18%',
    bottom: '18%',
    width: 4,
    borderRadius: 999,
    backgroundColor: '#60A5FA',
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconWrapActive: {
    borderColor: 'rgba(26, 86, 219, 0.25)',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navLabel: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  navLabelActive: {
    color: '#0F2744',
    fontFamily: 'Inter_800ExtraBold',
  },
  navBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  navBadgeActive: {
    backgroundColor: Colors.primary,
  },
  navBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  footer: {
    zIndex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    padding: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  logoutText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FECACA',
  },
});
