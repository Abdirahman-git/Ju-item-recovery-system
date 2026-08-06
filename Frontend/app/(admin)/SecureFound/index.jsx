import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, DrawerActions } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import CategoryPills from '../../../src/components/CategoryPills';
import { useDynamicCategories } from '../../../src/hooks/useDynamicCategories';
import {
  createSecureFoundItem,
  updateSecureFoundDraft,
  publishSecureFoundDraft,
  fetchSecureDraftItemById,
  fetchActiveSecureFoundItems,
  markSecureFoundReturned,
} from '../../../src/services/supabase';
import { validateSecureNoticeContent } from '../../../src/utils/contentValidation';
import { showAppWarning, showAppFailure, showAppConfirm } from '../../../src/utils/appAlert';

const AMBER = '#B45309';
const AMBER_LIGHT = '#FEF3C7';
const DEFAULT_SECURITY_LOCATION = 'Campus Security Office';
const DESCRIPTION_LIMIT = 280;

function createInitialForm() {
  return {
    itemName: '',
    category: '',
    description: '',
    securityLocation: DEFAULT_SECURITY_LOCATION,
  };
}

export default function SecureFoundScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftParamId = params?.draftId ? Number(params.draftId) : null;
  const toastRef = useRef(null);
  const draftLoadedRef = useRef(false);

  const [form, setForm] = useState(createInitialForm);
  const [draftId, setDraftId] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [userSession, setUserSession] = useState(null);

  const [activeHolds, setActiveHolds] = useState([]);
  const [loadingHolds, setLoadingHolds] = useState(true);
  const [returningId, setReturningId] = useState(null);

  const { categoryEntries, loading: categoriesLoading } = useDynamicCategories([], { forAdmin: true });

  const fetchHolds = async () => {
    try {
      setLoadingHolds(true);
      const data = await fetchActiveSecureFoundItems();
      setActiveHolds(data || []);
    } catch (error) {
      console.error('Error fetching secure holds:', error);
      showAppFailure(error?.message || 'Failed to load active secure holds.', 'Load failed');
    } finally {
      setLoadingHolds(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHolds();
      AsyncStorage.getItem('userSession').then((data) => {
        if (data) setUserSession(JSON.parse(data));
      });
    }, [])
  );

  useEffect(() => {
    if (!draftParamId || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    (async () => {
      try {
        setLoadingDraft(true);
        const draft = await fetchSecureDraftItemById(draftParamId);
        setDraftId(draft.id);
        setForm({
          itemName: draft.itemName || '',
          category: draft.category || draft.public_category || '',
          description: draft.public_notice || draft.description || '',
          securityLocation: draft.security_location || DEFAULT_SECURITY_LOCATION,
        });
      } catch (error) {
        console.error('Failed to load secure draft:', error);
        showAppFailure(error?.message || 'This secure notice could not be opened.', 'Could not load draft');
      } finally {
        setLoadingDraft(false);
      }
    })();
  }, [draftParamId]);

  const buildPayload = () => {
    const name = form.itemName.trim();
    const description = form.description.trim();
    const category = form.category || 'Other';
    const securityLocation = form.securityLocation.trim() || DEFAULT_SECURITY_LOCATION;
    const finderName = userSession?.userName || 'Campus Security';
    const email = userSession?.email || 'admin@ju.edu.so';

    return {
      itemName: name,
      category,
      description,
      location: securityLocation,
      security_location: securityLocation,
      public_notice: description,
      public_category: category,
      finderName,
      phnum: userSession?.phone || '',
      email,
      finderId: email,
      userId: email,
    };
  };

  const validateForm = () => {
    if (!form.category) {
      return { valid: false, title: 'Category required', message: 'Select a category for this secure hold.' };
    }
    return validateSecureNoticeContent({
      name: form.itemName,
      description: form.description,
      requireDescription: true,
    });
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setDraftId(null);
  };

  const handleSaveDraft = async () => {
    const validation = validateForm();
    if (!validation.valid) {
      showAppWarning(validation.title || 'Check your input', validation.message);
      return;
    }

    try {
      setSavingDraft(true);
      const payload = buildPayload();
      const saved = draftId
        ? await updateSecureFoundDraft(draftId, payload)
        : await createSecureFoundItem(payload, { asDraft: true });

      if (draftId) {
        toastRef.current?.show('Draft updated', 'Changes saved to this secure draft.');
      } else {
        setDraftId(saved.id);
        toastRef.current?.show('Draft saved', 'Continue or publish it anytime from Drafts.');
      }
    } catch (error) {
      console.error('Save secure draft failed:', error);
      showAppFailure(error?.message || 'Draft save failed.', 'Could not save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    const validation = validateForm();
    if (!validation.valid) {
      showAppWarning(validation.title || 'Check your input', validation.message);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload();
      if (draftId) {
        await publishSecureFoundDraft(draftId, payload);
      } else {
        await createSecureFoundItem(payload, { asDraft: false });
      }

      resetForm();
      toastRef.current?.show('Published', 'Secure notice is now live for students.');
      fetchHolds();
    } catch (error) {
      console.error('Publish secure notice failed:', error);
      showAppFailure(error?.message || 'Publish failed.', 'Could not publish');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReturned = (hold) => {
    showAppConfirm({
      title: 'Mark as returned?',
      message: `Confirm "${hold.itemName || 'this item'}" has been verified and handed back in person.`,
      confirmText: 'Mark returned',
      onConfirm: async () => {
        try {
          setReturningId(hold.id);
          await markSecureFoundReturned(hold.id);
          setActiveHolds((prev) => prev.filter((h) => h.id !== hold.id));
          toastRef.current?.show('Marked returned', 'Item moved to the returned archive.');
        } catch (error) {
          showAppFailure(error?.message || 'Could not mark item as returned.', 'Action failed');
        } finally {
          setReturningId(null);
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Secure Found Hold"
        subtitle="High-value item notices"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchHolds}>
            <Ionicons name="refresh-outline" size={22} color={AMBER} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Secure hold"
          title={draftId ? `Editing draft #${draftId}` : 'Post a secure notice'}
          subtitle="High-value items (money, jewelry, IDs) are kept secure without a public photo. Students only see a short notice."
        />

        {loadingDraft ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AMBER} />
            <Text style={styles.loadingText}>Loading draft...</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.secureMarkWrap}>
                <Text style={styles.secureMarkText}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Secure notice details</Text>
                <Text style={styles.formSubtitle}>Item name and description are the only things students will see.</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>ITEM NAME</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="pricetag-outline" size={20} color={AMBER} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputNew}
                  placeholder="e.g. Mobile phone, Gold necklace"
                  placeholderTextColor="#94A3B8"
                  value={form.itemName}
                  maxLength={60}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, itemName: val }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <CategoryPills
                entries={categoryEntries}
                loading={categoriesLoading}
                selectedCategory={form.category}
                onSelect={(category) => setForm((prev) => ({ ...prev, category }))}
                accentColor={AMBER}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>SECURITY LOCATION</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={AMBER} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputNew}
                  placeholder={DEFAULT_SECURITY_LOCATION}
                  placeholderTextColor="#94A3B8"
                  value={form.securityLocation}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, securityLocation: val }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>DESCRIPTION / NOTICE</Text>
              <View style={[styles.inputWrapper, { height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
                <Ionicons name="document-text-outline" size={20} color={AMBER} style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputNew, { height: '100%', textAlignVertical: 'top' }]}
                  placeholder='Short message for students, e.g. "Contact security to verify ownership"'
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={form.description}
                  maxLength={DESCRIPTION_LIMIT}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, description: val }))}
                />
              </View>
              <Text style={styles.characterCount}>{form.description.length}/{DESCRIPTION_LIMIT}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.draftBtn, (savingDraft || submitting) && styles.btnDisabled]}
                onPress={handleSaveDraft}
                disabled={savingDraft || submitting}
              >
                {savingDraft ? (
                  <ActivityIndicator color={AMBER} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color={AMBER} />
                    <Text style={styles.draftBtnText}>{draftId ? 'Update Draft' : 'Save Draft'}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.publishBtn, (savingDraft || submitting) && styles.btnDisabled]}
                onPress={handlePublish}
                disabled={savingDraft || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color="#FFF" />
                    <Text style={styles.publishBtnText}>Publish</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {draftId ? (
              <TouchableOpacity style={styles.clearDraftBtn} onPress={resetForm}>
                <Ionicons name="close-circle-outline" size={14} color={Colors.slate500} />
                <Text style={styles.clearDraftBtnText}>Discard changes and start a new notice</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Active secure holds</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{activeHolds.length}</Text>
          </View>
        </View>

        {loadingHolds ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AMBER} />
            <Text style={styles.loadingText}>Loading active holds...</Text>
          </View>
        ) : activeHolds.length > 0 ? (
          activeHolds.map((hold) => (
            <View key={hold.id} style={styles.holdCard}>
              <View style={styles.holdMark}>
                <Text style={styles.holdMarkText}>!</Text>
              </View>
              <View style={styles.holdBody}>
                <Text style={styles.holdName} numberOfLines={1}>{hold.itemName}</Text>
                <Text style={styles.holdNotice} numberOfLines={2}>
                  {hold.public_notice || hold.description || 'No notice added.'}
                </Text>
                <View style={styles.holdMetaRow}>
                  <View style={styles.holdCategoryChip}>
                    <Text style={styles.holdCategoryText}>{hold.category || 'General'}</Text>
                  </View>
                  <Text style={styles.holdLocation} numberOfLines={1}>
                    {hold.security_location || DEFAULT_SECURITY_LOCATION}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => handleMarkReturned(hold)}
                disabled={returningId === hold.id}
              >
                {returningId === hold.id ? (
                  <ActivityIndicator size="small" color={Colors.success} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={14} color={Colors.success} />
                    <Text style={styles.returnBtnText}>Returned</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={52} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No active secure holds</Text>
            <Text style={styles.emptyText}>Published secure notices will appear here until returned.</Text>
          </View>
        )}
      </ScrollView>

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.slate50 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: AMBER_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: 'Inter_500Medium', color: Colors.slate500 },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 24,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  secureMarkWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureMarkText: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFF' },
  formTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: Colors.slate900 },
  formSubtitle: { marginTop: 2, fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.slate500 },
  inputGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.slate400,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
  },
  inputIcon: { marginRight: 10 },
  inputNew: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.slate800 },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate400,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: AMBER_LIGHT,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: AMBER },
  publishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#B45309',
  },
  publishBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF' },
  btnDisabled: { opacity: 0.65 },
  clearDraftBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clearDraftBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.slate500 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.slate900 },
  countPill: {
    backgroundColor: AMBER_LIGHT,
    borderRadius: 999,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countPillText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: AMBER },
  holdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  holdMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: AMBER_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdMarkText: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: AMBER },
  holdBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  holdName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: Colors.slate900 },
  holdNotice: { marginTop: 2, fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.slate500, lineHeight: 16 },
  holdMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  holdCategoryChip: {
    backgroundColor: Colors.slate50,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  holdCategoryText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.slate600 },
  holdLocation: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.slate400, flexShrink: 1 },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  returnBtnText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.success },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontFamily: 'Poppins_700Bold', fontSize: 15, color: Colors.slate700 },
  emptyText: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate500,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
