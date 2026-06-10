import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Linking, Platform, StatusBar
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { readItemTimeField } from '../../../src/utils/itemTimeUtils';
import {
  submitItemClaim,
  getUserPendingClaimForItem,
  CLAIM_ALREADY_PENDING_MSG,
} from '../../../src/services/supabase';
import SuccessToast from '../../../src/components/SuccessToast';
import ItemStatusBadge from '../../../src/components/ItemStatusBadge';
import ItemClaimFormModal from '../../../src/components/ItemClaimFormModal';
import { showAppError } from '../../../src/utils/appAlert';
import {
  isLostItemRecord,
  isOwnReportedItem,
  canShowThisIsMine,
  canShowNotMine,
  shouldShowClaimSection,
  dismissStorageKey,
  pendingClaimStorageKey,
} from '../../../src/utils/itemClaimUi';

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
const PRIMARY_ACTION = '#1E40AF';

export default function ItemDetailScreen() {
  const router = useRouter();
  const toastRef = useRef(null);
  const { data } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [claimDismissed, setClaimDismissed] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userSession').then((raw) => {
      if (!raw) return;
      const session = JSON.parse(raw);
      setUserName(session.userName || '');
      setUserEmail(session.email || '');
      setStudentId(session.student_id || session.studentId || '');
    });
  }, []);

  useEffect(() => {
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setItem(parsed);
        setClaimPending(false);
        AsyncStorage.getItem(dismissStorageKey(parsed)).then((v) => {
          setClaimDismissed(v === '1');
        });
      } catch (e) {
        console.error("Failed to parse item data:", e);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!item?.id || !userEmail) return;

    let cancelled = false;
    const pendingKey = pendingClaimStorageKey(item);
    const type = isLostItemRecord(item) ? 'lost' : 'found';

    (async () => {
      const local = await AsyncStorage.getItem(pendingKey);
      if (!cancelled && local === '1') setClaimPending(true);

      try {
        const row = await getUserPendingClaimForItem(item.id, type, userEmail);
        if (cancelled) return;
        if (row) {
          setClaimPending(true);
          await AsyncStorage.setItem(pendingKey, '1');
        } else {
          setClaimPending(false);
          await AsyncStorage.removeItem(pendingKey);
        }
      } catch (e) {
        console.warn('Could not check pending claim:', e?.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id, userEmail]);

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  const isLost = isLostItemRecord(item);
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

  const isOwnItem = isOwnReportedItem(item, userEmail, userName);
  const itemType = isLost ? 'lost' : 'found';
  const showThisIsMine = canShowThisIsMine(item, userEmail, userName);
  const showNotMine = canShowNotMine(item, userEmail, userName);
  const showClaimSection = shouldShowClaimSection(item, userEmail, userName, claimDismissed);

  const markClaimPending = async () => {
    setClaimPending(true);
    await AsyncStorage.setItem(pendingClaimStorageKey(item), '1');
  };

  const submitClaim = async (form) => {
    try {
      setSubmitting(true);
      if (!userEmail) {
        showAppError('Sign in required', 'Please log in again.');
        return;
      }
      if (claimPending) {
        setClaimModalVisible(false);
        toastRef.current?.show('Already sent', 'Admin is reviewing your request.', 'success');
        return;
      }
      await submitItemClaim(item, itemType, {
        description: form.description,
        claimerEmail: userEmail,
      });
      setClaimModalVisible(false);
      await markClaimPending();
      toastRef.current?.show('Sent to admin', 'Admin will review your request.', 'success');
    } catch (e) {
      const msg = e?.message || '';
      if (msg === CLAIM_ALREADY_PENDING_MSG || msg.includes('already sent')) {
        setClaimModalVisible(false);
        await markClaimPending();
        toastRef.current?.show('Already sent', 'Admin is reviewing your request.', 'success');
        return;
      }
      showAppError('Could not submit', msg || 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotMine = async () => {
    await AsyncStorage.setItem(dismissStorageKey(item), '1');
    setClaimDismissed(true);
    toastRef.current?.show('Dismissed', 'You can still contact the reporter below.', 'success');
  };

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
            <View style={styles.titleBadgeRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{item.category || 'GENERAL'}</Text>
              </View>
              <ItemStatusBadge item={item} compact />
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

          {showClaimSection && (
            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.claimSection}>
              <Text style={styles.claimTitle}>Ownership request</Text>
              {claimPending ? (
                <View style={styles.pendingBanner}>
                  <Ionicons name="time-outline" size={22} color="#B45309" />
                  <View style={styles.pendingBannerText}>
                    <Text style={styles.pendingTitle}>Request sent</Text>
                    <Text style={styles.pendingHint}>
                      Admin is reviewing your ownership request. You cannot send another one for this item.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.claimHint}>
                    If this item is yours, tell admin why. Use Not mine if it is not your item.
                  </Text>
                  <View style={styles.matchActions}>
                    {showThisIsMine ? (
                      <TouchableOpacity
                        style={[styles.matchClaimBtn, showNotMine && { flex: 1 }]}
                        onPress={() => setClaimModalVisible(true)}
                        disabled={submitting}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        <Text style={styles.matchClaimBtnText}>This is mine</Text>
                      </TouchableOpacity>
                    ) : null}
                    {showNotMine ? (
                      <TouchableOpacity
                        style={[styles.matchDismissBtn, showThisIsMine && { flex: 1 }]}
                        onPress={handleNotMine}
                        disabled={submitting}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#64748B" />
                        <Text style={styles.matchDismissBtnText}>Not mine</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR (hidden on your own report) ── */}
      {!isOwnItem && (
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
      )}

      <ItemClaimFormModal
        visible={claimModalVisible}
        onClose={() => !submitting && setClaimModalVisible(false)}
        onSubmit={submitClaim}
        submitting={submitting}
        initialName={userName}
        initialStudentId={studentId}
      />
      <SuccessToast ref={toastRef} />
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
  titleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  categoryPill: { backgroundColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
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
  claimSection: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  claimTitle: { fontSize: 16, fontWeight: '900', color: SLATE_900, marginBottom: 6 },
  claimHint: { fontSize: 12, color: SLATE_500, lineHeight: 18, marginBottom: 14 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBannerText: { flex: 1 },
  pendingTitle: { fontSize: 14, fontWeight: '900', color: '#92400E', marginBottom: 4 },
  pendingHint: { fontSize: 12, color: '#B45309', lineHeight: 18 },
  matchActions: { flexDirection: 'row', gap: 8 },
  matchClaimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PRIMARY_ACTION,
    paddingVertical: 10,
    borderRadius: 12,
  },
  matchClaimBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  matchDismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
  },
  matchDismissBtnText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
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
