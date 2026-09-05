import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Platform, StatusBar, ActivityIndicator
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { readItemTimeField } from '../../../src/utils/itemTimeUtils';
import {
  submitOwnershipChallengeClaim,
  fetchPublicOwnershipChallenge,
  getUserPendingClaimForItem,
  getUserRejectedClaimForItem,
  reserveItemForClaim,
  releaseItemClaimReserve,
  CLAIM_ALREADY_PENDING_MSG,
  CLAIM_ALREADY_REJECTED_MSG,
  CHALLENGE_NOT_READY_MSG,
  ITEM_BEING_CLAIMED_MSG,
  supabase,
  normalizeItemRow,
} from '../../../src/services/supabase';
import { challengeResultLabel } from '../../../src/utils/ownershipChallenge';
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
  rejectedClaimStorageKey,
  dismissStorageKey,
  clearLegacySharedClaimFlags,
} from '../../../src/utils/itemClaimUi';
import { isSecureListing } from '../../../src/utils/itemStatus';
import { getSecureItemDisplay } from '../../../src/utils/secureItemDisplay';
import { emitFeedSoftLock } from '../../../src/utils/feedSoftLock';

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
  const [claimRejected, setClaimRejected] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState([]);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const claimReserveRef = useRef(false);
  const claimSubmittedRef = useRef(false);
  const optimisticLockRef = useRef(false);

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
        setClaimRejected(false);
        setClaimDismissed(false);
      } catch (e) {
        console.error('Failed to parse item data:', e);
      }
    }
  }, [data]);

  // Per-user local flags only (email required — never share reject across accounts).
  useEffect(() => {
    if (!item?.id || !userEmail) return;
    let cancelled = false;
    (async () => {
      await clearLegacySharedClaimFlags(item, AsyncStorage);
      if (cancelled) return;
      const rejectedKey = rejectedClaimStorageKey(item, userEmail);
      const pendingKey = pendingClaimStorageKey(item, userEmail);
      const [localRejected, localPending] = await Promise.all([
        AsyncStorage.getItem(rejectedKey),
        AsyncStorage.getItem(pendingKey),
      ]);
      if (cancelled) return;
      if (localRejected === '1') {
        setClaimRejected(true);
        setClaimPending(false);
        return;
      }
      setClaimRejected(false);
      if (localPending === '1') setClaimPending(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.type, userEmail]);

  // "Not mine" only hides claim actions for the current visit.
  useFocusEffect(
    React.useCallback(() => {
      setClaimDismissed(false);
      if (!item?.id || !userEmail) return undefined;
      AsyncStorage.removeItem(dismissStorageKey(item, userEmail)).catch(() => {});
      (async () => {
        const rejectedKey = rejectedClaimStorageKey(item, userEmail);
        const localRejected = await AsyncStorage.getItem(rejectedKey);
        if (localRejected === '1') {
          setClaimRejected(true);
          setClaimPending(false);
        }
      })();
      return undefined;
    }, [item?.id, item?.type, userEmail])
  );

  useEffect(() => {
    if (!item?.id || !userEmail) return;

    let cancelled = false;
    const pendingKey = pendingClaimStorageKey(item, userEmail);
    const rejectedKey = rejectedClaimStorageKey(item, userEmail);
    const type = isLostItemRecord(item) ? 'lost' : 'found';

    (async () => {
      try {
        const [pendingRow, rejectedRow] = await Promise.all([
          getUserPendingClaimForItem(item.id, type, userEmail),
          getUserRejectedClaimForItem(item.id, type, userEmail),
        ]);
        if (cancelled) return;

        // Server is source of truth for THIS email only.
        if (rejectedRow) {
          setClaimRejected(true);
          setClaimPending(false);
          await AsyncStorage.setItem(rejectedKey, '1');
          await AsyncStorage.removeItem(pendingKey);
          return;
        }

        setClaimRejected(false);
        await AsyncStorage.removeItem(rejectedKey);

        if (pendingRow) {
          setClaimPending(true);
          await AsyncStorage.setItem(pendingKey, '1');
        } else {
          setClaimPending(false);
          await AsyncStorage.removeItem(pendingKey);
        }
      } catch (e) {
        console.warn('Could not check claim status:', e?.message);
        const [localPending, localRejectedAgain] = await Promise.all([
          AsyncStorage.getItem(pendingKey),
          AsyncStorage.getItem(rejectedKey),
        ]);
        if (!cancelled) {
          if (localRejectedAgain === '1') {
            setClaimRejected(true);
            setClaimPending(false);
          } else {
            setClaimRejected(false);
            setClaimPending(localPending === '1');
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.type, userEmail]);

  useEffect(() => {
    return () => {
      if (claimSubmittedRef.current || !item?.id) return;
      if (!claimReserveRef.current && !optimisticLockRef.current) return;
      const type = isLostItemRecord(item) ? 'lost' : 'found';
      const id = item.id;
      claimReserveRef.current = false;
      optimisticLockRef.current = false;
      emitFeedSoftLock({
        itemType: type,
        itemId: id,
        locked: false,
        item: { ...item, status: 'live', type: type === 'found' ? 'FOUND' : 'LOST' },
      });
      releaseItemClaimReserve(type, id).catch(() => {});
    };
  }, [item?.id]);

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
  const themeColor = isSecure ? SECURE_COLOR : LOST_COLOR;
  const statusLabel = 'LOST';
  const secureDisplay = isSecure ? getSecureItemDisplay(item) : null;

  const isOwnItem = isOwnReportedItem(item, userEmail, userName);
  const showClaimSection =
    !isOwnItem &&
    !claimRejected &&
    !claimPending &&
    !claimDismissed &&
    shouldShowClaimSection(item, userEmail, userName) &&
    (canShowThisIsMine(item, userEmail, userName) || canShowNotMine(item, userEmail, userName));

  const showThisIsMine = !claimRejected && !claimPending && canShowThisIsMine(item, userEmail, userName);
  const showNotMine = !claimRejected && !claimPending && canShowNotMine(item, userEmail, userName);

  // Reporter identity is admin-only — students never see owner/finder name or phone.
  const listingSourceLabel = isOwnItem
    ? 'You'
    : isSecure
      ? 'Campus Security'
      : 'JU LOFO Desk';
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

  const itemType = isLost ? 'lost' : 'found';

  const markClaimPending = async () => {
    setClaimPending(true);
    await AsyncStorage.setItem(pendingClaimStorageKey(item, userEmail), '1');
  };

  const unlockLiveInstant = (snapshot) => {
    const base = snapshot || item;
    optimisticLockRef.current = false;
    setItem((current) => (current ? { ...current, status: 'live' } : current));
    if (base?.id) {
      emitFeedSoftLock({
        itemType,
        itemId: base.id,
        locked: false,
        item: { ...base, status: 'live', type: isLostItemRecord(base) ? 'LOST' : 'FOUND' },
      });
    }
  };

  const lockOffLiveInstant = (snapshot) => {
    const base = snapshot || item;
    optimisticLockRef.current = true;
    setItem((current) => (current ? { ...current, status: 'claim_pending' } : current));
    if (base?.id) {
      emitFeedSoftLock({
        itemType,
        itemId: base.id,
        locked: true,
        item: { ...base, status: 'claim_pending' },
      });
    }
  };

  const releaseReserveIfNeeded = () => {
    if (claimSubmittedRef.current || !item?.id) return;
    if (!claimReserveRef.current && !optimisticLockRef.current) return;
    const id = item.id;
    claimReserveRef.current = false;
    unlockLiveInstant(item);
    // Always best-effort DB unlock (covers cancel before reserve finished).
    releaseItemClaimReserve(itemType, id).catch((e) => {
      console.warn('Could not restore item to live:', e?.message);
    });
  };

  const openClaimModal = async () => {
    if (!item?.id) return;
    if (claimRejected) {
      toastRef.current?.show('Cannot retry', CLAIM_ALREADY_REJECTED_MSG, 'success');
      return;
    }
    if (claimPending) {
      toastRef.current?.show('Already sent', 'Admin is reviewing your request.', 'success');
      return;
    }

    const snapshot = item;
    claimSubmittedRef.current = false;
    setChallengeError('');
    setChallengeQuestions([]);
    setClaimModalVisible(true);
    setLoadingChallenge(true);

    // Instant: leave live board the same second "Claim Item" is pressed.
    lockOffLiveInstant(snapshot);

    try {
      const [challenge] = await Promise.all([
        fetchPublicOwnershipChallenge(itemType, snapshot.id),
        reserveItemForClaim(itemType, snapshot.id).then(() => {
          claimReserveRef.current = true;
        }),
      ]);

      if (!challenge?.questions?.length) {
        claimReserveRef.current = false;
        unlockLiveInstant(snapshot);
        releaseItemClaimReserve(itemType, snapshot.id).catch(() => {});
        setChallengeError(CHALLENGE_NOT_READY_MSG);
        return;
      }

      setChallengeQuestions(challenge.questions);
    } catch (e) {
      const msg = e?.message || CHALLENGE_NOT_READY_MSG;
      claimReserveRef.current = false;
      unlockLiveInstant(snapshot);
      releaseItemClaimReserve(itemType, snapshot.id).catch(() => {});
      if (msg === ITEM_BEING_CLAIMED_MSG || /already|under review/i.test(msg)) {
        setClaimModalVisible(false);
        toastRef.current?.show('Item locked', msg, 'success');
        return;
      }
      setChallengeError(msg);
    } finally {
      setLoadingChallenge(false);
    }
  };

  const closeClaimModal = () => {
    if (submitting) return;
    setClaimModalVisible(false);
    releaseReserveIfNeeded();
  };

  const submitClaim = async (form) => {
    try {
      setSubmitting(true);
      if (!userEmail) {
        showAppError('Sign in required', 'Please log in again.');
        return;
      }
      if (claimPending || claimRejected) {
        setClaimModalVisible(false);
        toastRef.current?.show(
          claimRejected ? 'Cannot retry' : 'Already sent',
          claimRejected ? CLAIM_ALREADY_REJECTED_MSG : 'Admin is reviewing your request.',
          'success'
        );
        return;
      }
      const outcome = await submitOwnershipChallengeClaim(item, itemType, {
        answers: form.answers ?? form.selectedIndexes,
        claimerEmail: userEmail,
      });
      claimSubmittedRef.current = true;
      claimReserveRef.current = false;
      setClaimModalVisible(false);
      if (outcome.result === 'reject') {
        setClaimRejected(true);
        setClaimPending(false);
        unlockLiveInstant(item);
        await AsyncStorage.setItem(rejectedClaimStorageKey(item, userEmail), '1');
        await AsyncStorage.removeItem(pendingClaimStorageKey(item, userEmail));
        toastRef.current?.show(
          `Score ${outcome.score}%`,
          challengeResultLabel(outcome.result),
          'success'
        );
        return;
      }
      optimisticLockRef.current = false;
      await markClaimPending();
      toastRef.current?.show(
        `Score ${outcome.score}%`,
        outcome.message || challengeResultLabel(outcome.result),
        'success'
      );
    } catch (e) {
      const msg = e?.message || '';
      if (msg === CLAIM_ALREADY_REJECTED_MSG || msg.includes('cannot submit again')) {
        setClaimModalVisible(false);
        claimSubmittedRef.current = true;
        claimReserveRef.current = false;
        setClaimRejected(true);
        await AsyncStorage.setItem(rejectedClaimStorageKey(item, userEmail), '1');
        showAppError('Cannot retry', CLAIM_ALREADY_REJECTED_MSG);
        return;
      }
      if (msg === CLAIM_ALREADY_PENDING_MSG || msg.includes('already sent')) {
        setClaimModalVisible(false);
        claimSubmittedRef.current = true;
        claimReserveRef.current = false;
        await markClaimPending();
        toastRef.current?.show('Already sent', 'Admin is reviewing your request.', 'success');
        return;
      }
      showAppError('Could not submit', msg || 'Could not submit Ownership Challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotMine = () => {
    // Temporary for this open only — claim buttons return when you reopen.
    setClaimDismissed(true);
    toastRef.current?.show(
      'Dismissed',
      'Claim options will return when you reopen this item.',
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

            {/* Listing source — no personal reporter identity for campus users */}
            <View style={styles.reporterCard}>
              <View style={styles.reporterLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: themeColor + '20' }]}>
                  <Ionicons name={isOwnItem ? 'person' : 'shield-checkmark'} size={16} color={themeColor} />
                </View>
                <View>
                  <Text style={styles.reportedByLabel}>Listed via</Text>
                  <Text style={styles.reporterName}>{listingSourceLabel}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: themeColor + '12', borderColor: themeColor + '25' }]}>
                <View style={[styles.statusDot, { backgroundColor: themeColor }]} />
                <Text style={[styles.statusBadgeText, { color: themeColor }]}>
                  {statusLabel}
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
            {claimRejected ? (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.bottomBarTopAction, { backgroundColor: '#94A3B8' }]}
                disabled
              >
                <Ionicons name="close-circle" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Not matched — cannot retry</Text>
              </TouchableOpacity>
            ) : claimPending ? (
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
                {showThisIsMine ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                    onPress={openClaimModal}
                  >
                    <Ionicons name="lock-closed" size={16} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Claim Item</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={[styles.primaryBtn, styles.bottomBarTopAction, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={SLATE_500} />
                <Text style={[styles.primaryBtnText, { color: SLATE_600 }]}>Claim via campus admin</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ItemClaimFormModal
        visible={claimModalVisible}
        onClose={closeClaimModal}
        onSubmit={submitClaim}
        submitting={submitting}
        initialName={userName}
        initialStudentId={studentId}
        questions={challengeQuestions}
        loadingQuestions={loadingChallenge}
        loadError={challengeError}
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
