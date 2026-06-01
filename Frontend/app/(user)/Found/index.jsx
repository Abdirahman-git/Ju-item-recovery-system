import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Image, Modal,
  Dimensions, Platform, StatusBar, Animated as RNAnimated
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Categories } from '../../../src/constants/categories';
import { supabase, getAllFoundItems, createFoundItem } from '../../../src/services/supabase';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import SuccessToast from '../../../src/components/SuccessToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateFoundItemForm, getValidationAlertMessage } from '../../../src/utils/itemFormValidation';
import { pickItemImage, getDefaultTimeLabel } from '../../../src/utils/pickItemImage';
import {
  formatItemTime,
  parseTimeLabelToDate,
  isFutureDateTime,
  shouldCommitPickerValue,
} from '../../../src/utils/itemTimeUtils';

const JU_LOGO = require('../../../assets/images/jazeera_logo.png');
const { width } = Dimensions.get('window');
const PRIMARY_GREEN = '#10B981';
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const BG_LIGHT = '#F8FAFC';

const CATEGORY_MAP = [
  { name: 'Electronics', icon: 'laptop', type: 'MaterialCommunityIcons' },
  { name: 'Clothing', icon: 'tshirt', type: 'FontAwesome5' },
  { name: 'Accessories', icon: 'watch', type: 'MaterialCommunityIcons' },
  { name: 'Books', icon: 'book-open-variant', type: 'MaterialCommunityIcons' },
  { name: 'Documents', icon: 'file-document-outline', type: 'MaterialCommunityIcons' },
  { name: 'Keys', icon: 'key', type: 'MaterialCommunityIcons' },
  { name: 'Bags', icon: 'bag-personal', type: 'MaterialCommunityIcons' },
  { name: 'ID/Cards', icon: 'card-account-details-outline', type: 'MaterialCommunityIcons' },
  { name: 'Other', icon: 'dots-horizontal-circle-outline', type: 'MaterialCommunityIcons' },
];

const CATEGORY_ICONS = {
  'Electronics': 'laptop',
  'Documents': 'file-document-outline',
  'Personal': 'wallet-outline',
  'Books': 'book-open-variant',
  'Other': 'dots-horizontal-circle-outline'
};

