import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
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

export default function AdminSidebarContent(props) {
  const router = useRouter();
  const [adminName, setAdminName] = useState('Sarah Admin');
  const [pendingCount, setPendingCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);

  // Get active route name to highlight menu item
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

        const totalPending = (pendingLost?.length || 0) + (pendingFound?.length || 0);
        setPendingCount(totalPending);
        setClaimsCount(claims);
      } catch (e) {
        console.error('Error fetching sidebar counts', e);
      }
    };

    loadAdminData();
    fetchPendingCount();

    // Set up interval to refresh pending reports count every 10 seconds
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

  const NavItem = ({ icon, label, routeName, onPress, badge = 0, isRed = false }) => {
    const active = activeRouteName === routeName;

    return (
      <TouchableOpacity 
        style={[
          styles.navItem, 
          active && styles.navItemActive,
        ]} 
        onPress={onPress}
      >
        <View style={styles.navItemLeft}>
          <Ionicons 
            name={icon} 
            size={22} 
            color={active ? Colors.primary : isRed ? Colors.error : '#64748B'} 
            style={styles.navIcon} 
          />
          <Text 
            style={[
              styles.navLabel, 
              active && styles.navLabelActive, 
              { color: active ? Colors.primary : isRed ? Colors.error : '#64748B' }
            ]}
          >
            {label}
          </Text>
        </View>

        {badge > 0 && (
          <View style={[styles.badgeContainer, { backgroundColor: active ? Colors.primary : Colors.error }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with App Title & Avatar */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.appTitleContainer}>
            <Ionicons name="grid-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Admin Curator</Text>
          </View>
          <Image source={JU_LOGO} style={styles.headerMiniLogo} resizeMode="contain" />
        </View>
      </View>

      {/* Administrator Profile Card */}
      <View style={styles.adminProfileCard}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={Colors.white} />
          </View>
          <View style={styles.onlineBadge} />
        </View>
        
        <Text style={styles.adminName}>{adminName}</Text>
        <Text style={styles.adminRole}>SYSTEM ADMINISTRATOR</Text>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Main Navigation */}
        <View style={styles.section}>
          <NavItem 
            icon="grid-outline" 
            label="Overview" 
            routeName="DashBoard/index"
            onPress={() => router.push('/(admin)/DashBoard')} 
          />
          <NavItem 
            icon="hourglass-outline" 
            label="Pending Reports" 
            routeName="PendingReports/index"
            badge={pendingCount}
            onPress={() => router.push('/(admin)/PendingReports')} 
          />
          <NavItem 
            icon="people-outline" 
            label="All Users" 
            routeName="AllUsers/index"
            onPress={() => router.push('/(admin)/AllUsers')} 
          />
          <NavItem 
            icon="cube-outline" 
            label="All Items" 
            routeName="AllItems/index"
            onPress={() => router.push('/(admin)/AllItems')} 
          />
          <NavItem 
            icon="warning-outline" 
            label="Report Lost" 
            routeName="Lost/index"
            onPress={() => router.push('/(admin)/Lost')} 
          />
          <NavItem 
            icon="checkmark-circle-outline" 
            label="Report Found" 
            routeName="Found/index"
            onPress={() => router.push('/(admin)/Found')} 
          />
          <NavItem 
            icon="archive-outline" 
            label="My Items" 
            routeName="MyItems/index"
            onPress={() => router.push('/(admin)/MyItems')} 
          />
          <NavItem 
            icon="gift-outline" 
            label="Returned Items" 
            routeName="ReturnedItems/index"
            onPress={() => router.push('/(admin)/ReturnedItems')} 
          />
          <NavItem
            icon="clipboard-outline"
            label="Ownership Requests"
            routeName="MatchClaims/index"
            badge={claimsCount}
            onPress={() => router.push('/(admin)/MatchClaims')}
          />
          <NavItem 
            icon="person-outline" 
            label="My Profile" 
            routeName="MyProfile/index"
            onPress={() => router.push('/(admin)/MyProfile')} 
          />
          <NavItem 
            icon="lock-closed-outline" 
            label="Change Password" 
            routeName="ChangePassword/index"
            onPress={() => router.push('/(admin)/ChangePassword')} 
          />
        </View>

        <View style={styles.divider} />

        {/* Action Panel */}
        <View style={styles.section}>
          <NavItem 
            icon="log-out-outline" 
            label="Logout Console" 
            routeName="Logout"
            isRed={true}
            onPress={handleLogout} 
          />
        </View>
      </ScrollView>

      {/* App Branding at Bottom */}
      <View style={styles.footer}>
         <Image source={JU_LOGO} style={styles.footerLogo} resizeMode="contain" />
         <Text style={styles.footerName}>JU LOFO ADMIN HUB</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#1E3A8A',
  },
  headerMiniLogo: {
    width: 32,
    height: 32,
  },
  adminProfileCard: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.slate100,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  adminName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.slate900,
    marginBottom: 4,
    textAlign: 'center',
  },
  adminRole: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.slate400,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 6,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF',
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  navLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  navLabelActive: {
    fontFamily: 'Inter_700Bold',
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 24,
    marginVertical: 15,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
    opacity: 0.6,
  },
  footerName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    color: '#94A3B8',
    letterSpacing: 0.5,
  }
});
