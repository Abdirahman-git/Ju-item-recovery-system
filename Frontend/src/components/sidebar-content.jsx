import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

export default function SidebarContent(props) {
  const router = useRouter();
  const [userName, setUserName] = useState('Alex Curator');
  const [studentId, setStudentId] = useState('CS1300000');
  const [userRole, setUserRole] = useState('University Member');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('userSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.userName) setUserName(session.userName);
          if (session.studentId) setStudentId(session.studentId);
          if (session.role) {
            setUserRole(session.role === 'admin' ? 'Administrator' : 'University Member');
          }
        }
      } catch (e) {
        console.error('Error loading user data for sidebar', e);
      }
    };
    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['isLoggedIn', 'userSession']);
      await AsyncStorage.setItem('showLogoutToast', 'true');
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const NavItem = ({ icon, label, onPress, active = false, color = '#64748B' }) => (
    <TouchableOpacity 
      style={[styles.navItem, active && styles.navItemActive]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={active ? '#FFFFFF' : color} style={styles.navIcon} />
      <Text style={[styles.navLabel, active && styles.navLabelActive, { color: active ? '#FFFFFF' : color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
             <Ionicons name="person" size={40} color={Colors.white} />
          </View>
          <View style={styles.statusBadge} />
        </View>
        
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userRole}>{userRole}</Text>
        <Text style={styles.memberSince}>ID: {studentId}</Text>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Main Navigation */}
        <View style={styles.section}>
          <NavItem icon="home" label="Home" active={true} onPress={() => router.push('/(user)/DashBoard')} />
          <NavItem icon="warning" label="Report Lost" onPress={() => router.push('/(user)/Lost')} />
          <NavItem icon="checkmark-circle" label="Report Found" onPress={() => router.push('/(user)/Found')} />
          <NavItem icon="archive" label="My Items" onPress={() => router.push('/(user)/MyItems')} />
          <NavItem icon="person" label="Profile" onPress={() => router.push('/(user)/MyProfile')} />
        </View>

        <View style={styles.divider} />

        {/* Support & Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT & INFO</Text>
          <NavItem icon="help-circle" label="Help/FAQ" onPress={() => router.push('/(user)/Help')} />
          <NavItem icon="information-circle" label="About Us" onPress={() => router.push('/(user)/AboutUs')} />
          <NavItem icon="shield-checkmark" label="Privacy Policy" onPress={() => router.push('/(user)/PrivacyPolicy')} />
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <NavItem icon="lock-closed" label="Change Password" onPress={() => router.push('/(user)/ChangePassword')} />
          <NavItem icon="log-out" label="Logout" color="#EF4444" onPress={handleLogout} />
        </View>
      </ScrollView>

      {/* App Branding at Bottom */}
      <View style={styles.footer}>
         <Image source={JU_LOGO} style={styles.footerLogo} resizeMode="contain" />
         <Text style={styles.footerName}>JU ITEM RECOVERY SYSTEM</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
    width: 70,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F1F5F9',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#0F172A',
    marginBottom: 4,
  },
  userRole: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 2,
  },
  memberSince: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollArea: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 12,
    marginBottom: 12,
    letterSpacing: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  navIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  navLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  navLabelActive: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 24,
    marginBottom: 20,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
    opacity: 0.6,
  },
  footerName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
  }
});
