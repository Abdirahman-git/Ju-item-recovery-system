import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../src/constants/colors';
import AdminHeader from '../../../../src/components/AdminHeader';
import AdminPageHero from '../../../../src/components/AdminPageHero';
import SuccessToast from '../../../../src/components/SuccessToast';
import { AppButton, AppInput, AppModalSheet } from '../../../../src/components/AppForm';
import {
  approveItemClaim,
  getPendingItemClaimById,
  rejectItemClaim,
} from '../../../../src/services/supabase';
import { showAppConfirm, showAppFailure } from '../../../../src/utils/appAlert';

function getInitials(name) {
  if (!name) return 'ST';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ClaimDetailsPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const toastRef = React.useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const row = await getPendingItemClaimById(id);
        if (mounted) setClaim(row);
      } catch (e) {
        showAppFailure(e?.message || 'Failed to load claim details.', 'Load failed');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const isLost = useMemo(
    () => claim?.itemType === 'lost' || claim?.targetItem?.type === 'LOST',
    [claim]
  );

  const handleApprove = () => {
    if (!claim) return;
    showAppConfirm({
      title: 'Approve this claim?',
      message: `Approve "${claim.targetItem?.itemName || 'this item'}" for ${claim.claimer_name}? The item will be archived as returned.`,
      confirmText: 'Approve',
      onConfirm: async () => {
        try {
          setProcessing(true);
          await approveItemClaim(claim);
          toastRef.current?.show('Approved', 'Item marked as returned.', 'success');
          router.back();
        } catch (e) {
          showAppFailure(e?.message || 'Approve failed.', 'Action failed');
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const handleReject = async () => {
    if (!claim) return;
    try {
      setProcessing(true);
      await rejectItemClaim(claim.id, rejectNote);
      setRejectModal(false);
      toastRef.current?.show('Rejected', 'Request was declined.', 'success');
      router.back();
    } catch (e) {
      showAppFailure(e?.message || 'Reject failed.', 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Claim Details"
        subtitle="Ownership request"
        onMenuPress={() => router.back()}
        rightElement={
          <TouchableOpacity style={styles.backIconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading claim details...</Text>
        </View>
      ) : !claim ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.slate300} />
          <Text style={styles.emptyTitle}>Claim not found</Text>
          <Text style={styles.emptyText}>This request may already be reviewed or removed.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AdminPageHero
            eyebrow="Ownership Review"
            title="Full report details"
            subtitle="Review all claimant and item information in one dedicated page."
          />

          <View style={styles.typeRow}>
            <View style={[styles.typePill, isLost ? styles.typePillLost : styles.typePillFound]}>
              <Text style={[styles.typePillText, isLost ? styles.typeTextLost : styles.typeTextFound]}>
                {isLost ? 'LOST REPORT' : 'FOUND REPORT'}
              </Text>
            </View>
            <Text style={styles.createdAt}>{formatDate(claim.created_at)}</Text>
          </View>

          <View style={styles.mainCard}>
            <View style={styles.personHeader}>
              {claim.claimerPhotoUrl || claim.profile_image || claim.avatar_url ? (
                <Image
                  source={{ uri: claim.claimerPhotoUrl || claim.profile_image || claim.avatar_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileFallback}>
                  <Text style={styles.profileFallbackText}>{getInitials(claim.claimer_name)}</Text>
                </View>
              )}

              <View style={styles.personText}>
                <Text style={styles.personName}>{claim.claimer_name || 'Unknown student'}</Text>
                <Text style={styles.personMeta}>
                  <Text style={styles.metaLabel}>Student ID: </Text>
                  <Text style={styles.metaValue}>{claim.claimer_student_id || 'N/A'}</Text>
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  <Text style={styles.metaLabel}>Email: </Text>
                  <Text style={styles.metaValue}>{claim.claimer_email || 'N/A'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Claim statement</Text>
              <Text style={styles.sectionText}>{claim.description || 'No statement provided.'}</Text>
            </View>

            {claim.targetItem ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Requested item</Text>
                {claim.targetItem.imageURI ? (
                  <Image source={{ uri: claim.targetItem.imageURI }} style={styles.heroItemImage} />
                ) : (
                  <View style={styles.heroItemPlaceholder}>
                    <Ionicons name="image-outline" size={34} color={Colors.slate400} />
                    <Text style={styles.heroItemPlaceholderText}>No item image uploaded</Text>
                  </View>
                )}
                <View style={styles.itemRow}>
                  <View style={styles.itemText}>
                    <Text style={styles.itemName}>{claim.targetItem.itemName || 'Unnamed item'}</Text>
                    <Text style={styles.itemMeta}>
                      <Text style={styles.metaLabel}>Category: </Text>
                      <Text style={styles.metaValue}>{claim.targetItem.category || 'N/A'}</Text>
                    </Text>
                    <Text style={styles.itemMeta}>
                      <Text style={styles.metaLabel}>Location: </Text>
                      <Text style={styles.metaValue}>{claim.targetItem.location || 'N/A'}</Text>
                    </Text>
                    <Text style={styles.itemMeta}>
                      <Text style={styles.metaLabel}>Reporter: </Text>
                      <Text style={styles.metaValue}>
                        {claim.targetItem.ownerName || claim.targetItem.finderName || 'N/A'}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, processing && styles.disabledBtn]}
                onPress={() => setRejectModal(true)}
                disabled={processing}
              >
                <Ionicons name="close-outline" size={17} color={Colors.slate600} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, processing && styles.disabledBtn]}
                onPress={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={17} color={Colors.white} />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      <AppModalSheet
        visible={rejectModal}
        title="Reject claim"
        subtitle="Optional note for records"
        icon="close-circle-outline"
        onClose={() => setRejectModal(false)}
        footer={
          <View style={styles.modalFooter}>
            <AppButton title="Cancel" variant="secondary" onPress={() => setRejectModal(false)} style={{ flex: 1 }} />
            <AppButton title="Reject" variant="destructive" onPress={handleReject} loading={processing} style={{ flex: 1 }} />
          </View>
        }
      >
        <AppInput
          label="Admin note (optional)"
          value={rejectNote}
          onChangeText={setRejectNote}
          multiline
        />
      </AppModalSheet>
      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.slate50 },
  backIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.slate500,
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.slate800,
  },
  emptyText: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  typePillLost: { backgroundColor: '#FEF2F2' },
  typePillFound: { backgroundColor: '#ECFDF5' },
  typePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.7,
  },
  typeTextLost: { color: Colors.error },
  typeTextFound: { color: Colors.success },
  createdAt: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate400,
  },
  mainCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.slate100,
    padding: 16,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 74,
    height: 74,
    borderRadius: 22,
  },
  profileFallback: {
    width: 74,
    height: 74,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  profileFallbackText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: Colors.primary,
  },
  personText: {
    flex: 1,
    marginLeft: 12,
  },
  personName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: Colors.slate900,
  },
  personMeta: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
  },
  metaLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  metaValue: {
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
  },
  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: Colors.slate500,
    marginBottom: 8,
  },
  sectionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate800,
    lineHeight: 21,
  },
  heroItemImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: Colors.slate100,
  },
  heroItemPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroItemPlaceholderText: {
    marginTop: 8,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.slate500,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.slate900,
  },
  itemMeta: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.slate100,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  rejectBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.slate600,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  approveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.white,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
});
