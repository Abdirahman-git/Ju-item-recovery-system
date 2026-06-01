import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, DrawerActions, useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessToast from '../../../src/components/SuccessToast';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

export default function AdminMyItemsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('lost');
  const [loading, setLoading] = useState(true);
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [user, setUser] = useState(null);
  const toastRef = useRef(null);

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

  const handleDelete = async (itemId, type) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const table = type === 'lost' ? 'lost_items' : 'found_items';
              const { error } = await supabase.from(table).delete().eq('id', itemId);
              if (error) throw error;

              toastRef.current?.show('Deleted!', 'Item has been removed successfully.');

              if (type === 'lost') {
                setLostItems(lostItems.filter(i => i.id !== itemId));
              } else {
                setFoundItems(foundItems.filter(i => i.id !== itemId));
              }
            } catch (error) {
              toastRef.current?.show('Error', 'Could not delete item. Please try again.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleClearAll = async () => {
    const itemCount = activeTab === 'lost' ? lostItems.length : foundItems.length;
    if (itemCount === 0) return;

    Alert.alert(
      'Clear All Items',
      `Are you sure you want to delete all ${activeTab} items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const table = activeTab === 'lost' ? 'lost_items' : 'found_items';
              const { error } = await supabase.from(table).delete().eq('email', user.email);
              if (error) throw error;

              toastRef.current?.show('Cleared All!', `All ${activeTab} items have been removed.`);

              if (activeTab === 'lost') {
                setLostItems([]);
              } else {
                setFoundItems([]);
              }
            } catch (error) {
              Alert.alert('Error', 'Could not clear items.');
            }
          }
        }
      ]
    );
  };

  const ItemCard = ({ item, type, index }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      style={styles.card}
      onPress={() => router.push({
        pathname: `/(admin)/item/${item.id}`,
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
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            // Stop propagation to prevent navigation on delete
            handleDelete(item.id, type);
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
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
        </View>

        <Text style={styles.itemTitle}>{item.itemName}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}> Reported {type === 'lost' ? item.dateLost : item.dateFound}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.infoText}> {item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header aligned with Admin pages */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
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
                <Text style={styles.pageSubtitle}>Manage your reported items.</Text>
             </View>
             <TouchableOpacity 
               style={styles.clearAllBtn}
               onPress={() => handleClearAll()}
             >
                <Ionicons name="trash-bin-outline" size={16} color="#EF4444" />
                <Text style={styles.clearAllText}>Clear All</Text>
             </TouchableOpacity>
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

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerLogoSmall: { width: 28, height: 28, marginRight: 8 },
  headerBrandText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#0F172A' },

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
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14,
    borderWidth: 1.5, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1
  },
  imageWrapper: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#F8FAFC', overflow: 'hidden', position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: {
    position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2
  },
  cardBody: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '800' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F1F5F9' },
  categoryText: { fontSize: 9, fontWeight: '700', color: '#475569' },
  itemTitle: { fontSize: 18, fontWeight: '850', color: '#1E293B', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoText: { fontSize: 12, color: '#64748B' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontFamily: 'Inter_500Medium' }
});
