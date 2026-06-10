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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  adminGetAllLostItems,
  adminGetAllFoundItems,
  deleteLostItem,
  deleteFoundItem,
} from '../../../src/services/supabase';
import ItemStatusBadge from '../../../src/components/ItemStatusBadge';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const { width } = Dimensions.get('window');

export default function AllItemsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);
  const { initialTab } = useLocalSearchParams();

  // States
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemTypeFilter, setItemTypeFilter] = useState(initialTab === 'found' ? 'found' : 'lost'); // 'lost' or 'found'
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (initialTab === 'found' || initialTab === 'lost') {
      setItemTypeFilter(initialTab);
    }
  }, [initialTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allLost, allFound] = await Promise.all([
        adminGetAllLostItems(),
        adminGetAllFoundItems(),
      ]);
      setLostItems(allLost || []);
      setFoundItems(allFound || []);
    } catch (error) {
      console.error('Error fetching property list:', error);
      showAppFailure('Failed to retrieve property logs.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Remove Lost Property Report
  const handleDeleteLost = async (item) => {
    showAppConfirm({
      title: 'Remove lost item',
      message: `Are you sure you want to permanently delete report for "${item.itemName}"?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteLostItem(item.id);
          setLostItems(prev => prev.filter(i => i.id !== item.id));
          toastRef.current?.show('Item Removed', 'Lost property report deleted.', 'success');
        } catch (err) {
          console.error('Delete lost failed:', err);
              showAppFailure('Failed to remove lost item.', 'Delete failed');
        }
      },
    });
  };

  // Remove Found Property Report
  const handleDeleteFound = async (item) => {
    showAppConfirm({
      title: 'Remove found item',
      message: `Are you sure you want to permanently delete report for "${item.itemName}"?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteFoundItem(item.id);
          setFoundItems(prev => prev.filter(i => i.id !== item.id));
          toastRef.current?.show('Item Removed', 'Found property report deleted.', 'success');
        } catch (err) {
          console.error('Delete found failed:', err);
              showAppFailure('Failed to remove found item.', 'Delete failed');
        }
      },
    });
  };

  // Filters based on search
  const filteredLostItems = lostItems.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.itemName && item.itemName.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  });

  const filteredFoundItems = foundItems.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.itemName && item.itemName.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {initialTab === 'lost' 
              ? 'LOST PROPERTY LOGS' 
              : initialTab === 'found' 
              ? 'FOUND PROPERTY LOGS' 
              : 'UNIVERSITY PROPERTY LOGS'}
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={Colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search in ${itemTypeFilter === 'lost' ? 'Lost' : 'Found'} Items...`}
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Sub tabs: Lost / Found Toggle (Only shown if initialTab is not passed) */}
      {!initialTab && (
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabButton, itemTypeFilter === 'lost' && styles.subTabButtonActive]}
            onPress={() => {
              setItemTypeFilter('lost');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.subTabButtonText, itemTypeFilter === 'lost' && styles.subTabButtonTextActive]}>
              Lost Items ({lostItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabButton, itemTypeFilter === 'found' && styles.subTabButtonActive]}
            onPress={() => {
              setItemTypeFilter('found');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.subTabButtonText, itemTypeFilter === 'found' && styles.subTabButtonTextActive]}>
              Found Items ({foundItems.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching database ledger...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {itemTypeFilter === 'lost' ? (
            filteredLostItems.length > 0 ? (
              filteredLostItems.map((item) => (
                <TouchableOpacity 
                  key={`lost-${item.id}`} 
                  style={styles.itemCard}
                  activeOpacity={0.9}
                  onPress={() => router.push({
                    pathname: `/(admin)/item/${item.id}`,
                    params: { data: JSON.stringify({ ...item, type: 'LOST' }) }
                  })}
                >
                  {item.imageURI ? (
                    <Image source={{ uri: item.imageURI }} style={styles.itemCardImg} />
                  ) : (
                    <View style={[styles.itemCardImgPlaceholder, { backgroundColor: Colors.lostBadge }]}>
                      <Ionicons name="search" size={28} color={Colors.lostBadgeText} />
                    </View>
                  )}

                  <View style={styles.itemCardInfo}>
                    <View style={styles.itemCardHeaderRow}>
                      <Text style={styles.itemCardCategory}>{item.category}</Text>
                      <View style={styles.itemCardBadgeRow}>
                        <ItemStatusBadge item={item} compact />
                        <Text style={[styles.itemCardBadge, styles.lostBadgeText]}>LOST</Text>
                      </View>
                    </View>
                    <Text style={styles.itemCardTitle} numberOfLines={1}>
                      {item.itemName}
                    </Text>
                    <Text style={styles.itemCardDetail} numberOfLines={1}>
                      <Ionicons name="location-outline" size={12} /> {item.location}
                    </Text>
                    <Text style={styles.itemCardDetail}>
                      <Ionicons name="person-outline" size={12} /> Owner: {item.ownerName || 'Unknown'}
                    </Text>
                    <Text style={styles.itemCardDetail}>
                      <Ionicons name="call-outline" size={12} /> Contact: {item.phnum || 'N/A'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.itemDeleteBtn}
                    onPress={() => handleDeleteLost(item)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={56} color={Colors.slate300} />
                <Text style={styles.emptyText}>No matching lost items found.</Text>
              </View>
            )
          ) : filteredFoundItems.length > 0 ? (
            filteredFoundItems.map((item) => (
              <TouchableOpacity 
                key={`found-${item.id}`} 
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() => router.push({
                  pathname: `/(admin)/item/${item.id}`,
                  params: { data: JSON.stringify({ ...item, type: 'FOUND' }) }
                })}
              >
                {item.imageURI ? (
                  <Image source={{ uri: item.imageURI }} style={styles.itemCardImg} />
                ) : (
                  <View style={[styles.itemCardImgPlaceholder, { backgroundColor: Colors.foundBadge }]}>
                    <Ionicons name="checkmark-circle" size={28} color={Colors.foundBadgeText} />
                  </View>
                )}

                <View style={styles.itemCardInfo}>
                  <View style={styles.itemCardHeaderRow}>
                    <Text style={styles.itemCardCategory}>{item.category}</Text>
                    <View style={styles.itemCardBadgeRow}>
                      <ItemStatusBadge item={item} compact />
                      <Text style={[styles.itemCardBadge, styles.foundBadgeText]}>FOUND</Text>
                    </View>
                  </View>
                  <Text style={styles.itemCardTitle} numberOfLines={1}>
                    {item.itemName}
                  </Text>
                  <Text style={styles.itemCardDetail} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} /> {item.location}
                  </Text>
                  <Text style={styles.itemCardDetail}>
                    <Ionicons name="person-outline" size={12} /> Finder: {item.finderName || 'Unknown'}
                  </Text>
                  <Text style={styles.itemCardDetail}>
                    <Ionicons name="call-outline" size={12} /> Contact: {item.phnum || 'N/A'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.itemDeleteBtn}
                  onPress={() => handleDeleteFound(item)}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={56} color={Colors.slate300} />
              <Text style={styles.emptyText}>No matching found items found.</Text>
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
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate900,
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
  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  subTabButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  subTabButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.slate500,
  },
  subTabButtonTextActive: {
    color: Colors.slate900,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 12,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  itemCardImg: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 12,
  },
  itemCardImgPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemCardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  itemCardCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCardBadge: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  lostBadgeText: {
    color: Colors.error,
  },
  foundBadgeText: {
    color: Colors.success,
  },
  itemCardTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 15,
    color: Colors.slate800,
    marginTop: 2,
    marginBottom: 4,
  },
  itemCardDetail: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.slate500,
    marginTop: 1,
  },
  itemDeleteBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignSelf: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate400,
    textAlign: 'center',
  },
});
