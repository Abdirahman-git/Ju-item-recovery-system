import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../src/constants/colors';
import UserInfoLayout, { InfoCard } from '../../../src/components/UserInfoLayout';
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

export default function ChangePasswordPage() {
  const toastRef = useRef(null);

  const [user, setUser] = useState(null);
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
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      const { data, error } = await supabase
        .from('users')
        .select('email, name, student_id, phone, role')
        .eq('email', session.email)
        .single();

      if (error) throw error;
      setUser({
        ...data,
        displayName: data.name || session.userName,
        studentId: data.student_id || session.studentId,
      });
    } catch (error) {
      console.error('Error fetching user for password change:', error);
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

    if (newPassword === oldPassword) {
      showAppValidation('New password must be different from your current password.');
      return;
    }

    try {
      setPasswordLoading(true);
      await changeAdminPassword({
        email: user?.email,
        studentId: user?.studentId || user?.student_id,
        currentPassword: oldPassword,
        newPassword,
      });

      toastRef.current?.show('Password updated', 'Your new password has been saved.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
      setUser((prev) => ({ ...prev, password: newPassword }));
    } catch (err) {
      console.error('Update password failed:', err);
      showAppError('Update failed', 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const passwordStrength =
    newPassword.length === 0
      ? null
      : newPassword.length < 6
        ? { label: 'Too short', color: Colors.error, width: '25%' }
        : newPassword.length < 10
          ? { label: 'Fair', color: Colors.warning, width: '55%' }
          : { label: 'Strong', color: Colors.success, width: '100%' };

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <UserInfoLayout
      variant="brand"
      title="Change Password"
      subtitle="Account security"
      icon="lock-closed"
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      ) : (
        <>
          <InfoCard style={styles.introCard}>
            <View style={styles.introIconWrap}>
              <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
            </View>
            <View style={styles.introTextWrap}>
              <Text style={styles.introTitle}>Update your password</Text>
              <Text style={styles.introSubtitle}>
                Choose a strong password you have not used elsewhere to keep your student account safe.
              </Text>
            </View>
          </InfoCard>

          <View style={styles.accountCard}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountInitials}>{getInitials(user?.displayName)}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.displayName || 'Student'}</Text>
              <Text style={styles.accountMeta}>ID: {user?.studentId || '—'}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            </View>
          </View>

          <View style={styles.tipsRow}>
            <View style={styles.tipChip}>
              <Ionicons name="key-outline" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>Min. 6 characters</Text>
            </View>
            <View style={styles.tipChip}>
              <Ionicons name="eye-off-outline" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>Keep it private</Text>
            </View>
            <View style={styles.tipChip}>
              <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>Use a unique password</Text>
            </View>
          </View>

          <InfoCard style={styles.formCard}>
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
              hint="At least 6 characters"
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
          </InfoCard>
        </>
      )}

      <SuccessToast ref={toastRef} />
    </UserInfoLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
    marginTop: 12,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  introIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTextWrap: {
    flex: 1,
  },
  introTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.slate900,
    marginBottom: 4,
  },
  introSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    lineHeight: 20,
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
  accountMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate500,
  },
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    marginBottom: 24,
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
