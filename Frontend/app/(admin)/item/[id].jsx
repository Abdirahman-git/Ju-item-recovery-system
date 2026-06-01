import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Linking, Alert, Platform, StatusBar, Modal, TextInput, ActivityIndicator
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { markItemAsReturned, getMatchesForItem } from '../../../src/services/supabase';
import { getConfidenceLabel } from '../../../src/utils/matchItems';
import { readItemTimeField } from '../../../src/utils/itemTimeUtils';
import SuccessToast from '../../../src/components/SuccessToast';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const { width } = Dimensions.get('window');

const LOST_COLOR = '#1D4ED8';
const FOUND_COLOR = '#10B981';
const RETURN_COLOR = '#4F46E5'; // Indigo color for return action
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const BG_MAIN = '#F4F7FA';

export default function AdminItemDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const toastRef = useRef(null);

  // Modal states for "Mark as Returned"
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    if (!item?.id || item.isArchive) return;
    const isLostItem = item.type === 'LOST' || item.hasOwnProperty('ownerName') || item.hasOwnProperty('dateLost');
    const type = isLostItem ? 'lost' : 'found';
    if (item.is_approved === false) return;

    const load = async () => {
      setMatchesLoading(true);
      try {
        const results = await getMatchesForItem(item.id, type);
        setMatches(results || []);
      } catch (e) {
        console.warn('Admin match load failed:', e);
      } finally {
        setMatchesLoading(false);
      }
    };
    load();
  }, [item]);

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  const isLost = item.type === 'LOST' || item.hasOwnProperty('ownerName') || item.hasOwnProperty('dateLost');
  const typeLabel = isLost ? 'LOST' : 'FOUND';
  const themeColor = isLost ? LOST_COLOR : FOUND_COLOR;
  const lightThemeColor = isLost ? '#EFF6FF' : '#D1FAE5';

  const personName = item.isArchive ? item.original_reporter : (isLost ? item.ownerName : item.finderName);
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

  const handleConfirmReturn = async () => {
    if (!recipientName.trim()) {
      Alert.alert('Required Info', 'Please enter the name of the person receiving the item.');
      return;
    }

    try {
      setSubmitting(true);
      await markItemAsReturned(item, typeLabel, recipientName.trim(), recipientId.trim() || null);
      
      setShowReturnModal(false);
      
      // Show success message
      toastRef.current?.show(
        'Item Returned!',
        `Successfully transferred "${item.itemName}" to returned items archive.`,
        'success'
      );

      // Navigate back after toast
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (err) {
      console.error('Failed to mark item as returned:', err);
      Alert.alert('Error', 'Failed to archive returned item. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.headerTitleText}>Admin Property Ledger</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 220 }} showsVerticalScrollIndicator={false}>
        {/* ── IMAGE ── */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.imageWrapper}>
          {(item.imageURI || item.imageuri) ? (
            <Image source={{ uri: item.imageURI || item.imageuri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <MaterialCommunityIcons name="image-off-outline" size={48} color={SLATE_400} />
            </View>
          )}
          <View style={[styles.floatingBadge, { backgroundColor: lightThemeColor }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color={themeColor} style={{ marginRight: 6 }} />
            <Text style={[styles.floatingBadgeText, { color: themeColor }]}>{typeLabel}</Text>
          </View>
        </Animated.View>

        <View style={styles.contentPadding}>
          {/* ── CATEGORY & TITLE ── */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.titleSection}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category || 'GENERAL'}</Text>
            </View>
            <Text style={styles.titleText}>{item.itemName || item.item_name}</Text>
          </Animated.View>

          {/* ── DETAILS LIST ── */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.listCard}>
            
            {!item.isArchive && (
              <DetailRow icon="document-text-outline" label="Description" value={item.description || "No description provided."} />
            )}
            
            <DetailRow icon="location-outline" label="Address" value={item.location} />
            
            {!item.isArchive && (
              <>
                <DetailRow icon="calendar-outline" label={isLost ? 'Date Lost' : 'Date Found'} value={itemDate} />
                <DetailRow icon="time-outline" label={isLost ? 'Time Lost' : 'Time Found'} value={itemTime} />
              </>
            )}

            <View style={styles.rowContainer}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: lightThemeColor, borderColor: themeColor + '20' }]}>
                  <Ionicons name="person-outline" size={22} color={themeColor} />
                </View>
              </View>
              <View style={[styles.rowRight, { borderBottomWidth: item.isArchive ? 1 : 0 }]}>
                <Text style={styles.rowLabel}>{isLost ? 'Owner' : 'Finder'}</Text>
                <Text style={[styles.rowValue, { color: themeColor, fontWeight: '800' }]}>{personName}</Text>
              </View>
            </View>

            {item.isArchive && (
              <Animated.View entering={FadeInDown.delay(500).springify()}>
                <View style={[styles.rowContainer, { marginTop: 5 }]}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: '#EEF2F6', borderColor: '#CBD5E1' }]}>
                      <Ionicons name="gift-outline" size={22} color={RETURN_COLOR} />
                    </View>
                  </View>
                  <View style={[styles.rowRight, { borderBottomWidth: 1 }]}>
                    <Text style={styles.rowLabel}>Returned To</Text>
                    <Text style={[styles.rowValue, { color: RETURN_COLOR, fontWeight: '800' }]}>{item.recipient_name || 'N/A'}</Text>
                    {item.recipient_student_id && (
                      <Text style={[styles.rowLabel, { marginTop: 2, fontSize: 10 }]}>ID: {item.recipient_student_id}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.rowContainer}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: '#EEF2F6', borderColor: '#CBD5E1' }]}>
                      <Ionicons name="checkmark-done-circle-outline" size={22} color={RETURN_COLOR} />
                    </View>
                  </View>
                  <View style={[styles.rowRight, { borderBottomWidth: 0 }]}>
                    <Text style={styles.rowLabel}>Date Returned</Text>
                    <Text style={styles.rowValue}>
                      {item.returned_at ? new Date(item.returned_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {!item.isArchive && (matchesLoading || matches.length > 0) && (
            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.matchesSection}>
              <View style={styles.matchesHeader}>
                <MaterialCommunityIcons name="auto-fix" size={20} color="#1E40AF" />
                <Text style={styles.matchesTitle}>Smart Match Suggestions</Text>
              </View>
              {matchesLoading ? (
                <ActivityIndicator color="#1E40AF" style={{ marginVertical: 12 }} />
              ) : (
                matches.slice(0, 5).map((m) => (
                  <TouchableOpacity
                    key={String(m.id)}
                    style={styles.matchCard}
                    onPress={() => router.push({
                      pathname: '/(admin)/matches/compare',
                      params: { matchData: JSON.stringify(m) },
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.matchScore}>{m.score}% · {getConfidenceLabel(m.score)}</Text>
                      <Text style={styles.matchName}>{m.oppositeItem?.itemName}</Text>
                      <Text style={styles.matchMeta}>{m.oppositeItem?.location}</Text>
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
      {!item.isArchive && (
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.bottomBarWrapper}>
          <Text style={styles.contactHint}>CONTACT & PROPERTY RETURN MANAGEMENT</Text>
          
          {/* Modern Nested Action Layout */}
          <View style={styles.adminActionContainer}>
            {/* Primary Action Button: Large, Premium, and Elevated */}
            <TouchableOpacity 
              style={styles.heroReturnBtn} 
              activeOpacity={0.85}
              onPress={() => setShowReturnModal(true)}
            >
              <View style={styles.heroReturnContent}>
                <Ionicons name="checkmark-done-circle" size={24} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.heroReturnBtnText}>Mark as Returned</Text>
              </View>
              <View style={styles.heroReturnArrowCircle}>
                <Ionicons name="arrow-forward" size={16} color={RETURN_COLOR} />
              </View>
            </TouchableOpacity>

            {/* Secondary Action Row: Sleek & Compact Contact Actions */}
            <View style={styles.secondaryActionRow}>
              <TouchableOpacity style={[styles.contactIconButton, { borderColor: themeColor + '30' }]} onPress={handleCall}>
                <Feather name="phone-call" size={18} color={themeColor} style={{ marginRight: 8 }} />
                <Text style={[styles.contactIconText, { color: themeColor }]}>Call {isLost ? 'Owner' : 'Finder'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.contactIconButton, { borderColor: themeColor + '30' }]} onPress={handleSMS}>
                <Feather name="message-square" size={18} color={themeColor} style={{ marginRight: 8 }} />
                <Text style={[styles.contactIconText, { color: themeColor }]}>Send SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── RETURN TRANSACTION MODAL ── */}
      <Modal
        visible={showReturnModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReturnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="gift-outline" size={28} color={RETURN_COLOR} />
              </View>
              <Text style={styles.modalTitle}>Property Handover Ledger</Text>
              <Text style={styles.modalSubtitle}>Please register the recipient's details to archive this return transaction.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECIPIENT NAME *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Full name of person receiving the item"
                placeholderTextColor={SLATE_400}
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>STUDENT ID (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. JU-10294"
                placeholderTextColor={SLATE_400}
                value={recipientId}
                onChangeText={setRecipientId}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setShowReturnModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: RETURN_COLOR }]} 
                onPress={handleConfirmReturn}
                disabled={submitting}
              >
                <Text style={styles.modalBtnText}>Confirm Handover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  headerTitleText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#1E40AF', letterSpacing: 0.5 },
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
    backgroundColor: '#FFF', borderRadius: 24, padding: 18,
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 10 },
        android: { elevation: 3 }
    }),
    borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 30
  },
  rowContainer: { flexDirection: 'row', paddingVertical: 12, alignItems: 'center' },
  rowLeft: { marginRight: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rowRight: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
  rowLabel: { fontSize: 11, fontWeight: '800', color: SLATE_400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  rowValue: { fontSize: 15, fontWeight: '600', color: SLATE_800, lineHeight: 22 },
  matchesSection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  matchesTitle: { fontSize: 15, fontWeight: '900', color: SLATE_900 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  matchScore: { fontSize: 11, fontWeight: '800', color: '#1E40AF' },
  matchName: { fontSize: 14, fontWeight: '800', color: SLATE_800, marginTop: 2 },
  matchMeta: { fontSize: 11, color: SLATE_500, marginTop: 2 },
  bottomBarWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 12
  },
  contactHint: { fontSize: 9, fontFamily: 'Inter_700Bold', color: SLATE_400, letterSpacing: 1.2, textAlign: 'center', marginBottom: 15, textTransform: 'uppercase' },
  adminActionContainer: {
    flexDirection: 'column', gap: 12
  },
  heroReturnBtn: {
    width: '100%', height: 60, backgroundColor: RETURN_COLOR, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: RETURN_COLOR, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6
  },
  heroReturnContent: {
    flexDirection: 'row', alignItems: 'center'
  },
  heroReturnBtnText: {
    fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: 0.5
  },
  heroReturnArrowCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center'
  },
  secondaryActionRow: {
    flexDirection: 'row', gap: 10
  },
  contactIconButton: {
    flex: 1, height: 50, borderWidth: 1.5, borderRadius: 14,
    backgroundColor: '#FAFAFB', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
  },
  contactIconText: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold'
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 28,
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10
  },
  modalHeader: { alignItems: 'center', marginBottom: 25 },
  modalIconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEF2F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: SLATE_900, marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: SLATE_500, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: SLATE_500, letterSpacing: 1, marginBottom: 8 },
  textInput: {
    width: '100%', height: 50, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: SLATE_900,
    backgroundColor: '#FAFAFB'
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '700', color: SLATE_600 },
  modalBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' }
});
