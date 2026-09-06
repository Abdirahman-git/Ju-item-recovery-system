import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, DrawerActions, useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Image, Modal,
  Dimensions, Platform, StatusBar, Animated as RNAnimated
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import VisualEvidenceUpload from '../../../src/components/VisualEvidenceUpload';
import { CATEGORY_ICONS } from '../../../src/constants/categories';
import { getItemPlaceholderMciIcon } from '../../../src/utils/itemPlaceholderIcon';
import { useDynamicCategories } from '../../../src/hooks/useDynamicCategories';
import CategoryPills from '../../../src/components/CategoryPills';
import {
  supabase,
  getAllLostItems,
  createLostItem,
  createLostDraft,
  updateLostDraft,
  publishLostDraft,
  fetchDraftItemById,
} from '../../../src/services/supabase';
import SuccessToast from '../../../src/components/SuccessToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateLostItemForm } from '../../../src/utils/itemFormValidation';
import { pickItemImage, getDefaultTimeLabel } from '../../../src/utils/pickItemImage';
import {
  formatItemTime,
  parseTimeLabelToDate,
  isFutureDateTime,
  shouldCommitPickerValue,
} from '../../../src/utils/itemTimeUtils';
import { showAppWarning } from '../../../src/utils/appAlert';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const { width } = Dimensions.get('window');
const PRIMARY_BLUE = '#1E40AF';
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const BG_LIGHT = '#F8FAFC';
const ITEM_NAME_LIMIT = 60;
const LOCATION_LIMIT = 80;
const DESCRIPTION_LIMIT = 220;