export default function FoundPage() {
  const router = useRouter();
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

  // New Item Form State
  const [newItem, setNewItem] = useState({
    itemName: '',
    description: '',
    location: '',
    category: '',
    dateFound: new Date().toISOString().split('T')[0],
    timeFound: getDefaultTimeLabel(),
    finderName: '',
    phnum: '',
    imageURI: ''
  });

  const pickImage = async () => {
    const uri = await pickItemImage();
    if (uri) {
      setNewItem({ ...newItem, imageURI: uri });
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setNewItem({ ...newItem, dateFound: dateString });
      setTempDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!shouldCommitPickerValue(event) || !selectedTime) {
      if (Platform.OS === 'ios') setShowTimePicker(false);
      return;
    }

    if (isFutureDateTime(newItem.dateFound, selectedTime)) {
      Alert.alert('Invalid Time', 'You cannot select a future time for today.');
      if (Platform.OS === 'ios') setShowTimePicker(false);
      return;
    }

    const timeString = formatItemTime(selectedTime);
    setTempTime(selectedTime);
    setNewItem((prev) => ({ ...prev, timeFound: timeString }));
    if (Platform.OS === 'ios') setShowTimePicker(false);
  };

  const fetchFoundItems = async () => {
    try {
      setLoading(true);
      const data = await getAllFoundItems();
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching found items:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFoundItems();
      
      // Auto-fill user details
      AsyncStorage.getItem('userSession').then(data => {
        if (data) {
          const user = JSON.parse(data);
          setNewItem(prev => ({
            ...prev,
            finderName: user.userName || '',
            phnum: user.phone || '',
            email: user.email || ''
          }));
        }
      });
    }, [])
  );

  const handleCreateItem = async () => {
    const { valid, missing } = validateFoundItemForm(newItem);
    if (!valid) {
      Alert.alert('Required Fields', getValidationAlertMessage(missing));
      return;
    }

    try {
      setSubmitting(true);
      
      const sessionData = await AsyncStorage.getItem('userSession');
      if (!sessionData) throw new Error("No user session found. Please login again.");
      
      const user = JSON.parse(sessionData);
      
      const itemToSave = {
        ...newItem,
        finderName: user.userName || 'Student',
        phnum: user.phone || '',
        email: user.email,
        finderId: user.email,
      };

      const success = await createFoundItem(itemToSave, user.role === 'admin');
      if (success) {
        setModalVisible(false);
        setTimeout(() => {
          const successMsg = user.role === 'admin' 
            ? 'Found Item Published Directly! 📢' 
            : 'Found Item Added Successfully!';
          const successSub = user.role === 'admin' 
            ? 'The listing is live on the student feed immediately.' 
            : 'Please wait for admin approval before it appears in public feed.';
          toastRef.current?.show(successMsg, successSub);
        }, 300);
        const resetDate = new Date().toISOString().split('T')[0];
        const resetTime = getDefaultTimeLabel();
        setTempTime(parseTimeLabelToDate(resetTime, resetDate));
        setNewItem({
          itemName: '', description: '', location: '', category: '',
          dateFound: resetDate, timeFound: resetTime,
          finderName: user.userName || '', phnum: user.phone || '', imageURI: ''
        });
        fetchFoundItems();
      }
    } catch (error) {
      console.error('Found item post failed:', error);
      toastRef.current?.show(
        'Error',
        error?.message || 'Failed to report item. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ItemCard = ({ item, index }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => router.push({
          pathname: `/(user)/item/${item.id}`,
          params: { data: JSON.stringify({ ...item, type: 'FOUND' }) }
        })}
      >
        <View style={styles.cardImageContainer}>
          {item.imageURI ? (
            <Image source={{ uri: item.imageURI }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <MaterialCommunityIcons name={CATEGORY_ICONS[item.category] || 'cube-outline'} size={35} color={SLATE_400} opacity={0.5} />
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.catWithIcon}>
              <MaterialCommunityIcons name={CATEGORY_ICONS[item.category] || 'tag-outline'} size={12} color={SLATE_400} />
              <Text style={styles.cardCategoryText}> {item.category}</Text>
            </View>
            {item.email && (item.email.toLowerCase().includes('admin') || item.finderId === 'admin-01') && (
              <View style={styles.adminBadgeSmall}>
                <Ionicons name="shield-checkmark" size={8} color="#10B981" style={{ marginRight: 2 }} />
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
              <Text style={styles.footerText}> {item.dateFound}</Text>
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
          <Text style={styles.headerTitle}>Found Items</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={SLATE_400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search found items..."
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
            <MaterialCommunityIcons name="cube-scan" size={80} color={SLATE_400} opacity={0.3} />
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
                 <Text style={styles.portalTag}>REPORTING PORTAL</Text>
                 <Text style={styles.portalTitle}>Report a Found Item.</Text>
                 <Text style={styles.portalSubtitle}>Provide the details below to help us return it to its rightful owner.</Text>
              </View>

              {/* Visual Evidence */}
              <Text style={styles.fieldLabel}>VISUAL EVIDENCE (REQUIRED)</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                {newItem.imageURI ? (
                  <View style={{ flex: 1 }}>
                     <Image source={{ uri: newItem.imageURI }} style={styles.uploadedImage} resizeMode="cover" />
                     <TouchableOpacity 
                       style={styles.removeImageBtn} 
                       onPress={(e) => {
                         e.stopPropagation();
                         setNewItem({ ...newItem, imageURI: '' });
                       }}
                     >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                     </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadInner}>
                    <View style={styles.uploadIconCircle}>
                        <MaterialCommunityIcons name="camera-plus-outline" size={32} color={PRIMARY_GREEN} />
                    </View>
                    <Text style={styles.uploadTitle}>Upload or drag photos</Text>
                    <Text style={styles.uploadSubtitle}>Clear photos help owners identify items</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>ITEM NAME</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="tag-outline" size={22} color={PRIMARY_GREEN} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputNew}
                    placeholder="e.g. Silver MacBook Air M2"
                    placeholderTextColor="#94A3B8"
                    value={newItem.itemName}
                    onChangeText={(val) => setNewItem({ ...newItem, itemName: val })}
                  />
                </View>
              </View>
 
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  {CATEGORY_MAP.map(cat => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.categoryPillNew, newItem.category === cat.name && styles.categoryPillActiveNew]}
                      onPress={() => setNewItem({ ...newItem, category: cat.name })}
                    >
                      {cat.type === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={cat.icon} size={18} color={newItem.category === cat.name ? '#FFF' : PRIMARY_GREEN} />}
                      {cat.type === 'FontAwesome5' && <FontAwesome5 name={cat.icon} size={16} color={newItem.category === cat.name ? '#FFF' : PRIMARY_GREEN} />}
                      <Text style={[styles.categoryPillTextNew, newItem.category === cat.name && styles.categoryPillTextActiveNew]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>LOCATION FOUND</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={22} color={PRIMARY_GREEN} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputNew}
                    placeholder="e.g. Library 2nd Floor"
                    placeholderTextColor="#94A3B8"
                    value={newItem.location}
                    onChangeText={(val) => setNewItem({ ...newItem, location: val })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>ADDITIONAL DESCRIPTION</Text>
                <View style={[styles.inputWrapper, { height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
                  <MaterialCommunityIcons name="text-box-outline" size={22} color={PRIMARY_GREEN} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputNew, { height: '100%', textAlignVertical: 'top' }]}
                    placeholder="Describe marks, colors, or specific features..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={newItem.description}
                    onChangeText={(val) => setNewItem({ ...newItem, description: val })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>DATE & TIME FOUND</Text>
                <View style={styles.dateTimeRow}>
                   <TouchableOpacity 
                     style={[styles.inputWrapper, { flex: 1, marginHorizontal: 0, marginRight: 15, borderColor: PRIMARY_GREEN + '30' }]}
                     onPress={() => setShowDatePicker(true)}
                   >
                      <Ionicons name="calendar-outline" size={24} color={PRIMARY_GREEN} style={styles.inputIcon} />
                      <View style={{ flex: 1 }}>
                         <Text style={styles.dateTimeLabel}>DATE FOUND</Text>
                         <Text style={styles.dateTimeValue}>{newItem.dateFound}</Text>
                      </View>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={[styles.inputWrapper, { flex: 1, marginHorizontal: 0, borderColor: PRIMARY_GREEN + '30' }]}
                     onPress={() => setShowTimePicker(true)}
                   >
                      <MaterialCommunityIcons name="clock-outline" size={24} color={PRIMARY_GREEN} style={styles.inputIcon} />
                      <View style={styles.dateTimeTextWrap}>
                         <Text style={styles.dateTimeLabel}>TIME FOUND</Text>
                         <Text style={styles.dateTimeValue} numberOfLines={1}>
                           {newItem.timeFound || 'Select Time'}
                         </Text>
                      </View>
                   </TouchableOpacity>
                </View>
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

              <TouchableOpacity
                style={[styles.submitBtnNew, submitting && { opacity: 0.7 }]}
                onPress={handleCreateItem}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnTextNew}>Submit Report</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomBottomTab />
      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_LIGHT },
  header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: SLATE_900 },
  addBtn: { width: 48, height: 48, backgroundColor: PRIMARY_GREEN, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
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
    backgroundColor: '#E6FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadgeTextSmall: {
    color: '#047857',
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
    color: PRIMARY_GREEN,
    letterSpacing: 1,
    marginBottom: 8,
  },
  portalTitle: {
    fontSize: 32,
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
    fontSize: 11,
    fontWeight: '900',
    color: SLATE_900,
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 25,
  },
  uploadBox: {
    marginHorizontal: 25,
    height: 180,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: PRIMARY_GREEN + '40',
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
    backgroundColor: PRIMARY_GREEN + '10',
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
    marginBottom: 25,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN + '25',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 70,
    marginHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
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
  categoryScroll: {
    paddingLeft: 25,
    paddingRight: 10,
    paddingBottom: 5,
  },
  categoryPillNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN + '25',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryPillActiveNew: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
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
  submitBtnNew: {
    backgroundColor: PRIMARY_GREEN,
    marginHorizontal: 25,
    height: 75,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  submitBtnTextNew: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
