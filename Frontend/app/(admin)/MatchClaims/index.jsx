import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import { AppButton, AppInput, AppModalSheet } from '../../../src/components/AppForm';
import {
  getPendingItemClaims,
  approveItemClaim,
  rejectItemClaim,
} from '../../../src/services/supabase';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

export default function OwnershipRequestsScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ visible: false, claim: null });
  const [rejectNote, setRejectNote] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getPendingItemClaims();
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
      showAppFailure(error?.message || 'Could not load requests.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const filtered = claims.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.claimer_name?.toLowerCase().includes(q) ||
      c.claimer_student_id?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.targetItem?.itemName?.toLowerCase().includes(q)
    );
  });

  const handleApprove = (claim) => {
    showAppConfirm({
      title: 'Approve & mark returned?',
      message: `Give "${claim.targetItem?.itemName || 'this item'}" to ${claim.claimer_name} and archive the report?`,
      confirmText: 'Approve',
      onConfirm: async () => {
        try {
          setProcessingId(claim.id);
          await approveItemClaim(claim);
          setClaims((prev) => prev.filter((c) => c.id !== claim.id));
          toastRef.current?.show('Approved', 'Item marked as returned to the student.', 'success');
        } catch (e) {
          showAppFailure(e?.message || 'Approve failed.', 'Action failed');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const openReject = (claim) => {
    setRejectNote('');
    setRejectModal({ visible: true, claim });
  };

  const submitReject = async () => {
    const claim = rejectModal.claim;
    if (!claim) return;
    try {
      setProcessingId(claim.id);
      await rejectItemClaim(claim.id, rejectNote);
      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
      setRejectModal({ visible: false, claim: null });
      toastRef.current?.show('Rejected', 'Request was declined.', 'success');
    } catch (e) {
      showAppFailure(e?.message || 'Reject failed.', 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Ownership Requests</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.slate400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search student or item..."
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="clipboard-outline" size={56} color={Colors.slate300} />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySub}>When a student taps “This is mine”, it appears here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map((claim) => {
            const item = claim.targetItem;
            const isLost = claim.itemType === 'lost' || item?.type === 'LOST';
            return (
              <View key={String(claim.id)} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.typePill}>{isLost ? 'LOST REPORT' : 'FOUND REPORT'}</Text>
                </View>

                <View style={styles.claimantBox}>
                  <Ionicons name="person-circle-outline" size={36} color={Colors.primary} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.claimantName}>{claim.claimer_name}</Text>
                    <Text style={styles.claimantMeta}>
                      {claim.claimer_student_id || 'No ID'} · {formatDate(claim.created_at)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.descText}>{claim.description}</Text>

                {item ? (
                  <View style={styles.itemRow}>
                    {item.imageURI ? (
                      <Image source={{ uri: item.imageURI }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPh]}>
                        <Ionicons name="cube-outline" size={22} color={Colors.slate400} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>{item.location}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, processingId === claim.id && { opacity: 0.6 }]}
                    onPress={() => openReject(claim)}
                    disabled={processingId === claim.id}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, processingId === claim.id && { opacity: 0.6 }]}
                    onPress={() => handleApprove(claim)}
                    disabled={processingId === claim.id}
                  >
                    {processingId === claim.id ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <AppModalSheet
        visible={rejectModal.visible}
        title="Reject request"
        subtitle="Optional note for your records."
        icon="close-circle-outline"
        onClose={() => setRejectModal({ visible: false, claim: null })}
        footer={
          <View style={styles.modalFooter}>
            <AppButton title="Cancel" variant="secondary" onPress={() => setRejectModal({ visible: false, claim: null })} style={{ flex: 1 }} />
            <AppButton title="Reject" variant="destructive" onPress={submitReject} loading={!!processingId} style={{ flex: 1 }} />
          </View>
        }
      >
        <AppInput label="Admin note (optional)" value={rejectNote} onChangeText={setRejectNote} multiline />
      </AppModalSheet>

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 28, height: 28, marginRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1E40AF' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#0F172A' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  emptySub: { marginTop: 8, fontSize: 14, color: '#64748B', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: { marginBottom: 10 },
  typePill: { fontSize: 10, fontWeight: '900', color: '#1D4ED8', letterSpacing: 1 },
  claimantBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  claimantName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  claimantMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  descText: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPh: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  itemMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  rejectBtnText: { fontWeight: '800', color: '#64748B' },
  approveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  approveBtnText: { fontWeight: '800', color: '#FFF' },
  modalFooter: { flexDirection: 'row', gap: 10 },
});
