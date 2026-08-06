import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { loginViaBackend } from '../../src/services/supabase';
import { ACCOUNT_SUSPENDED_MESSAGE } from '../../src/utils/userAccess';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');
import SuccessToast from '../../src/components/SuccessToast';
import { showAppValidation } from '../../src/utils/appAlert';
import { useRef, useEffect } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inlineNotice, setInlineNotice] = useState(null);
  const toastRef = useRef(null);

  const clearNotice = () => setInlineNotice(null);

  useEffect(() => {
    AsyncStorage.getItem('showLogoutToast').then(val => {
      if (val === 'true') {
        toastRef.current?.show('Logged Out', 'Successfully signed out of your account.');
        AsyncStorage.removeItem('showLogoutToast');
      }
    });
    AsyncStorage.getItem('showSuspendedToast').then(val => {
      if (val === 'true') {
        setInlineNotice({
          type: 'suspended',
          title: 'Account not active',
          message: ACCOUNT_SUSPENDED_MESSAGE,
        });
        AsyncStorage.removeItem('showSuspendedToast');
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      showAppValidation('Please enter your ID and Password.', 'Missing fields');
      return;
    }

    setLoading(true);
    clearNotice();
    try {
      const session = await loginViaBackend({
        identifier: identifier.trim(),
        password,
      });

      await AsyncStorage.setItem('userSession', JSON.stringify({
        email: session.email,
        role: session.role,
        isLoggedIn: true,
        userName: session.userName,
        studentId: session.studentId,
        phone: session.phone || '',
        adminToken: session.adminToken || null,
      }));

      await AsyncStorage.setItem('showLoginToast', 'true');

      if (session.role === 'admin') {
        router.replace('/(admin)/DashBoard');
      } else {
        router.replace('/(user)/DashBoard');
      }
    } catch (err) {
      if (err.code === 'ACCOUNT_SUSPENDED' || err.message === ACCOUNT_SUSPENDED_MESSAGE) {
        setInlineNotice({
          type: 'suspended',
          title: 'Account not active',
          message: err.message || ACCOUNT_SUSPENDED_MESSAGE,
        });
      } else if (err.code === 'ACCOUNT_BANNED') {
        setInlineNotice({
          type: 'banned',
          title: "You're banned",
          message: err.message,
        });
      } else if (err.code === 'ACCOUNT_NOT_FOUND') {
        setInlineNotice({
          type: 'not_found',
          title: 'Account not found',
          message: err.message,
        });
      } else if (err.code === 'WRONG_PASSWORD') {
        setInlineNotice({
          type: 'error',
          title: 'Incorrect password',
          message: err.message,
        });
      } else {
        setInlineNotice({
          type: 'error',
          title: 'Sign in unsuccessful',
          message: err.message || 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* JU Logo top */}
      <View style={styles.logoContainer}>
        <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>JU Item Recovery System</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Welcome{'\n'}Back.</Text>
      </View>

      <View style={styles.card}>
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

        <Text style={styles.label}>ID NUMBER</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your Student ID (e.g. CS-123)"
            placeholderTextColor={Colors.slate400}
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              clearNotice();
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Ionicons name="id-card-outline" size={20} color={Colors.slate400} />
        </View>

        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.slate400}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearNotice();
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

        <TouchableOpacity
          style={styles.forgotLinkWrap}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  appName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: Colors.slate900,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
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
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate900,
  },
  forgotLinkWrap: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  button: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate500,
  },
  signupLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  }
});
