import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../src/services/supabase';
import { showAppConfirm } from '../../../src/utils/appAlert';
import { facultyFromStudentId } from '../../../src/constants/faculty';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        // Fetch fresh data from student_directory to get the most up-to-date phone number and details
        const { data, error } = await supabase
          .from('student_directory')
          .select('*')
          .eq('student_id', session.studentId)
          .single();
        
        if (data) {
          setUser({
            ...session,
            phone: data.phone_number,
            userName: data.full_name,
            email: data.email || session.email,
            faculty: data.faculty || session.faculty || facultyFromStudentId(data.student_id || session.studentId) || '',
          });
        } else {
          setUser(session);
        }
      }
    } catch (e) {
      console.log('Error fetching user:', e);
    }
  };

  const handleLogout = () => {
    showAppConfirm({
      title: 'Logout',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Logout',
      destructive: true,
      onConfirm: async () => {
        await AsyncStorage.removeItem('userSession');
        router.replace('/(auth)/login');
      },
    });
  };

  const InfoRow = ({ icon, label, value, color }) => (
    <View style={styles.infoRow}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Advanced Header */}
        <LinearGradient
          colors={['#1E40AF', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBackground}
        >
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.topNavTitle}>My Profile</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarGlow}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarInitial}>
                  {user?.userName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            </View>
            <Text style={styles.userNameText}>{user?.userName || 'Jazeera Student'}</Text>
            <Text style={styles.userRoleText}>{user?.studentId || 'ID: 00000'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.bodyContent}>
          {/* Info Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <InfoRow icon="person-outline" label="Full Name" value={user?.userName} color="#1E40AF" />
            <InfoRow icon="id-card-outline" label="Student ID" value={user?.studentId} color="#8B5CF6" />
            <InfoRow icon="school-outline" label="Department / Faculty" value={user?.faculty} color="#F59E0B" />
            <InfoRow icon="mail-outline" label="University Email" value={user?.email} color="#EF4444" />
            <InfoRow icon="call-outline" label="Phone Number" value={user?.phone || '+252 --- ---'} color="#10B981" />
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>App Preferences</Text>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" />
                <Text style={styles.actionText}>Privacy & Security</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionLeft}>
                <Ionicons name="help-circle-outline" size={20} color="#64748B" />
                <Text style={styles.actionText}>Help Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Sign Out Account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footerBranding}>
            <Image source={JU_LOGO} style={styles.footerLogo} />
            <Text style={styles.footerText}>Version 2.0.4 • JU Item Recovery</Text>
          </View>
        </View>
      </ScrollView>
      <CustomBottomTab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 120 },
  
  headerBackground: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarGlow: {
    padding: 6,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1E40AF',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  userRoleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },

  bodyContent: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 12,
  },

  logoutButton: {
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },

  footerBranding: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerLogo: {
    width: 30,
    height: 30,
    opacity: 0.3,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  }
});
