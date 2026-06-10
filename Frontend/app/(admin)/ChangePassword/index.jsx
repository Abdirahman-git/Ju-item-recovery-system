import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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
import { showAppError, showAppValidation } from '../../../src/utils/appAlert';

const { width } = Dimensions.get('window');

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  // States
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.email)
          .single();

        if (error) throw error;
        setAdmin(data);
      }
    } catch (error) {
      console.error('Error fetching admin for password change:', error);
      showAppError('Could not load profile', 'Failed to load your account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showAppValidation('Please fill in all password fields.');
      return;
    }

    if (admin.password !== oldPassword) {
      showAppValidation('Current password is incorrect.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAppValidation('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showAppValidation('Password must be at least 6 characters.');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('email', admin.email);

      if (error) throw error;

      toastRef.current?.show('Password Updated! 🔐🎉', '', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Update local state
      setAdmin(prev => ({ ...prev, password: newPassword }));
    } catch (err) {
      console.error('Update password failed:', err);
      showAppError('Update failed', 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>SECURE KEYSHEET</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching credential token...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Ionicons name="key" size={40} color={Colors.white} />
              </View>
              <View style={styles.onlineBadge} />
            </View>

            <Text style={styles.adminNameText}>Change Access Key</Text>
            <Text style={styles.adminRoleText}>UPDATE PASSWORD FOR {admin?.name.toUpperCase()}</Text>
          </View>

          {/* Form: Update Password */}
          <Text style={styles.sectionHeader}>Security Credentials</Text>
          <View style={styles.securityCard}>
            <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.slate400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter current password"
                placeholderTextColor={Colors.slate400}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={true}
              />
            </View>

            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={Colors.slate400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter new password"
                placeholderTextColor={Colors.slate400}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={true}
              />
            </View>

            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={Colors.slate400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.slate400}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleUpdatePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Update Password Credentials</Text>
              )}
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
    color: Colors.slate500,
    marginTop: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.slate100,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  adminNameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.slate900,
    marginBottom: 4,
  },
  adminRoleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.slate400,
    letterSpacing: 1.5,
  },
  sectionHeader: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 15,
    color: Colors.slate900,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  securityCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.slate400,
    marginBottom: 6,
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate900,
  },
  submitBtn: {
    backgroundColor: Colors.primaryDark,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.white,
  },
});
