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
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import { getAllReturnedItems } from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../../assets/images/jazeera_logo.png');

const CATEGORY_ICONS = {
  'ELECTRONICS': 'laptop',
  'DOCUMENTS': 'file-document-outline',
  'BOOKS': 'book-open-variant',
  'ACCESSORIES': 'watch',
  'CLOTHING': 'tshirt-crew-outline',
  'OTHER': 'cube-outline'
};

export default function ReturnedItemsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toastRef = useRef(null);

  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'lost', 'found'

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getAllReturnedItems();
      setReturnedItems(data || []);
    } catch (error) {
      console.error('Error fetching returned items:', error);
      showAppFailure('Failed to retrieve returned archives.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  const filteredItems = returnedItems.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.item_name && item.item_name.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.recipient_name && item.recipient_name.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q));

    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && item.type.toLowerCase() === activeTab;
  });

  const lostCount = returnedItems.filter(i => i.type === 'LOST').length;
  const foundCount = returnedItems.filter(i => i.type === 'FOUND').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>RETURNED ARCHIVES</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={Colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipient, item or location..."
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Segment tabs */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabButton, activeTab === 'all' && styles.subTabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.subTabButtonText, activeTab === 'all' && styles.subTabButtonTextActive]}>
            All ({returnedItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabButton, activeTab === 'lost' && styles.subTabButtonActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Text style={[styles.subTabButtonText, activeTab === 'lost' && styles.subTabButtonTextActive]}>
            Returned Lost ({lostCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabButton, activeTab === 'found' && styles.subTabButtonActive]}
          onPress={() => setActiveTab('found')}
        >
          <Text style={[styles.subTabButtonText, activeTab === 'found' && styles.subTabButtonTextActive]}>
            Returned Found ({foundCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching returned archive ledger...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <TouchableOpacity 
                key={`returned-${item.id}`} 
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() => router.push({
                  pathname: `/(admin)/item/${item.id}`,
                  params: { data: JSON.stringify({ ...item, type: item.type, isArchive: true }) }
                })}
              >
                {(item.imageURI || item.imageuri) ? (
                  <Image source={{ uri: item.imageURI || item.imageuri }} style={styles.itemCardImg} />
                ) : (
                  <View style={[styles.itemCardImgPlaceholder, { backgroundColor: item.type === 'LOST' ? '#EFF6FF' : '#D1FAE5' }]}>
                    <Ionicons 
                      name={item.type === 'LOST' ? "search-outline" : "checkmark-circle-outline"} 
                      size={28} 
                      color={item.type === 'LOST' ? '#1D4ED8' : '#10B981'} 
                    />
                  </View>
                )}

                <View style={styles.itemCardInfo}>
                  <View style={styles.itemCardHeaderRow}>
                    <Text style={styles.itemCardCategory}>{item.category}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: item.type === 'LOST' ? '#EFF6FF' : '#D1FAE5' }]}>
                      <Text style={[styles.typeBadgeText, { color: item.type === 'LOST' ? '#1D4ED8' : '#10B981' }]}>
                        {item.type}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.itemCardTitle} numberOfLines={1}>
                    {item.item_name}
                  </Text>
                  
          <View style={styles.recipientCard}>
            <Text style={styles.recipientLabel}>Returned To:</Text>
            <View style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
              <Text style={styles.recipientValue} numberOfLines={1}>{item.recipient_name || 'N/A'}</Text>
              {item.recipient_student_id && (
                <Text style={styles.recipientId}>({item.recipient_student_id})</Text>
              )}
            </View>
          </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.itemCardDetail}>
                      <Ionicons name="calendar-outline" size={12} /> {formatDate(item.returned_at)}
                    </Text>
                    <Text style={styles.itemCardDetail}>
                      <Ionicons name="location-outline" size={12} /> {item.location}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={56} color={Colors.slate300} />
              <Text style={styles.emptyText}>No matching returned archives found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 15,
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate900,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 4,
    borderRadius: 14,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  subTabButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subTabButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#64748B',
  },
  subTabButtonTextActive: {
    color: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
    marginTop: 12,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  itemCardImg: {
    width: 95,
    height: 125,
    borderRadius: 14,
    backgroundColor: Colors.slate100,
  },
  itemCardImgPlaceholder: {
    width: 95,
    height: 125,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCardInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  itemCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCardCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  itemCardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#0F172A',
    marginTop: 2,
  },
  recipientCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 6,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2
  },
  recipientLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#64748B',
  },
  recipientValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#4F46E5', // Indigo
  },
  recipientId: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#94A3B8',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemCardDetail: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  }
});
