import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Linking, Platform, StatusBar, ActivityIndicator
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { readItemTimeField } from '../../../src/utils/itemTimeUtils';
import {
  submitItemClaim,
  getUserPendingClaimForItem,
  CLAIM_ALREADY_PENDING_MSG,
  supabase,
  normalizeItemRow,
} from '../../../src/services/supabase';
import SuccessToast from '../../../src/components/SuccessToast';
import ItemClaimFormModal from '../../../src/components/ItemClaimFormModal';
import { showAppError } from '../../../src/utils/appAlert';
import {
  isLostItemRecord,
  isOwnReportedItem,
  canShowThisIsMine,
  canShowNotMine,
  shouldShowClaimSection,
  pendingClaimStorageKey,
  dismissStorageKey,
} from '../../../src/utils/itemClaimUi';
import { isSecureListing } from '../../../src/utils/itemStatus';
import { getSecureItemDisplay } from '../../../src/utils/secureItemDisplay';

const { width, height } = Dimensions.get('window');

const LOST_COLOR = '#3B82F6'; // Beautiful bright blue
const FOUND_COLOR = '#10B981'; // Beautiful emerald green
const SECURE_COLOR = '#D97706'; // Amber orange
const BRAND_PRIMARY = '#1A56DB'; // Jazeera Blue

