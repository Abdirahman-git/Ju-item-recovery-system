import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated as RNAnimated, ActivityIndicator, Platform } from 'react-native';
import Animated, { FadeInDown, Layout, FadeInRight } from 'react-native-reanimated';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getAllLostItems, getAllFoundItems } from '../../../src/services/supabase';
import { Colors } from '../../../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import SuccessToast from '../../../src/components/SuccessToast';
import FeedItemCard from '../../../src/components/FeedItemCard';
import { useUserNotifications } from '../../../src/context/UserNotificationContext';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const BANNER_IMAGES = [
  require('../../../assets/images/dashboard_img1.png'),
  require('../../../assets/images/dashboard_img2.png'),
];

export default function DashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const toastRef = useRef(null);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const intervalRef = useRef(null);
  const { unreadCount: unreadNotifications, refresh: refreshNotifications } = useUserNotifications();

  const startBannerRotate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      rotateNext();
    }, 5000);
  };

  const rotateNext = () => {
    RNAnimated.sequence([
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    setBannerIndex(prev => (prev + 1) % BANNER_IMAGES.length);
  };

  const setManualBanner = (index) => {
    if (index === bannerIndex) return;

    RNAnimated.sequence([
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setBannerIndex(index);
    startBannerRotate();
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      // Temporary Cleanup for test data (skipped to avoid unnecessary DB load)

      const [lost, found] = await Promise.all([
        getAllLostItems(),
        getAllFoundItems()
      ]);

      const combined = [
        ...lost.map(i => ({ ...i, type: 'LOST', timeAgo: formatTimeAgo(i.created_at) })),
        ...found.map(i => ({ ...i, type: 'FOUND', timeAgo: formatTimeAgo(i.created_at) }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setItems(combined.slice(0, 10));
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('userSession').then((data) => {
        if (!data) return;
        const session = JSON.parse(data);
        const nameParts = session.userName ? session.userName.split(' ') : ['Student'];
        setUserName(nameParts[0]);
      });

      // Check for login toast
      AsyncStorage.getItem('showLoginToast').then((val) => {
        if (val === 'true') {
          toastRef.current?.show('Login Successful!', 'Welcome back to JU Item Recovery System.');
          AsyncStorage.removeItem('showLoginToast');
        }
      });

      fetchItems();
      refreshNotifications?.();
    }, [refreshNotifications])
  );

  useEffect(() => {
    startBannerRotate();
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header with JU Logo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E40AF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.headerUniversityName}>Jazeera University</Text>
            <Text style={styles.headerMotto}>
              Teach Me <Text style={styles.mottoHighlight1}>Goodness</Text>, {'\n'}
              <Text style={styles.mottoHighlight2}>Discipline</Text> and <Text style={styles.mottoHighlight3}>Knowledge</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/(user)/Notifications')}
          accessibilityLabel="Notifications inbox"
        >
          <Ionicons name="notifications-outline" size={24} color="#1E40AF" />
          {unreadNotifications > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadNotifications > 9 ? '9+' : String(unreadNotifications)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingLine1}>Hello, <Text style={styles.greetingHighlight}>Jazeera</Text></Text>
          <Text style={styles.greetingLine2}>
            <Text style={styles.greetingHighlight}>{userName || 'Student'} </Text>
            👋
          </Text>
        </View>

        <View style={styles.bannerContainer}>
          <RNAnimated.View style={{ opacity: fadeAnim }}>
            <Image
              source={BANNER_IMAGES[bannerIndex]}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </RNAnimated.View>
          <View style={styles.dotsContainer}>
            {BANNER_IMAGES.map((_, i) => (
              <TouchableOpacity
                key={`dot-${i}`}
                onPress={() => setManualBanner(i)}
                style={[styles.dot, i === bannerIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#EFF6FF' }]}
            onPress={() => router.push('/(user)/Lost')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="search-outline" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={[styles.actionTitle, { color: '#1E40AF' }]}>Report Lost</Text>
              <Text style={styles.actionSubtitle}>I lost something</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: '#F0FDF4' }]}
            onPress={() => router.push('/(user)/Found')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={[styles.actionTitle, { color: '#065F46' }]}>Report Found</Text>
              <Text style={styles.actionSubtitle}>I found something</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.sectionSubtitle}>Discover latest lost and found items</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(user)/AllItems')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#94A3B8" style={{ marginTop: 40 }} />
          ) : items.length > 0 ? (
            items.map((item, index) => (
              <FeedItemCard
                key={`${item.type}-${item.id}-${index}`}
                item={item}
                onPress={() => router.push({
                  pathname: `/(user)/item/${item.id}`,
                  params: { data: JSON.stringify(item) },
                })}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No recent items found.</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Image source={JU_LOGO} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.footerText}>© 2026 JAZEERA UNIVERSITY</Text>
          <Text style={styles.footerSubtext}>Digital • Lost & Found System</Text>
        </View>
      </ScrollView>

      <CustomBottomTab />
      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  headerLogo: {
    width: 48,
    height: 48,
    marginRight: 14,
  },
  headerUniversityName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  headerMotto: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    color: '#64748B',
    marginTop: -2,
    maxWidth: 220,
    lineHeight: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 10,
  },
  greetingContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
  greetingLine1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#64748B',
    marginBottom: 2,
  },
  greetingLine2: {
    fontFamily: 'Inter_900Black',
    fontSize: 34,
    color: '#0F172A',
    lineHeight: 40,
  },
  greetingHighlight: {
    color: Colors.primary,
  },
  mottoBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mottoLogoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mottoLogo: {
    width: 48,
    height: 48,
  },
  mottoTextContainer: {
    flex: 1,
  },
  mottoWelcome: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#3B82F6',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mottoUniversity: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFF',
    marginBottom: 4,
  },
  mottoTeachMe: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    color: '#FFF',
    lineHeight: 18,
  },
  mottoHighlight1: { color: '#3B82F6' },
  mottoHighlight2: { color: '#10B981' },
  mottoHighlight3: { color: '#F59E0B' },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  actionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  bannerContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 35,
    height: 220,
    backgroundColor: '#FFE4D6',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 22,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  feedContainer: {
    gap: 14,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardImagePlaceholder: {
    width: 95,
    height: 95,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholderWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securePlaceholder: { backgroundColor: '#FEF3C7' },
  secureMark: { fontSize: 36, fontWeight: '900', color: '#D97706', lineHeight: 40 },
  secureBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.95)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  secureBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  secureHoldOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  secureHoldOverlayText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  secureCategoryPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  secureCategoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  secureDashDesc: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2, marginBottom: 4, lineHeight: 16 },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadgeText: {
    color: '#1E40AF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  catWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#64748B',
  },
  footer: {
    marginTop: 60,
    alignItems: 'center',
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 30,
  },
  footerLogo: {
    width: 30,
    height: 30,
    marginBottom: 10,
    opacity: 0.5,
  },
  footerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  footerSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#CBD5E1',
    marginTop: 4,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
  }
});
