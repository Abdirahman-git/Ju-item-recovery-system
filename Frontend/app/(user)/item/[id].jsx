import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Linking, Alert, Platform, StatusBar, ActivityIndicator
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getMatchesForItem } from '../../../src/services/supabase';
import { getConfidenceLabel } from '../../../src/utils/matchItems';
import { readItemTimeField } from '../../../src/utils/itemTimeUtils';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const { width } = Dimensions.get('window');

const LOST_COLOR = '#1D4ED8';
const FOUND_COLOR = '#10B981';
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const BG_MAIN = '#F4F7FA';
const PRIMARY_MATCH = '#1E40AF';

export default function ItemDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    if (data) {
      try {
        setItem(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse item data:", e);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!item?.id) return;
    const isLost = item.type === 'LOST' || item.hasOwnProperty('ownerName') || item.hasOwnProperty('dateLost');
    const type = isLost ? 'lost' : 'found';
    if (item.is_approved === false) return;

    const loadMatches = async () => {
      setMatchesLoading(true);
      try {
        const results = await getMatchesForItem(item.id, type);
        setMatches(results || []);
      } catch (e) {
        console.warn('Failed to load matches:', e);
      } finally {
        setMatchesLoading(false);
      }
    };
    loadMatches();
  }, [item]);

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  const isLost = item.type === 'LOST' || item.hasOwnProperty('ownerName') || item.hasOwnProperty('dateLost');
  const themeColor = isLost ? LOST_COLOR : FOUND_COLOR;
  const lightThemeColor = isLost ? '#EFF6FF' : '#D1FAE5';

  const personName = isLost ? item.ownerName : item.finderName;
  const itemDate = isLost ? item.dateLost : item.dateFound;
  const itemTime = isLost
    ? (readItemTimeField(item, 'lost') || 'Not specified')
    : (readItemTimeField(item, 'found') || 'Not specified');

  const getPhoneNumber = () => {
    if (item.phnum && item.phnum !== 'N/A') return item.phnum;
    if (item.phone && item.phone !== 'N/A') return item.phone;
    return '+252612345678';
  };

  const handleCall = () => Linking.openURL(`tel:${getPhoneNumber()}`);
  const handleSMS = () => Linking.openURL(`sms:${getPhoneNumber()}`);

  const DetailRow = ({ icon, label, value }) => (
    <View style={styles.rowContainer}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconCircle, { backgroundColor: lightThemeColor, borderColor: themeColor + '20' }]}>
          <Ionicons name={icon} size={22} color={themeColor} />
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={SLATE_900} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Image source={JU_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitleText}>Item Details</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={SLATE_900} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {/* ── IMAGE ── */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.imageWrapper}>
          {item.imageURI ? (
            <Image source={{ uri: item.imageURI }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <MaterialCommunityIcons name="image-off-outline" size={48} color={SLATE_400} />
            </View>
          )}
          <View style={[styles.floatingBadge, { backgroundColor: lightThemeColor }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color={themeColor} style={{ marginRight: 6 }} />
            <Text style={[styles.floatingBadgeText, { color: themeColor }]}>{isLost ? 'LOST' : 'FOUND'}</Text>
          </View>
        </Animated.View>

        <View style={styles.contentPadding}>
          {/* ── CATEGORY & TITLE ── */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.titleSection}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category || 'GENERAL'}</Text>
            </View>
            <Text style={styles.titleText}>{item.itemName}</Text>
          </Animated.View>

          {/* ── DETAILS LIST ── */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.listCard}>
            <DetailRow icon="document-text-outline" label="Description" value={item.description || "No description provided."} />
            <DetailRow icon="location-outline" label="Address" value={item.location} />
            <DetailRow icon="calendar-outline" label={isLost ? 'Date Lost' : 'Date Found'} value={itemDate} />
            <DetailRow icon="time-outline" label={isLost ? 'Time Lost' : 'Time Found'} value={itemTime} />

            <View style={styles.rowContainer}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: lightThemeColor, borderColor: themeColor + '20' }]}>
                  <Ionicons name="person-outline" size={22} color={themeColor} />
                </View>
              </View>
              <View style={[styles.rowRight, { borderBottomWidth: 0 }]}>
                <Text style={styles.rowLabel}>{isLost ? 'Owner' : 'Finder'}</Text>
                <Text style={[styles.rowValue, { color: themeColor, fontWeight: '800' }]}>{personName}</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── POSSIBLE MATCHES ── */}
          {(matchesLoading || matches.length > 0) && (
            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.matchesSection}>
              <View style={styles.matchesHeader}>
                <MaterialCommunityIcons name="auto-fix" size={20} color={PRIMARY_MATCH} />
                <Text style={styles.matchesTitle}>Possible Matches</Text>
              </View>
              {matchesLoading ? (
                <ActivityIndicator color={PRIMARY_MATCH} style={{ marginVertical: 16 }} />
              ) : (
                matches.slice(0, 3).map((m) => (
                  <TouchableOpacity
                    key={String(m.id)}
                    style={styles.matchCard}
                    activeOpacity={0.9}
                    onPress={() => router.push({
                      pathname: '/(user)/matches/compare',
                      params: { matchData: JSON.stringify(m) },
                    })}
                  >
                    <View style={styles.matchCardLeft}>
                      {m.oppositeItem?.imageURI ? (
                        <Image source={{ uri: m.oppositeItem.imageURI }} style={styles.matchThumb} />
                      ) : (
                        <View style={styles.matchThumbPlaceholder}>
                          <Ionicons name="cube-outline" size={20} color={SLATE_400} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matchScore}>{m.score}% · {getConfidenceLabel(m.score)}</Text>
                        <Text style={styles.matchName} numberOfLines={1}>{m.oppositeItem?.itemName}</Text>
                        <Text style={styles.matchMeta} numberOfLines={1}>{m.oppositeItem?.location}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={SLATE_400} />
                  </TouchableOpacity>
                ))
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.bottomBarWrapper}>
        <Text style={styles.contactHint}>CONTACT {isLost ? 'OWNER' : 'FINDER'} TO RETURN ITEM</Text>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: themeColor }]} onPress={handleCall}>
            <Feather name="phone-call" size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.secondaryActionBtn, { borderColor: themeColor }]} onPress={handleSMS}>
            <Feather name="message-square" size={20} color={themeColor} style={{ marginRight: 10 }} />
            <Text style={[styles.actionBtnText, { color: themeColor }]}>SMS</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MAIN },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_MAIN },
  loadingText: { color: SLATE_500, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 45 : 55,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    zIndex: 10
  },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 22, height: 22, marginRight: 8 },
  headerTitleText: { fontSize: 18, fontWeight: '900', color: '#1E40AF', letterSpacing: 0.5 },
  imageWrapper: {
    width: '100%', height: 280,
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
    backgroundColor: '#FFF', overflow: 'hidden',
    marginBottom: 20
  },
  heroImage: { width: '100%', height: '100%' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' },
  floatingBadge: {
    position: 'absolute', top: 20, left: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25,
    backgroundColor: '#FFF',
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
        android: { elevation: 4 }
    })
  },
  floatingBadgeText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  contentPadding: { paddingHorizontal: 20 },
  titleSection: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  categoryPill: { backgroundColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  categoryPillText: { fontSize: 12, fontWeight: '900', color: SLATE_600, letterSpacing: 1, textTransform: 'uppercase' },
  titleText: { fontSize: 32, fontWeight: '900', color: SLATE_900, lineHeight: 38, textAlign: 'center' },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
        ios: { shadowColor: '#1E293B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20 },
        android: { elevation: 8 }
    })
  },
  rowContainer: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20 },
  rowLeft: { width: 60, alignItems: 'center', paddingTop: 18 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rowRight: { flex: 1, paddingVertical: 20, paddingRight: 10, borderBottomWidth: 1.5, borderBottomColor: '#F4F7FA' },
  rowLabel: { fontSize: 11, fontWeight: '800', color: SLATE_400, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  rowValue: { fontSize: 16, fontWeight: '600', color: SLATE_800, lineHeight: 24 },
  matchesSection: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  matchesTitle: { fontSize: 16, fontWeight: '900', color: SLATE_900 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  matchCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchThumb: { width: 48, height: 48, borderRadius: 12 },
  matchThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScore: { fontSize: 11, fontWeight: '800', color: PRIMARY_MATCH, marginBottom: 2 },
  matchName: { fontSize: 14, fontWeight: '800', color: SLATE_800 },
  matchMeta: { fontSize: 11, color: SLATE_500, marginTop: 2 },
  bottomBarWrapper: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFF', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 35,
    borderTopLeftRadius: 35, borderTopRightRadius: 35,
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.08, shadowRadius: 20 },
        android: { elevation: 15 }
    })
  },
  contactHint: { fontSize: 11, color: SLATE_400, textAlign: 'center', marginBottom: 15, fontWeight: '800', letterSpacing: 1 },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    flex: 0.47, height: 62, borderRadius: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  secondaryActionBtn: { backgroundColor: '#FFF', borderWidth: 2 },
  actionBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
});