const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';

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
        setClaimDismissed(false);
      } catch (e) {
        console.error("Failed to parse item data:", e);
      }
    }
  }, [data]);

  // "Not mine" only hides claim actions for the current visit.
  // Reopening / returning to the item always brings Not mine + Claim Item back.
  useFocusEffect(
    React.useCallback(() => {
      setClaimDismissed(false);
      if (!item?.id) return undefined;
      AsyncStorage.removeItem(dismissStorageKey(item)).catch(() => {});
      return undefined;
    }, [item?.id, item?.type])
  );

  useEffect(() => {
    if (!item?.id || !userEmail) return;

    let cancelled = false;
    const pendingKey = pendingClaimStorageKey(item);
    const type = isLostItemRecord(item) ? 'lost' : 'found';

    (async () => {
      try {
        // Server is source of truth — must match item_type (lost vs found ids can collide).
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
        // Network fallback only — never invent Pending from a wrong-item cache.
        const local = await AsyncStorage.getItem(pendingKey);
        if (!cancelled) setClaimPending(local === '1');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.type, userEmail]);

  useEffect(() => {
    if (!item?.id || !isSecureListing(item)) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('found_items_public_feed')
          .select('*')
          .eq('id', item.id)
          .maybeSingle();

        if (cancelled || error || !data) return;
        setItem((current) =>
          normalizeItemRow({
            ...(current || {}),
            ...data,
            type: current?.type || 'FOUND',
          })
        );
      } catch {
        // Keep navigation payload if refresh fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  const isLost = isLostItemRecord(item);
  const isSecure = isSecureListing(item);
  const themeColor = isSecure ? SECURE_COLOR : isLost ? LOST_COLOR : FOUND_COLOR;
  const secureDisplay = isSecure ? getSecureItemDisplay(item) : null;

  const isOwnItem = isOwnReportedItem(item, userEmail, userName);
  const showClaimSection =
    !isOwnItem && // Ensure reporter can never see the claim section
    !claimDismissed &&
    shouldShowClaimSection(item, userEmail, userName) &&
    (canShowThisIsMine(item, userEmail, userName) || canShowNotMine(item, userEmail, userName));

  const showThisIsMine = canShowThisIsMine(item, userEmail, userName);
  const showNotMine = canShowNotMine(item, userEmail, userName);

  const personName = isSecure ? 'Campus Security' : isLost ? item.ownerName : item.finderName;
  const itemDate = isLost ? item.dateLost : item.dateFound;
  const itemTime = isLost
    ? (readItemTimeField(item, 'lost') || 'Not specified')
    : (readItemTimeField(item, 'found') || 'Not specified');
  const displayDescription = isSecure
    ? secureDisplay.notice
    : (item.description || 'No description provided.');
  const displayLocation = isSecure
    ? (item.security_location || item.location || 'Campus Security Office')
    : item.location;

  const getPhoneNumber = () => {
    if (item.phnum && item.phnum !== 'N/A') return item.phnum;
    if (item.phone && item.phone !== 'N/A') return item.phone;
    return '+252612345678';
  };

  const handleCall = () => Linking.openURL(`tel:${getPhoneNumber()}`);

  const itemType = isLost ? 'lost' : 'found';

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
      toastRef.current?.show('Sent to admin', 'Track status in My Requests.', 'success');
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

  const handleNotMine = () => {
    // Temporary for this open only — claim buttons return when you reopen.
    setClaimDismissed(true);
    toastRef.current?.show(
      'Dismissed',
      'Call Reporter stays available. Reopen to claim later.',
      'success'
    );
  };

  const DetailRow = ({ icon, label, value, isLast }) => (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <View style={styles.detailLabelContainer}>
        <View style={[styles.detailIconBox, { backgroundColor: themeColor + '10' }]}>
          <Ionicons name={icon} size={18} color={themeColor} />
        </View>
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );

  const displayName = isSecure ? secureDisplay.name : item.itemName;
  const displayCategory = item.category || 'GENERAL';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* ── HEADER BUTTONS (FLOATING) ── */}
      <View style={styles.headerFloating}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* ── IMAGE SECTION ── */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.imageWrapper}>
          {!isSecure && item.imageURI ? (
            <Image source={{ uri: item.imageURI }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder, isSecure && styles.securePlaceholder]}>
              {isSecure ? (
                <View style={styles.secureBadgeBig}>
                  <MaterialCommunityIcons name="shield-alert" size={72} color={SECURE_COLOR} />
                  <Text style={styles.secureMarkText}>SECURE HOLD</Text>
                </View>
              ) : (
                <MaterialCommunityIcons name="image-off-outline" size={64} color="#CBD5E1" />
              )}
            </View>
          )}
        </Animated.View>

        {/* ── BOTTOM SHEET CONTENT ── */}
        <View style={styles.bottomSheetCard}>
          {/* Drag Indicator */}
          <View style={styles.dragIndicatorContainer}>
            <View style={styles.dragIndicator} />
          </View>

          <Animated.View entering={FadeInUp.delay(150).springify()}>
            {/* Title & Category Row */}
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.titleText} numberOfLines={2}>{displayName}</Text>
                <View style={styles.categoryBadge}>
                  <MaterialCommunityIcons name="tag-outline" size={12} color="#64748B" />
                  <Text style={styles.categoryText}>{displayCategory}</Text>
                </View>
              </View>
            </View>

            {/* Reporter Info Card */}
            <View style={styles.reporterCard}>
              <View style={styles.reporterLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: themeColor + '20' }]}>
                  <Ionicons name="person" size={16} color={themeColor} />
                </View>
                <View>
                  <Text style={styles.reportedByLabel}>Reported by</Text>
                  <Text style={styles.reporterName}>{personName}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: themeColor + '12', borderColor: themeColor + '25' }]}>
                <View style={[styles.statusDot, { backgroundColor: themeColor }]} />
                <Text style={[styles.statusBadgeText, { color: themeColor }]}>
                  {isSecure ? 'SECURE' : isLost ? 'LOST' : 'FOUND'}
                </Text>
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>
                  {displayDescription}
                </Text>
                {isSecure && (
                  <View style={styles.secureNoticeBox}>
                    <Ionicons name="information-circle" size={16} color={SECURE_COLOR} />
                    <Text style={styles.secureHintText}>
                      Photo and contact details are hidden for security. Please claim or visit Campus Security.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Item Details</Text>
              <View style={styles.detailsCard}>
                <DetailRow icon="location-outline" label="Location" value={displayLocation} />
                <DetailRow icon="calendar-outline" label="Date" value={itemDate} />
                <DetailRow icon="time-outline" label="Time" value={itemTime} isLast={!isSecure} />
                {isSecure && <DetailRow icon="shield-checkmark-outline" label="Security" value="Campus Security Office" isLast />}
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* ── FIXED BOTTOM ACTION BAR ── */}
      <View style={styles.bottomBar}>
        {isOwnItem ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: SLATE_400 }]} disabled>
            <Ionicons name="shield-checkmark" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Your Report</Text>
          </TouchableOpacity>
        ) : isSecure ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#D97706' }]} disabled>
            <Ionicons name="shield" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Secure Hold</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomBarStack}>
            {claimPending ? (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.bottomBarTopAction, { backgroundColor: '#D97706' }]}
                onPress={() => router.push('/(user)/MyRequests')}
              >
                <Ionicons name="time" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Pending — View Requests</Text>
              </TouchableOpacity>
            ) : showClaimSection ? (
              <View style={styles.bottomBarActions}>
                {showNotMine && (
                  <TouchableOpacity onPress={handleNotMine} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Not mine</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                  onPress={() => setClaimModalVisible(true)}
                >
                  <Ionicons name="lock-closed" size={16} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Claim Item</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Call stays in place on every visit for non-own listings */}
            <TouchableOpacity style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#FFF" style={styles.btnIcon} />
              <Text style={styles.contactBtnText}>Call Reporter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ItemClaimFormModal
        visible={claimModalVisible}
        onClose={() => setClaimModalVisible(false)}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { color: SLATE_500, fontWeight: '600', marginTop: 12 },
  
  headerFloating: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 50,
    left: 20,
    zIndex: 100,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // Premium soft shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  mainScroll: { flex: 1 },
  imageWrapper: {
    width: '100%',
    height: height * 0.42,
    backgroundColor: '#F8FAFC',
  },
  heroImage: { width: '100%', height: '100%' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  securePlaceholder: { backgroundColor: '#FEF3C7' },
  secureBadgeBig: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secureMarkText: {
    fontSize: 16,
    fontWeight: '800',
    color: SECURE_COLOR,
    letterSpacing: 1.5,
  },

  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 24,
    minHeight: height * 0.6,
    // Soft shadow for bottom sheet card
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 5,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  dragIndicator: {
    width: 36,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },

  titleRow: {
    marginBottom: 16,
  },
  titleContainer: {
    gap: 8,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: SLATE_900,
    lineHeight: 32,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  reporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reporterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportedByLabel: {
    fontSize: 11,
    color: SLATE_500,
    fontWeight: '600',
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '700',
    color: SLATE_900,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SLATE_900,
    marginBottom: 12,
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    // Subtle shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: SLATE_600,
  },
  secureNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  secureHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#B45309',
    fontWeight: '600',
  },

  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    // Subtle shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: SLATE_500,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: SLATE_900,
    fontWeight: '700',
    textAlign: 'right',
    marginLeft: 16,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  bottomBarStack: {
    width: '100%',
    gap: 10,
  },
  bottomBarTopAction: {
    flex: 0,
    width: '100%',
  },
  bottomBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  contactBtn: {
    width: '100%',
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  callBtn: {
    backgroundColor: '#10B981',
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnIcon: {
    marginTop: -1,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: BRAND_PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: SLATE_500,
    fontSize: 14,
    fontWeight: '600',
  },
});
