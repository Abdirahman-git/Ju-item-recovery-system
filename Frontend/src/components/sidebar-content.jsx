import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { showAppConfirm } from '../utils/appAlert';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

const NAV_SECTIONS = [
  {
    title: 'Main Menu',
    items: [
      { icon: 'home', label: 'Home', routeName: 'DashBoard/index', path: '/(user)/DashBoard' },
      { icon: 'search', label: 'Report Lost', routeName: 'Lost/index', path: '/(user)/Lost' },
      { icon: 'checkmark-circle', label: 'Report Found', routeName: 'Found/index', path: '/(user)/Found' },
      { icon: 'folder-open', label: 'My Items', routeName: 'MyItems/index', path: '/(user)/MyItems' },
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

  const NavItem = ({ icon, label, routeName, onPress }) => {
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.admin.heroStart, Colors.admin.heroEnd]} style={styles.hero}>
        <View style={styles.heroTop}>
          <Image source={JU_LOGO} style={styles.heroLogo} resizeMode="contain" />
          <View style={styles.studentPill}>
            <View style={styles.onlineDot} />
            <Text style={styles.studentPillText}>STUDENT</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>JU Item Recovery</Text>
        <Text style={styles.heroName}>{userName}</Text>
        <Text style={styles.heroId}>ID: {studentId}</Text>
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
  studentPill: {
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
  studentPillText: {
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
  },
  heroId: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    letterSpacing: 0.5,
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
