import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JU_LOGO = require('../assets/images/jazeera_logo.png');

export default function SplashScreen() {
  const router = useRouter();
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 100,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    const checkAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const sessionData = await AsyncStorage.getItem('userSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.isLoggedIn) {
            if (session.role === 'admin') {
              router.replace('/(admin)/DashBoard');
            } else {
              router.replace('/(user)/DashBoard');
            }
            return;
          }
        }
        router.replace('/(auth)/login');
      } catch (e) {
        router.replace('/(auth)/login');
      }
    };

    checkAuth();
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Jazeera University Logo */}
        <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />

        <Text style={styles.appName}>JU-Item-Recovery-System</Text>
        <Text style={styles.tagline}>JAZEERA UNIVERSITY • DIGITAL CURATOR</Text>

        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>Initializing secure vault...</Text>
      </View>

      <Text style={styles.footerText}>LOST & FOUND INTELLIGENCE PLATFORM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate500,
    letterSpacing: 2,
    marginBottom: 60,
    textAlign: 'center',
  },
  progressContainer: {
    width: 160,
    height: 3,
    backgroundColor: Colors.slate300,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate400,
    fontStyle: 'italic',
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate300,
    letterSpacing: 1.5,
  },
});