export default function AdminLostPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const draftParamId = params?.draftId ? Number(params.draftId) : null;
  const draftLoadedRef = useRef(false);
  const [draftId, setDraftId] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(() => parseTimeLabelToDate(getDefaultTimeLabel(), new Date().toISOString().split('T')[0]));
  const toastRef = useRef(null);
  const { categoryEntries, loading: categoriesLoading } = useDynamicCategories(items, { forAdmin: true });
  const [fieldErrors, setFieldErrors] = useState({});

  // New Item Form State
  const [newItem, setNewItem] = useState({
    itemName: '',
    description: '',
    location: '',
    category: '',
    dateLost: new Date().toISOString().split('T')[0],
    timeLost: getDefaultTimeLabel(),
    ownerName: '',
    phnum: '',
    imageURI: ''
  });

  const updateField = (key, value) => {
    setNewItem((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const pickImage = async () => {
    const uri = await pickItemImage();
    if (uri) {
      updateField('imageURI', uri);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      updateField('dateLost', dateString);
      setTempDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!shouldCommitPickerValue(event) || !selectedTime) {
      if (Platform.OS === 'ios') setShowTimePicker(false);
      return;
    }

    if (isFutureDateTime(newItem.dateLost, selectedTime)) {
      showAppWarning('Invalid time', 'You cannot select a future time for today.');
      if (Platform.OS === 'ios') setShowTimePicker(false);
      return;
    }

    const timeString = formatItemTime(selectedTime);
    setTempTime(selectedTime);
    updateField('timeLost', timeString);
    if (Platform.OS === 'ios') setShowTimePicker(false);
  };

  const openReportModal = () => {
    setFieldErrors({});
    setModalVisible(true);
  };

  const fetchLostItems = async () => {
    try {
      setLoading(true);
      const data = await getAllLostItems();
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching lost items:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLostItems();

      // Auto-fill user details
      AsyncStorage.getItem('userSession').then(data => {
        if (data) {
          const user = JSON.parse(data);
          setNewItem(prev => ({
            ...prev,
            ownerName: user.userName || '',
            phnum: user.phone || '',
            email: user.email || ''
          }));
        }
      });
    }, [])
  );

  useEffect(() => {
    if (!draftParamId || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    (async () => {
      try {
        setLoadingDraft(true);
        const draft = await fetchDraftItemById('lost', draftParamId);
        setDraftId(draft.id);
        const resolvedDate = draft.dateLost || new Date().toISOString().split('T')[0];
        const resolvedTime = draft.timeLost || getDefaultTimeLabel();
        setNewItem((prev) => ({
          ...prev,
          itemName: draft.itemName || '',
          description: draft.description || '',
          location: draft.location || '',
          category: draft.category || '',
          dateLost: resolvedDate,
          timeLost: resolvedTime,
          ownerName: draft.ownerName || prev.ownerName,
          phnum: draft.phnum || prev.phnum,
          imageURI: draft.imageURI || '',
        }));
        setTempDate(new Date(resolvedDate));
        setTempTime(parseTimeLabelToDate(resolvedTime, resolvedDate));
        setModalVisible(true);
      } catch (error) {
        console.error('Failed to load lost draft:', error);
        showAppWarning('Could not load draft', error?.message || 'This draft may have already been published.');
      } finally {
        setLoadingDraft(false);
      }
    })();
  }, [draftParamId]);

  const resetForm = () => {
    const resetDate = new Date().toISOString().split('T')[0];
    const resetTime = getDefaultTimeLabel();
    setTempTime(parseTimeLabelToDate(resetTime, resetDate));
    setNewItem((prev) => ({
      itemName: '', description: '', location: '', category: '',
      dateLost: resetDate, timeLost: resetTime,
      ownerName: prev.ownerName, phnum: prev.phnum, email: prev.email, imageURI: ''
    }));
    setDraftId(null);
  };

  const handleSaveDraft = async () => {
    const result = validateLostItemForm(newItem);
    if (!result.valid) {
      setFieldErrors(result.fieldErrors || {});
      return;
    }
    setFieldErrors({});

    try {
      setSavingDraft(true);

      const sessionData = await AsyncStorage.getItem('userSession');
      if (!sessionData) throw new Error("No user session found. Please login again.");

      const user = JSON.parse(sessionData);

      const itemToSave = {
        ...newItem,
        ownerName: user.userName || newItem.ownerName || 'Student',
        phnum: user.phone || newItem.phnum || '',
        email: user.email,
        userId: user.email
      };

      const saved = draftId
        ? await updateLostDraft(draftId, itemToSave)
        : await createLostDraft(itemToSave);

      setDraftId(saved.id);
      toastRef.current?.show('Draft saved', 'You can continue this later from Drafts.');
      fetchLostItems();
    } catch (error) {
      console.error('Save lost draft failed:', error);
      toastRef.current?.show('Error', error?.message || 'Failed to save draft.', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCreateItem = async () => {
    const result = validateLostItemForm(newItem);
    if (!result.valid) {
      setFieldErrors(result.fieldErrors || {});
      return;
    }
    setFieldErrors({});

    try {
      setSubmitting(true);

      const sessionData = await AsyncStorage.getItem('userSession');
      if (!sessionData) throw new Error("No user session found. Please login again.");

      const user = JSON.parse(sessionData);

      const itemToSave = {
        ...newItem,
        ownerName: user.userName || 'Student',
        phnum: user.phone || '',
        email: user.email,
        userId: user.email
      };

      const success = draftId
        ? await publishLostDraft(draftId, itemToSave)
        : await createLostItem(itemToSave, user.role === 'admin');
      if (success) {
        setModalVisible(false);
        setTimeout(() => {
          const successMsg = draftId
            ? 'Draft Published! 📢'
            : (user.role === 'admin'
              ? 'Lost Item Published Directly! 📢'
              : 'Item added successfully. Wait for admin approval.');
          const successSub = (draftId || user.role === 'admin')
            ? 'The listing is live on the student feed immediately.'
            : '';
          toastRef.current?.show(successMsg, successSub);
        }, 300);
        resetForm();
        fetchLostItems();
      }
    } catch (error) {
      console.error('Lost item post failed:', error);
      toastRef.current?.show(
        'Error',
        error?.message || 'Failed to report item. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const haystack = [item.itemName, item.category, item.location, item.description]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    return haystack.includes(q);
  });

  const ItemCard = ({ item, index }) => {
    const isPostedByAdmin = item.email && (
      item.email.toLowerCase().includes('admin') || 
      item.userId === 'admin-01'
    );

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => router.push({
          pathname: `/(admin)/item/${item.id}`,
          params: { data: JSON.stringify({ ...item, type: 'LOST' }) }
        })}
      >
        <View style={styles.cardImageContainer}>
          {item.imageURI ? (
            <Image source={{ uri: item.imageURI }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <MaterialCommunityIcons
                name={getItemPlaceholderMciIcon(item.itemName || item.item_name, item.category)}
                size={35}
                color={SLATE_400}
                style={{ opacity: 0.85 }}
              />
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.catWithIcon}>
              <MaterialCommunityIcons name={CATEGORY_ICONS[item.category] || 'tag-outline'} size={12} color={SLATE_400} />
              <Text style={styles.cardCategoryText}> {item.category}</Text>
            </View>
            {isPostedByAdmin && (
              <View style={styles.adminBadgeSmall}>
                <Ionicons name="shield-checkmark" size={8} color="#1E40AF" style={{ marginRight: 2 }} />
                <Text style={styles.adminBadgeTextSmall}>ADMIN</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.itemName}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="location-outline" size={13} color={SLATE_400} />
              <Text style={styles.footerText} numberOfLines={1}> {item.location}</Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="calendar-outline" size={13} color={SLATE_400} />
              <Text style={styles.footerText}> {item.dateLost}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lost Items</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openReportModal}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={SLATE_400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search lost items..."
            placeholderTextColor={SLATE_400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#94A3B8" style={{ marginTop: 50 }} />
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => <ItemCard key={item.id} item={item} index={index} />)
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cube-scan" size={80} color={SLATE_400} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>No items found matches your search.</Text>
          </View>
        )}
      </ScrollView>

      {/* REPORT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header with Back Button and Logo */}
            <View style={styles.modalHeaderNew}>
              <TouchableOpacity style={styles.modalBackBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="arrow-back" size={22} color={SLATE_900} />
              </TouchableOpacity>
              <View style={styles.modalHeaderTitleCenter}>
                 <Image source={JU_LOGO} style={styles.modalLogo} resizeMode="contain" />
                 <Text style={styles.modalLogoText}>Jazeera University</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
              
              <View style={styles.portalHeader}>
                 <Text style={[styles.portalTag, { color: PRIMARY_BLUE }]}>REPORTING PORTAL</Text>
                 <Text style={styles.portalTitle}>Report a Lost Item.</Text>
                 <Text style={styles.portalSubtitle}>Provide the details below to help the community find your item.</Text>
              </View>

              {/* Visual Evidence */}
              <VisualEvidenceUpload
                imageUri={newItem.imageURI}
                onPick={pickImage}
                onRemove={() => updateField('imageURI', '')}
                accentColor={PRIMARY_BLUE}
                subtitle="Clear photos help owners identify items"
              />

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>ITEM NAME</Text>
                <View style={[
                  styles.inputWrapper,
                  { borderColor: PRIMARY_BLUE + '15', shadowColor: PRIMARY_BLUE },
                  fieldErrors.itemName && styles.inputWrapperError,
                ]}>
                  <MaterialCommunityIcons name="tag-outline" size={22} color={PRIMARY_BLUE} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputNew}
                    placeholder="e.g. Silver MacBook Air M2"
                    placeholderTextColor="#94A3B8"
                    value={newItem.itemName}
                    maxLength={ITEM_NAME_LIMIT}
                    onChangeText={(val) => updateField('itemName', val)}
                  />
                </View>
                {fieldErrors.itemName ? <Text style={styles.fieldError}>{fieldErrors.itemName}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <CategoryPills
                  entries={categoryEntries}
                  loading={categoriesLoading}
                  selectedCategory={newItem.category}
                  onSelect={(category) => updateField('category', category)}
                  accentColor={PRIMARY_BLUE}
                />
                {fieldErrors.category ? <Text style={styles.fieldError}>{fieldErrors.category}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>LOCATION LOST</Text>
                <View style={[
                  styles.inputWrapper,
                  { borderColor: PRIMARY_BLUE + '15', shadowColor: PRIMARY_BLUE },
                  fieldErrors.location && styles.inputWrapperError,
                ]}>
                  <Ionicons name="location-outline" size={22} color={PRIMARY_BLUE} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputNew}
                    placeholder="e.g. Library 2nd Floor"
                    placeholderTextColor="#94A3B8"
                    value={newItem.location}
                    maxLength={LOCATION_LIMIT}
                    onChangeText={(val) => updateField('location', val)}
                  />
                </View>
                {fieldErrors.location ? <Text style={styles.fieldError}>{fieldErrors.location}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>ADDITIONAL DESCRIPTION</Text>
                <View style={[
                  styles.inputWrapper,
                  { height: 120, alignItems: 'flex-start', paddingTop: 15, borderColor: PRIMARY_BLUE + '15', shadowColor: PRIMARY_BLUE },
                  fieldErrors.description && styles.inputWrapperError,
                ]}>
                  <MaterialCommunityIcons name="text-box-outline" size={22} color={PRIMARY_BLUE} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputNew, { height: '100%', textAlignVertical: 'top' }]}
                    placeholder="Describe marks, colors, or specific features..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={newItem.description}
                    maxLength={DESCRIPTION_LIMIT}
                    onChangeText={(val) => updateField('description', val)}
                  />
                </View>
                <Text style={styles.characterCount}>{newItem.description.length}/{DESCRIPTION_LIMIT}</Text>
                {fieldErrors.description ? <Text style={styles.fieldError}>{fieldErrors.description}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>DATE & TIME LOST</Text>
                <View style={styles.dateTimeRow}>
                   <TouchableOpacity 
                     style={[
                       styles.inputWrapper,
                       { flex: 1, marginHorizontal: 0, marginRight: 15, borderColor: PRIMARY_BLUE + '30' },
                       fieldErrors.dateLost && styles.inputWrapperError,
                     ]}
                     onPress={() => setShowDatePicker(true)}
                   >
                      <Ionicons name="calendar-outline" size={24} color={PRIMARY_BLUE} style={styles.inputIcon} />
                      <View style={{ flex: 1 }}>
                         <Text style={styles.dateTimeLabel}>DATE LOST</Text>
                         <Text style={styles.dateTimeValue}>{newItem.dateLost}</Text>
                      </View>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={[
                       styles.inputWrapper,
                       { flex: 1, marginHorizontal: 0, borderColor: PRIMARY_BLUE + '30' },
                       fieldErrors.timeLost && styles.inputWrapperError,
                     ]}
                     onPress={() => setShowTimePicker(true)}
                   >
                      <MaterialCommunityIcons name="clock-outline" size={24} color={PRIMARY_BLUE} style={styles.inputIcon} />
                      <View style={styles.dateTimeTextWrap}>
                         <Text style={styles.dateTimeLabel}>TIME LOST</Text>
                         <Text style={styles.dateTimeValue} numberOfLines={1}>
                           {newItem.timeLost || 'Select Time'}
                         </Text>
                      </View>
                   </TouchableOpacity>
                </View>
                {(fieldErrors.dateLost || fieldErrors.timeLost) ? (
                  <Text style={styles.fieldError}>
                    {fieldErrors.dateLost || fieldErrors.timeLost}
                  </Text>
                ) : null}
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={onDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={false}
                  onChange={onTimeChange}
                />
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.draftBtnNew, (submitting || savingDraft) && { opacity: 0.7 }]}
                  onPress={handleSaveDraft}
                  disabled={submitting || savingDraft}
                >
                  {savingDraft ? (
                    <ActivityIndicator color={PRIMARY_BLUE} />
                  ) : (
                    <Text style={styles.draftBtnTextNew}>{draftId ? 'Update Draft' : 'Save Draft'}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtnNew, styles.submitBtnFlex, (submitting || savingDraft) && { opacity: 0.7 }]}
                  onPress={handleCreateItem}
                  disabled={submitting || savingDraft}
                >
                  {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnTextNew}>{draftId ? 'Publish Draft' : 'Submit Report'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_LIGHT },
  header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: SLATE_900 },
  addBtn: { width: 48, height: 48, backgroundColor: PRIMARY_BLUE, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: SLATE_900, fontWeight: '500' },
  listContent: { padding: 20, paddingBottom: 120 },
  card: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 24, padding: 12, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 5 }
    }),
    borderWidth: 1.5, borderColor: '#FFFFFF'
  },
  cardImageContainer: { width: 90, height: 90, borderRadius: 18, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
  adminBadgeSmall: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadgeTextSmall: {
    color: '#1E40AF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 7,
    letterSpacing: 0.5,
  },
  catWithIcon: { flexDirection: 'row', alignItems: 'center' },
  cardCategoryText: { fontSize: 10, fontWeight: '800', color: SLATE_400, textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: '900', color: SLATE_800, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 11, fontWeight: '600', color: SLATE_400 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 15, color: SLATE_400, marginTop: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#FFF' },
  modalContent: { flex: 1, backgroundColor: '#FFF' },
  modalHeaderNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 15,
  },
  modalBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitleCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  modalLogoText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: SLATE_900,
  },
  portalHeader: {
    paddingHorizontal: 25,
    marginTop: 20,
    marginBottom: 30,
  },
  portalTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  portalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: SLATE_900,
    marginBottom: 10,
  },
  portalSubtitle: {
    fontSize: 15,
    color: SLATE_500,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: SLATE_400,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 25,
    textTransform: 'uppercase',
  },
  uploadBox: {
    marginHorizontal: 25,
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 30,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  uploadInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SLATE_900,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: SLATE_400,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputWrapperError: {
    borderColor: '#F87171',
  },
  fieldError: {
    marginTop: 6,
    marginHorizontal: 25,
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
    marginHorizontal: 25,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputNew: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: SLATE_800,
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginRight: 28,
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: SLATE_400,
  },
  categoryScroll: {
    paddingLeft: 25,
    paddingRight: 10,
    paddingBottom: 5,
  },
  categoryPillNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
  },
  categoryPillTextNew: {
    fontSize: 14,
    fontWeight: '700',
    color: SLATE_600,
    marginLeft: 8,
  },
  categoryPillTextActiveNew: {
    color: '#FFF',
  },
  dateTimeRow: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    justifyContent: 'space-between',
  },
  dateTimeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dateTimeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: SLATE_400,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: SLATE_900,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 25,
    marginTop: 20,
  },
  draftBtnNew: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE + '12',
    borderWidth: 1.5,
    borderColor: PRIMARY_BLUE + '30',
  },
  draftBtnTextNew: {
    color: PRIMARY_BLUE,
    fontSize: 15,
    fontWeight: '800',
  },
  submitBtnNew: {
    backgroundColor: PRIMARY_BLUE,
    marginHorizontal: 25,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnFlex: {
    flex: 1.4,
    marginHorizontal: 0,
    marginTop: 0,
  },
  submitBtnTextNew: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
