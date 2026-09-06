import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  useWindowDimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const ONBOARDING_1 = require('../../assets/images/onboarding_1.png');
const ONBOARDING_2 = require('../../assets/images/onboarding_2.png');
const ONBOARDING_3 = require('../../assets/images/onboarding_3.png');

const SLIDES = [
  {
    id: '1',
    image: ONBOARDING_1,
    title: 'Find What You Lost',
    description:
      'Lost something on campus? Report it quickly and let the LOFO community help you find it.',
    buttonText: 'Next  →',
  },
  {
    id: '2',
    image: ONBOARDING_2,
    title: 'Help Return Lost Items',
    description:
      'Found something that belongs to someone else? Report it on LOFO and help reunite it with its owner.',
    buttonText: 'Next  →',
  },
  {
    id: '3',
    image: ONBOARDING_3,
    title: 'Reconnect With Your Belongings',
    description:
      'Browse reported items, check details, and recover your lost belongings safely within Jazeera University.',
    buttonText: 'Get Started  →',
  },
];

function FloatingIllustration({ source, size, active }) {
  const float = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.025,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();
    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [float, scale]);

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, enter, source]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const enterY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <Animated.View
      style={[
        styles.illustrationCard,
        {
          width: size,
          height: size,
          opacity: enter,
          transform: [{ translateY: Animated.add(translateY, enterY) }, { scale }],
        },
      ]}
    >
      <Image source={source} style={styles.illustrationImage} resizeMode="cover" />
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {
      // Continue anyway
    }
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  const handleDotPress = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const onMomentumScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex >= 0 && newIndex < SLIDES.length) {
      setCurrentIndex(newIndex);
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const imageSize = Math.min(width * 0.88, height * 0.42, 360);

  const renderSlide = ({ item, index }) => (
    <View style={[styles.slideContainer, { width }]}>
      <FloatingIllustration
        source={item.image}
        size={imageSize}
        active={index === currentIndex}
      />

      <View style={styles.textWrapper}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            style={styles.navIconButton}
            onPress={handlePrev}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.slate700} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}

        {!isLastSlide ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleFinish}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.flatList}
        extraData={currentIndex}
      />

      <View style={styles.footer}>
        <View style={styles.paginationContainer}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDotPress(index)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.actionButtonText}>{SLIDES[currentIndex].buttonText}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    paddingBottom: 8,
    minHeight: 48,
  },
  navIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 36,
    height: 36,
  },
  skipButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate600,
    letterSpacing: 0.2,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  illustrationCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: '#EEF5FF',
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26, 86, 219, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#1A56DB',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 22,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 23,
    fontFamily: 'Poppins_700Bold',
    color: '#0A2540',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 32,
    paddingTop: 12,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#E2E8F0',
  },
  actionButton: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1A56DB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
