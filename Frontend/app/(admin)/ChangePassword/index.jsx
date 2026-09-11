import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import { supabase, changeAdminPassword } from '../../../src/services/supabase';
import { showAppError, showAppValidation } from '../../../src/utils/appAlert';

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function PasswordField({ label, hint, icon, value, onChangeText, visible, onToggleVisible, placeholder }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={18} color={Colors.slate400} style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.slate400}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={onToggleVisible}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.slate400}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const { data, error } = await supabase
          .from('users')
          .select('email, name, student_id')
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
      await changeAdminPassword({
        email: admin?.email,
        studentId: admin?.student_id,
        currentPassword: oldPassword,
        newPassword,
      });

      toastRef.current?.show('Password updated', 'Your credentials have been saved.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      console.error('Update password failed:', err);
      showAppError('Update failed', err?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const passwordStrength =
    newPassword.length === 0
      ? null
      : newPassword.length < 4
        ? { label: 'Too short', color: Colors.error, width: '25%' }
        : newPassword.length < 10
          ? { label: 'Fair', color: Colors.warning, width: '55%' }
          : { label: 'Strong', color: Colors.success, width: '100%' };

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Change Password"
        subtitle="Account security"
        onMenuPress={openDrawer}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AdminPageHero
            eyebrow="Security"
            title="Update your password"
            subtitle="Choose a strong password to keep your admin account protected."
          />

          <View style={styles.accountCard}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountInitials}>{getInitials(admin?.name)}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{admin?.name || 'Admin'}</Text>
              <Text style={styles.accountRole}>Administrator account</Text>
            </View>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.tipsRow}>
            <View style={styles.tipChip}>
              <Ionicons name="key-outline" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>Min. 6 characters</Text>
            </View>
            <View style={styles.tipChip}>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>Keep it private</Text>
            </View>
            <View style={styles.tipChip}>
              <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>Change regularly</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconWrap}>
                <Ionicons name="lock-closed" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.formTitle}>Password credentials</Text>
                <Text style={styles.formSubtitle}>Enter your current and new password below</Text>
              </View>
            </View>

            <PasswordField
              label="Current password"
              icon="lock-closed-outline"
              placeholder="Enter current password"
              value={oldPassword}
              onChangeText={setOldPassword}
              visible={showOld}
              onToggleVisible={() => setShowOld((v) => !v)}
            />

            <PasswordField
              label="New password"
              hint="At least 4 characters"
              icon="key-outline"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              visible={showNew}
              onToggleVisible={() => setShowNew((v) => !v)}
            />

            {passwordStrength ? (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      { width: passwordStrength.width, backgroundColor: passwordStrength.color },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            ) : null}

            <PasswordField
              label="Confirm new password"
              icon="checkmark-circle-outline"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              visible={showConfirm}
              onToggleVisible={() => setShowConfirm((v) => !v)}
            />

            {confirmPassword.length > 0 ? (
              <View style={styles.matchRow}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={passwordsMatch ? Colors.success : Colors.error}
                />
                <Text style={[styles.matchText, { color: passwordsMatch ? Colors.success : Colors.error }]}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, passwordLoading && styles.submitBtnDisabled]}
              onPress={handleUpdatePassword}
              disabled={passwordLoading}
              activeOpacity={0.85}
            >
              {passwordLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.white} />
                  <Text style={styles.submitBtnText}>Update password</Text>
                </>
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
  container: { flex: 1, backgroundColor: Colors.slate50 },
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
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInitials: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.slate900,
    marginBottom: 2,
  },
  accountRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate500,
  },
  shieldBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  tipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  formIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.slate900,
    marginBottom: 2,
  },
  formSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate500,
  },
  fieldWrap: {
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate700,
    marginBottom: 4,
  },
  inputHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.slate400,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.slate100,
    paddingHorizontal: 14,
    marginBottom: 14,
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
  eyeBtn: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: -4,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate100,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    minWidth: 52,
    textAlign: 'right',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    marginTop: -6,
  },
  matchText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryDark,
    height: 52,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.white,
  },
});
