import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, resolveReporterPhone } from '../../src/services/supabase';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');
import SuccessToast from '../../src/components/SuccessToast';
import { showAppError, showAppValidation } from '../../src/utils/appAlert';
import { useRef, useEffect } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toastRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('showLogoutToast').then(val => {
      if (val === 'true') {
        toastRef.current?.show('Logged Out', 'Successfully signed out of your account.');
        AsyncStorage.removeItem('showLogoutToast');
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      showAppValidation('Please enter your ID and Password.', 'Missing fields');
      return;
    }

    setLoading(true);
    try {
      const studentId = identifier.trim();

      // 1. Manual lookup in public.users (handles case-insensitive Student/Admin IDs)
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .or(`student_id.eq.${studentId.toUpperCase()},student_id.eq.${studentId.toLowerCase()}`)
        .limit(1);

      if (dbError) throw dbError;

      if (!userData || userData.length === 0) {
        throw new Error('Account not found. Please register first.');
      }

      const userRecord = userData[0];

      // 2. Check Password manually
      if (userRecord.password !== password) {
        throw new Error('Incorrect Password.');
      }

      // 3. Save session (phone from users table, or student_directory fallback)
      const sessionPhone = await resolveReporterPhone({
        email: userRecord.email,
        name: userRecord.name,
        studentId: userRecord.student_id,
        usersPhone: userRecord.phone,
      });

      await AsyncStorage.setItem('userSession', JSON.stringify({
        email: userRecord.email,
        role: userRecord.role,
        isLoggedIn: true,
        userName: userRecord.name,
        studentId: userRecord.student_id,
        phone: sessionPhone || userRecord.phone || '',
      }));

      await AsyncStorage.setItem('showLoginToast', 'true');

      if (userRecord.role === 'admin') {
        router.replace('/(admin)/DashBoard');
      } else {
        router.replace('/(user)/DashBoard');
      }

    } catch (err) {
      showAppError('Login failed', err.message);
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
        <Text style={styles.label}>ID NUMBER</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your Student ID (e.g. CS-123)"
            placeholderTextColor={Colors.slate400}
            value={identifier}
            onChangeText={setIdentifier}
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
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
