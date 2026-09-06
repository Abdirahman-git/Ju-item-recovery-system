import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import SuccessToast from '../../src/components/SuccessToast';

import { supabase } from '../../src/services/supabase';
import { BACKEND_URL } from '../../src/config/api';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');
const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const toastRef = useRef(null);

  // Wizard Steps: 1 = Validate ID, 2 = Verify OTP, 3 = Set Password
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // States
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentFaculty, setStudentFaculty] = useState('');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation & Inline Notices (matches LoginScreen)
  const [fieldErrors, setFieldErrors] = useState({});
  const [inlineNotice, setInlineNotice] = useState(null);

  const clearNotice = () => setInlineNotice(null);

  const clearFieldError = (fieldName) => {
    clearNotice();
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const goToStep = (newStep) => {
    setFieldErrors({});
    clearNotice();
    setStep(newStep);
  };

  // STEP 1: Validate ID & Automatically Send OTP to Registered Phone via SMS
  const handleValidateId = async () => {
    if (!studentId.trim()) {
      setFieldErrors({ studentId: 'Please enter your ID.' });
      clearNotice();
      return;
    }

    setFieldErrors({});
    clearNotice();
    setLoading(true);
    try {
      const { data: student, error } = await supabase
        .from('student_directory')
        .select('*')
        .eq('student_id', studentId.trim().toUpperCase())
        .single();

      if (error || !student) {
        setFieldErrors({ studentId: 'ID not found in Jazeera University directory.' });
        setInlineNotice({
          type: 'not_found',
          title: 'ID not found',
          message: 'No student record exists for this ID. Please check your student ID and try again.',
        });
        return;
      }

      if (student.status === 'activated') {
        setInlineNotice({
          type: 'not_found',
          title: 'Already activated',
          message: 'This ID has already been registered and activated. Please sign in instead.',
        });
        return;
      }

      const access = String(student.access_status || '').toLowerCase();
      const expiresAt = student.expires_at ? new Date(`${String(student.expires_at).slice(0, 10)}T23:59:59`) : null;
      const expired =
        access === 'expired' ||
        access === 'blocked' ||
        (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now());
      if (expired) {
        setInlineNotice({
          type: 'suspended',
          title: 'Access expired',
          message: 'This ID has expired for LOFO access. Contact the campus Lost & Found office.',
        });
        return;
      }

      if (!student.phone_number) {
        setInlineNotice({
          type: 'error',
          title: 'No phone number',
          message: 'No pre-registered phone number found for this ID. Please contact the administrator.',
        });
        return;
      }

      // Populate student info
      setStudentName(student.full_name);
      setStudentPhone(student.phone_number || '');
      setStudentFaculty(student.faculty);
      const studentEmail = (student.email || '').trim().toLowerCase();
      setEmail(studentEmail);

      const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          email: studentEmail,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send OTP SMS.');
      }

      const masked = resData.phone || student.phone_number;
      toastRef.current?.show('OTP Code Sent!', `Check your phone ending in ${masked.slice(-4)}`, 'success');
      goToStep(2);
    } catch (err) {
      const message =
        err.message === 'Network request failed'
          ? 'Cannot reach backend server. Ensure backend is running and phone is on the same WiFi.'
          : err.message || 'Validation Failed';
      setInlineNotice({
        type: 'error',
        title: 'Validation failed',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to resend OTP
  const handleSendOtp = async () => {
    if (!studentId.trim()) {
      setFieldErrors({ studentId: 'ID missing. Go back and verify again.' });
      return;
    }

    clearNotice();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send OTP.');
      }

      const masked = resData.phone || studentPhone;
      toastRef.current?.show('OTP Code Resent!', `Check your phone ending in ${masked.slice(-4)}`, 'success');
    } catch (err) {
      setInlineNotice({
        type: 'error',
        title: 'Could not send OTP',
        message: err.message || 'Failed to send OTP. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setFieldErrors({ otp: 'Please enter the 6-digit OTP code.' });
      clearNotice();
      return;
    }

    if (otp.trim().length < 6) {
      setFieldErrors({ otp: 'Enter the full 6-digit code from your SMS.' });
      clearNotice();
      return;
    }

    setFieldErrors({});
    clearNotice();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Incorrect OTP code.');
      }

      toastRef.current?.show('OTP Code Verified! ✅', '', 'success');
      goToStep(3);
    } catch (err) {
      setFieldErrors({ otp: err.message || 'Incorrect OTP code.' });
      setInlineNotice({
        type: 'error',
        title: 'Verification failed',
        message: err.message || 'The OTP code is incorrect or expired. Please check your SMS or resend.',
      });
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Complete Registration
  const handleActivateAccount = async () => {
    const nextErrors = {};
    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      clearNotice();
      return;
    }

    setFieldErrors({});
    clearNotice();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/activate-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          name: studentName,
          phone: studentPhone,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Activation failed.');
      }

      toastRef.current?.show('Account Activated! 🎓🎉', '', 'success');

      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2200);
    } catch (err) {
      setInlineNotice({
        type: 'error',
        title: 'Activation failed',
        message: err.message || 'Activation failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'ID Verification';
      case 2: return 'OTP Verification';
      case 3: return 'Secure Account';
      default: return 'Register';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1: return 'Verify your Jazeera University credentials.';
      case 2: return 'Type the 6-digit confirmation key sent to your phone via SMS.';
      case 3: return 'Establish your secret access password to complete activation.';
      default: return 'Join the Jazeera University network.';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step > 1 ? goToStep(step - 1) : router.back())} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.logoWrapper}>
            <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>JU LOFO HUB</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Dots */}
        <View style={styles.progressDotsRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s === step && styles.progressDotActive,
                s < step && styles.progressDotPassed,
              ]}
            />
          ))}
        </View>

        <Text style={styles.title}>{getStepTitle()}</Text>
        <Text style={styles.subtitle}>{getStepSubtitle()}</Text>

        <View style={styles.card}>
          {/* Inline Alert/Notice Box */}
          {inlineNotice ? (
            <View
              style={[
                styles.noticeBox,
                inlineNotice.type === 'suspended'
                  ? styles.noticeSuspended
                  : inlineNotice.type === 'banned'
                    ? styles.noticeBanned
                    : inlineNotice.type === 'not_found'
                      ? styles.noticeNotFound
                      : styles.noticeError,
              ]}
            >
              <View
                style={[
                  styles.noticeIconWrap,
                  inlineNotice.type === 'suspended'
                    ? styles.noticeIconSuspended
                    : inlineNotice.type === 'banned'
                      ? styles.noticeIconBanned
                      : inlineNotice.type === 'not_found'
                        ? styles.noticeIconNotFound
                        : styles.noticeIconError,
                ]}
              >
                <Ionicons
                  name={
                    inlineNotice.type === 'suspended'
                      ? 'lock-closed'
                      : inlineNotice.type === 'banned'
                        ? 'ban'
                        : inlineNotice.type === 'not_found'
                          ? 'person-outline'
                          : 'alert-circle'
                  }
                  size={18}
                  color={
                    inlineNotice.type === 'suspended'
                      ? '#B45309'
                      : inlineNotice.type === 'banned'
                        ? '#DC2626'
                        : inlineNotice.type === 'not_found'
                          ? '#1A56DB'
                          : '#DC2626'
                  }
                />
              </View>
              <View style={styles.noticeTextWrap}>
                <Text
                  style={[
                    styles.noticeTitle,
                    inlineNotice.type === 'suspended'
                      ? styles.noticeTitleSuspended
                      : inlineNotice.type === 'banned'
                        ? styles.noticeTitleBanned
                        : inlineNotice.type === 'not_found'
                          ? styles.noticeTitleNotFound
                          : styles.noticeTitleError,
                  ]}
                >
                  {inlineNotice.title}
                </Text>
                <Text style={styles.noticeMessage}>{inlineNotice.message}</Text>
              </View>
            </View>
          ) : null}

          {/* STEP 1: ID */}
          {step === 1 && (
            <View>
              <Text style={styles.label}>ENTER ID</Text>
              <View style={[styles.inputContainer, fieldErrors.studentId && styles.inputContainerError]}>
                <Ionicons name="id-card-outline" size={20} color={fieldErrors.studentId ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="JU-2026-001"
                  placeholderTextColor={Colors.slate400}
                  value={studentId}
                  onChangeText={(text) => {
                    setStudentId(text);
                    clearFieldError('studentId');
                  }}
                  autoCapitalize="characters"
                />
              </View>
              {fieldErrors.studentId ? <Text style={styles.fieldError}>{fieldErrors.studentId}</Text> : null}

              <TouchableOpacity style={styles.button} onPress={handleValidateId} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify ID</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 2 && (
            <View>
              <Text style={styles.label}>ENTER 6-DIGIT OTP</Text>
              <View style={[styles.inputContainer, fieldErrors.otp && styles.inputContainerError]}>
                <Ionicons name="keypad-outline" size={20} color={fieldErrors.otp ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={Colors.slate400}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    clearFieldError('otp');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {fieldErrors.otp ? <Text style={styles.fieldError}>{fieldErrors.otp}</Text> : null}

              <Text style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter_500Medium', marginTop: 4, marginBottom: 15, lineHeight: 16 }}>
                🛡️ Check your registered phone ending in {studentPhone ? studentPhone.slice(-4) : '****'} for the SMS OTP code. Do not share your OTP with anyone.
              </Text>

              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify OTP Code</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.resendText}>Resend Activation Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Password Setup */}
          {step === 3 && (
            <View>
              <Text style={styles.label}>CREATE PASSWORD</Text>
              <View style={[styles.inputContainer, fieldErrors.password && styles.inputContainerError]}>
                <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.password ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
                  placeholderTextColor={Colors.slate400}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearFieldError('password');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.slate400} />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputContainer, fieldErrors.confirmPassword && styles.inputContainerError]}>
                <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.confirmPassword ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Verify password"
                  placeholderTextColor={Colors.slate400}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearFieldError('confirmPassword');
                  }}
                  secureTextEntry={!showPassword}
                />
              </View>
              {fieldErrors.confirmPassword ? <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text> : null}

              <TouchableOpacity style={styles.button} onPress={handleActivateAccount} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Activate Account</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already registered? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
        <SuccessToast ref={toastRef} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    width: 40,
  },
  logoWrapper: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  appName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  progressDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 32,
  },
  progressDotPassed: {
    backgroundColor: '#93C5FD',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 40,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
  },
  noticeSuspended: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeBanned: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  noticeNotFound: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  noticeError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  noticeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  noticeIconSuspended: {
    backgroundColor: '#FEF3C7',
  },
  noticeIconBanned: {
    backgroundColor: '#FEE2E2',
  },
  noticeIconNotFound: {
    backgroundColor: '#DBEAFE',
  },
  noticeIconError: {
    backgroundColor: '#FEE2E2',
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  noticeTitleSuspended: {
    color: '#92400E',
  },
  noticeTitleBanned: {
    color: '#991B1B',
  },
  noticeTitleNotFound: {
    color: '#1E40AF',
  },
  noticeTitleError: {
    color: '#991B1B',
  },
  noticeMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 20,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.slate400,
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputContainerError: {
    borderColor: '#F87171',
    marginBottom: 6,
  },
  fieldError: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 14,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate900,
  },
  button: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  resendBtn: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 18,
  },
  loginText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate500,
  },
  loginLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});
