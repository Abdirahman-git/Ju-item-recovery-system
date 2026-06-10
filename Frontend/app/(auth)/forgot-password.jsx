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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import SuccessToast from '../../src/components/SuccessToast';
import { showAppError, showAppValidation } from '../../src/utils/appAlert';
import { BACKEND_URL } from '../../src/config/api';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toastRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendResetOtp = async () => {
    if (!studentId.trim()) {
      showAppValidation('Enter your Student ID.');
      return;
    }

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
      toastRef.current?.show('Reset code sent', 'Check the email on your account.', 'success');
      setStep(2);
    } catch (err) {
      const message =
        err.message === 'Network request failed'
          ? 'Cannot reach backend. Ensure backend is running and phone is on the same WiFi.'
          : err.message || 'Request failed';
      showAppError('Reset failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim().toUpperCase() }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Could not resend code.');
      toastRef.current?.show('Code resent', 'Check your email again.', 'success');
    } catch (err) {
      showAppError('Resend failed', err.message || 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email.trim()) {
      showAppValidation('Enter the email on your account.');
      return;
    }
    if (otp.trim().length < 6) {
      showAppValidation('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Incorrect code.');
      toastRef.current?.show('Code verified', 'Set your new password.', 'success');
      setStep(3);
    } catch (err) {
      showAppError('Verification failed', err.message || 'Incorrect code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      showAppValidation('Fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      showAppValidation('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      showAppValidation('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Could not reset password.');

      toastRef.current?.show('Password updated', 'You can sign in now.', 'success');
      setTimeout(() => router.replace('/(auth)/login'), 2200);
    } catch (err) {
      showAppError('Reset failed', err.message || 'Could not reset password.');
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
    1: 'Enter your Student ID. We will send a reset code to the email on your account.',
    2: 'Enter the 6-digit code sent to your account email.',
    3: 'Choose a new password for your account.',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.logoWrapper}>
          <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>JU LOFO HUB</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

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

      <Text style={styles.title}>{titles[step]}</Text>
      <Text style={styles.subtitle}>{subtitles[step]}</Text>

      <View style={styles.card}>
        {step === 1 && (
          <View>
            <Text style={styles.label}>STUDENT ID</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="id-card-outline" size={20} color={Colors.slate400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="CS1300661"
                placeholderTextColor={Colors.slate400}
                value={studentId}
                onChangeText={setStudentId}
                autoCapitalize="characters"
              />
            </View>
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
            {email ? (
              <Text style={styles.emailHint}>Code sent to: {email}</Text>
            ) : null}

            <Text style={styles.label}>6-DIGIT CODE</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color={Colors.slate400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor={Colors.slate400}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

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
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.slate400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Colors.slate400}
                value={password}
                onChangeText={setPassword}
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

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.slate400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colors.slate400}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

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
  logoWrapper: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logo: { width: 32, height: 32 },
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
  progressDotActive: { backgroundColor: Colors.primary, width: 32 },
  progressDotPassed: { backgroundColor: '#93C5FD' },
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
  emailHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.slate500,
    marginBottom: 14,
    lineHeight: 18,
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
