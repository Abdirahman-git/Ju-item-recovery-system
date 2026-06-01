import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, Dimensions, StatusBar } from 'react-native';
import ReAnimated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, getMatchCountsForItems } from '../../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomBottomTab from '../../../src/components/CustomBottomTab';
import { useFocusEffect } from '@react-navigation/native';
import { useRef } from 'react';
import SuccessToast from '../../../src/components/SuccessToast';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

export default function MyItemsPage() {
  const WITHDRAW_WINDOW_MINUTES = 15;
  const WITHDRAW_WINDOW_MS = WITHDRAW_WINDOW_MINUTES * 60 * 1000;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('lost'); // 'lost' or 'found'
  const [loading, setLoading] = useState(true);
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [user, setUser] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [lostMatchCounts, setLostMatchCounts] = useState({});
  const [foundMatchCounts, setFoundMatchCounts] = useState({});
  const toastRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchUserAndItems = async () => {
    try {
      setLoading(true);
      const sessionData = await AsyncStorage.getItem('userSession');
      if (!sessionData) {
        setLoading(false);
        return;
      }
      const userData = JSON.parse(sessionData);
      setUser(userData);

      const userEmail = userData.email;

      // Fetch Lost Items
      const { data: lostData, error: lostError } = await supabase
        .from('lost_items')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false });

      if (lostError) throw lostError;
      setLostItems(lostData || []);

      // Fetch Found Items
      const { data: foundData, error: foundError } = await supabase
        .from('found_items')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false });

      if (foundError) throw foundError;
      setFoundItems(foundData || []);

      const [lostCounts, foundCounts] = await Promise.all([
        getMatchCountsForItems(lostData || [], 'lost'),
        getMatchCountsForItems(foundData || [], 'found'),
      ]);
      setLostMatchCounts(lostCounts);
      setFoundMatchCounts(foundCounts);

    } catch (error) {
      console.error('Error fetching items:', error.message);
      Alert.alert('Error', 'Failed to load your items.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserAndItems();
    }, [])
  );

  const getWithdrawMeta = (item) => {
    if (!item?.created_at) {
      return { canWithdraw: false, minutesLeft: 0, label: '' };
    }

    const createdAtMs = new Date(item.created_at).getTime();
    if (Number.isNaN(createdAtMs)) {
      return { canWithdraw: false, minutesLeft: 0, label: '' };
    }

    const elapsed = Math.max(0, nowTs - createdAtMs);
    const remainingMs = WITHDRAW_WINDOW_MS - elapsed;
    const canWithdraw = remainingMs > 0;
    const minutesLeft = canWithdraw ? Math.ceil(remainingMs / 60000) : 0;

    return {
      canWithdraw,
      minutesLeft,
      label: canWithdraw ? `Withdraw in ${minutesLeft} min` : '',
    };
  };

  const handleWithdraw = async (item, type) => {
    const meta = getWithdrawMeta(item);
    if (!meta.canWithdraw) {
      toastRef.current?.show(
        'Withdraw Expired',
        `You can withdraw only within ${WITHDRAW_WINDOW_MINUTES} minutes after posting.`,
        'error'
      );
      return;
    }

    Alert.alert(
      'Withdraw Item',
      `Are you sure you want to withdraw this report? (${meta.minutesLeft} min left)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              const table = type === 'lost' ? 'lost_items' : 'found_items';
              const { error } = await supabase.from(table).delete().eq('id', item.id);
              if (error) throw error;

              toastRef.current?.show('Withdrawn!', 'Your report has been withdrawn successfully.');

              if (type === 'lost') {
                setLostItems(lostItems.filter(i => i.id !== item.id));
              } else {
                setFoundItems(foundItems.filter(i => i.id !== item.id));
              }
            } catch (error) {
              toastRef.current?.show('Error', 'Could not withdraw item. Please try again.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleClearAll = async () => {
    const activeItems = activeTab === 'lost' ? lostItems : foundItems;
    const withdrawableItems = activeItems.filter((item) => getWithdrawMeta(item).canWithdraw);
    const skippedCount = activeItems.length - withdrawableItems.length;
    if (withdrawableItems.length === 0) {
      toastRef.current?.show(
        'No Withdrawable Items',
        `Only items posted within ${WITHDRAW_WINDOW_MINUTES} minutes can be withdrawn.`,
        'error'
      );
      return;
    }

    Alert.alert(
      'Withdraw Recent Items',
      `Withdraw ${withdrawableItems.length} ${activeTab} item(s)? ${skippedCount > 0 ? `${skippedCount} old item(s) will be kept.` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              const table = activeTab === 'lost' ? 'lost_items' : 'found_items';
              const withdrawIds = withdrawableItems.map((item) => item.id);
              const { error } = await supabase.from(table).delete().in('id', withdrawIds);
              if (error) throw error;

              toastRef.current?.show(
                'Withdraw Complete',
                skippedCount > 0
                  ? `${withdrawableItems.length} withdrawn. ${skippedCount} older item(s) were not changed.`
                  : `All eligible ${activeTab} items were withdrawn.`
              );

              if (activeTab === 'lost') {
                setLostItems((prev) => prev.filter((i) => !withdrawIds.includes(i.id)));
              } else {
                setFoundItems((prev) => prev.filter((i) => !withdrawIds.includes(i.id)));
              }
            } catch (error) {
              Alert.alert('Error', 'Could not withdraw items.');
            }
          }
        }
      ]
    );
  };

  const ItemCard = ({ item, type, index }) => {
    const withdrawMeta = getWithdrawMeta(item);
    const matchCount = type === 'lost'
      ? (lostMatchCounts[item.id] || 0)
      : (foundMatchCounts[item.id] || 0);

    return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={styles.card}
      onPress={() => router.push({
        pathname: `/(user)/item/${item.id}`,
        params: { data: JSON.stringify({ ...item, type: type.toUpperCase() }) }
      })}
    >
      <View style={styles.imageWrapper}>
        {item.imageURI ? (
          <Image source={{ uri: item.imageURI }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color="#CBD5E1" />
          </View>
        )}
        {withdrawMeta.canWithdraw && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              handleWithdraw(item, type);
            }}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={18}
              color="#EF4444"
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: type === 'lost' ? '#FEE2E2' : '#DCFCE7' }]}>
            <Text style={[styles.statusText, { color: type === 'lost' ? '#EF4444' : '#10B981' }]}>
              {type.toUpperCase()}
            </Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
          </View>
          {matchCount > 0 && item.is_approved !== false && (
            <View style={styles.matchBadge}>
              <MaterialCommunityIcons name="auto-fix" size={10} color="#1E40AF" />
              <Text style={styles.matchBadgeText}>{matchCount} match{matchCount > 1 ? 'es' : ''}</Text>
            </View>
          )}
        </View>

        <Text style={styles.itemTitle}>{item.itemName}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}> Reported {type === 'lost' ? item.dateLost : item.dateFound}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}>
            {type === 'lost'
              ? (item.timeLost || item.timelost || 'Time not specified')
              : (item.timeFound || item.timefound || 'Time not specified')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}> {item.location}</Text>
        </View>
        {withdrawMeta.canWithdraw && (
          <View style={styles.withdrawInfoRow}>
            <Ionicons
              name="timer-outline"
              size={14}
              color="#16A34A"
            />
            <Text style={styles.withdrawInfoText}>
              {' '}{withdrawMeta.label}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
  };

  const hasWithdrawableItems = (activeTab === 'lost' ? lostItems : foundItems)
    .some((item) => getWithdrawMeta(item).canWithdraw);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header aligned with other pages */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={JU_LOGO} style={styles.headerLogoSmall} />
          <Text style={styles.headerBrandText}>Jazeera University</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
             <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>My Items</Text>
                <Text style={styles.pageSubtitle}>Manage reports and withdraw within 15 minutes.</Text>
             </View>
             {hasWithdrawableItems && (
               <TouchableOpacity 
                 style={styles.clearAllBtn}
                 onPress={() => handleClearAll()}
               >
                  <Ionicons name="arrow-undo-outline" size={16} color="#EF4444" />
                  <Text style={styles.clearAllText}>Withdraw Recent</Text>
               </TouchableOpacity>
             )}
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lost' && styles.activeTab]}
            onPress={() => setActiveTab('lost')}
          >
            <Text style={[styles.tabLabel, activeTab === 'lost' && styles.activeTabLabel]}>My Lost Items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'found' && styles.activeTab]}
            onPress={() => setActiveTab('found')}
          >
            <Text style={[styles.tabLabel, activeTab === 'found' && styles.activeTabLabel]}>My Found Items</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#94A3B8" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.itemsList}>
            {(activeTab === 'lost' ? lostItems : foundItems).length > 0 ? (
              (activeTab === 'lost' ? lostItems : foundItems).map((item, index) => (
                <ItemCard key={item.id} item={item} type={activeTab} index={index} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="folder-open-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyText}>No {activeTab} items reported yet.</Text>
              </View>
            )}
            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>

      <CustomBottomTab />
      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10,
    backgroundColor: '#FFF'
  },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerLogoSmall: { width: 28, height: 28, marginRight: 8 },
  headerBrandText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  scrollContainer: { paddingHorizontal: 20, paddingTop: 20 },
  titleSection: { marginBottom: 25 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 18 },
  clearAllBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF1F2', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  clearAllText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#EF4444', 
    marginLeft: 6 
  },

  tabContainer: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 25, padding: 6, marginBottom: 30
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  tabLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeTabLabel: { color: '#1E40AF' },

  itemsList: { gap: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginBottom: 20
  },
  imageWrapper: { height: 190, width: '100%', position: 'relative', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: {
    position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3
  },
  cardBody: { padding: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  categoryBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  matchBadgeText: { fontSize: 10, fontWeight: '800', color: '#1E40AF' },

  itemTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  withdrawInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  withdrawInfoText: { fontSize: 12, color: '#16A34A', fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#94A3B8', fontWeight: '600' },
});

