import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import SuccessToast from '../../src/components/SuccessToast';
import { BACKEND_URL } from '../../src/config/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toastRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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

  const handleSendResetOtp = async () => {
    if (!studentId.trim()) {
      setFieldErrors({ studentId: 'Please enter your ID.' });
      clearNotice();
      return;
    }

    setFieldErrors({});
    clearNotice();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim().toUpperCase() }),
      });
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Could not send reset code.');
      }

      if (resData.email) setEmail(resData.email);
      if (resData.phone) setPhone(resData.phone);
      const masked = resData.phone || 'your phone';
      toastRef.current?.show('Reset code sent', `Check your phone ending in ${masked.slice(-4)}`, 'success');
      goToStep(2);
    } catch (err) {
      const message =
        err.message === 'Network request failed'
          ? 'Cannot reach backend. Ensure backend is running and phone is on the same WiFi.'
          : err.message || 'Request failed';

      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no user')) {
        setFieldErrors({ studentId: message });
        setInlineNotice({
          type: 'not_found',
          title: 'Account not found',
          message,
        });
      } else {
        setInlineNotice({
          type: 'error',
          title: 'Reset failed',
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearNotice();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim().toUpperCase() }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Could not resend code.');

      if (resData.phone) setPhone(resData.phone);
      const masked = resData.phone || phone || 'your phone';
      toastRef.current?.show('Code resent', `Check your phone ending in ${masked.slice(-4)}`, 'success');
    } catch (err) {
      setInlineNotice({
        type: 'error',
        title: 'Resend failed',
        message: err.message || 'Could not resend code.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setFieldErrors({ otp: 'Please enter the 6-digit code.' });
      clearNotice();
      return;
    }

    if (otp.trim().length < 6) {
      setFieldErrors({ otp: 'Enter the full 6-digit code from SMS.' });
      clearNotice();
      return;
    }

    setFieldErrors({});
    clearNotice();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          phone: phone,
          otp: otp.trim(),
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Incorrect code.');
      toastRef.current?.show('Code verified', 'Set your new password.', 'success');
      goToStep(3);
    } catch (err) {
      setFieldErrors({ otp: err.message || 'Incorrect code.' });
      setInlineNotice({
        type: 'error',
        title: 'Verification failed',
        message: err.message || 'The code is incorrect or has expired.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
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
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          phone: phone,
          password,
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Could not reset password.');

      toastRef.current?.show('Password updated', 'You can sign in now.', 'success');
      setTimeout(() => router.replace('/(auth)/login'), 2200);
    } catch (err) {
      setInlineNotice({
        type: 'error',
        title: 'Reset failed',
        message: err.message || 'Could not reset password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    1: 'Forgot Password',
    2: 'Verify Code',
    3: 'New Password',
  };

  const subtitles = {
    1: 'Enter your ID. We will send a reset code to your registered phone via SMS.',
    2: 'Enter the 6-digit code sent to your registered phone.',
    3: 'Choose a new password for your account.',
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step > 1 ? goToStep(step - 1) : router.back())}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{titles[step]}</Text>
        <Text style={styles.subtitle}>{subtitles[step]}</Text>

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

          {step === 1 && (
            <View>
              <Text style={styles.label}>ID NUMBER</Text>
              <View style={[styles.inputContainer, fieldErrors.studentId && styles.inputContainerError]}>
                <Ionicons name="id-card-outline" size={20} color={fieldErrors.studentId ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="CS1300648"
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

              <TouchableOpacity style={styles.button} onPress={handleSendResetOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.label}>6-DIGIT CODE</Text>
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

              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={loading}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <View style={[styles.inputContainer, fieldErrors.password && styles.inputContainerError]}>
                <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.password ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor={Colors.slate400}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearFieldError('password');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.slate400}
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputContainer, fieldErrors.confirmPassword && styles.inputContainerError]}>
                <Ionicons name="lock-closed-outline" size={20} color={fieldErrors.confirmPassword ? '#DC2626' : Colors.slate400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
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

              <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backToLogin}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
        <SuccessToast ref={toastRef} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: { padding: 8, marginLeft: -8, width: 40 },
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
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 8,
    marginBottom: 24,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.slate400,
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 18,
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
  icon: { marginRight: 10 },
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
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  backToLogin: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 20,
  },
});
