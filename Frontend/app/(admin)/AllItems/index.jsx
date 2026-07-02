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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  adminGetAllLostItems,
  adminGetAllFoundItems,
  deleteLostItem,
  deleteFoundItem,
} from '../../../src/services/supabase';
import ItemStatusBadge from '../../../src/components/ItemStatusBadge';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

export default function AllItemsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toastRef = useRef(null);
  const { initialTab } = useLocalSearchParams();

  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemTypeFilter, setItemTypeFilter] = useState(
    initialTab === 'found' ? 'found' : 'lost'
  );
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

  const handleDeleteLost = async (item) => {
    showAppConfirm({
      title: 'Remove lost item',
      message: `Are you sure you want to permanently delete report for "${item.itemName}"?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteLostItem(item.id);
          setLostItems((prev) => prev.filter((i) => i.id !== item.id));
          toastRef.current?.show('Item Removed', 'Lost property report deleted.', 'success');
        } catch (err) {
          console.error('Delete lost failed:', err);
          showAppFailure('Failed to remove lost item.', 'Delete failed');
        }
      },
    });
  };

  const handleDeleteFound = async (item) => {
    showAppConfirm({
      title: 'Remove found item',
      message: `Are you sure you want to permanently delete report for "${item.itemName}"?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteFoundItem(item.id);
          setFoundItems((prev) => prev.filter((i) => i.id !== item.id));
          toastRef.current?.show('Item Removed', 'Found property report deleted.', 'success');
        } catch (err) {
          console.error('Delete found failed:', err);
          showAppFailure('Failed to remove found item.', 'Delete failed');
        }
      },
    });
  };

  const query = searchQuery.trim().toLowerCase();
  const filterByQuery = (item) =>
    !query ||
    item.itemName?.toLowerCase().includes(query) ||
    item.category?.toLowerCase().includes(query) ||
    item.location?.toLowerCase().includes(query) ||
    item.ownerName?.toLowerCase().includes(query) ||
    item.finderName?.toLowerCase().includes(query);

  const filteredLostItems = lostItems.filter(filterByQuery);
  const filteredFoundItems = foundItems.filter(filterByQuery);

  const activeItems = itemTypeFilter === 'lost' ? filteredLostItems : filteredFoundItems;
  const totalItems = lostItems.length + foundItems.length;
  const fixedTab = initialTab === 'lost' || initialTab === 'found';

  const openItem = (item, type) => {
    router.push({
      pathname: `/(admin)/item/${item.id}`,
      params: { data: JSON.stringify({ ...item, type }) },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="All Items"
        subtitle="University property logs"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Item Management"
          title={fixedTab ? `${itemTypeFilter === 'lost' ? 'Lost' : 'Found'} items` : 'All property logs'}
          subtitle="Browse reports, inspect status, and remove invalid or duplicate items."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNum}>{totalItems}</Text>
            <Text style={styles.statLabel}>Total items</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLost]}>
            <Text style={[styles.statNum, styles.statNumLost]}>{lostItems.length}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
          <View style={[styles.statCard, styles.statCardFound]}>
            <Text style={[styles.statNum, styles.statNumFound]}>{foundItems.length}</Text>
            <Text style={styles.statLabel}>Found</Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${itemTypeFilter === 'lost' ? 'lost' : 'found'} items...`}
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {!fixedTab ? (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, itemTypeFilter === 'lost' && styles.tabBtnActive]}
              onPress={() => setItemTypeFilter('lost')}
            >
              <Text style={[styles.tabText, itemTypeFilter === 'lost' && styles.tabTextActive]}>
                Lost ({lostItems.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, itemTypeFilter === 'found' && styles.tabBtnActive]}
              onPress={() => setItemTypeFilter('found')}
            >
              <Text style={[styles.tabText, itemTypeFilter === 'found' && styles.tabTextActive]}>
                Found ({foundItems.length})
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading property logs...</Text>
          </View>
        ) : activeItems.length > 0 ? (
          activeItems.map((item) => {
            const isLost = itemTypeFilter === 'lost';
            return (
              <TouchableOpacity
                key={`${itemTypeFilter}-${item.id}`}
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() => openItem(item, isLost ? 'LOST' : 'FOUND')}
              >
                {item.imageURI ? (
                  <Image source={{ uri: item.imageURI }} style={styles.itemCardImg} />
                ) : (
                  <View
                    style={[
                      styles.itemCardImgPlaceholder,
                      { backgroundColor: isLost ? Colors.lostBadge : Colors.foundBadge },
                    ]}
                  >
                    <Ionicons
                      name={isLost ? 'help-buoy-outline' : 'checkmark-circle-outline'}
                      size={28}
                      color={isLost ? Colors.lostBadgeText : Colors.foundBadgeText}
                    />
                  </View>
                )}

                <View style={styles.itemCardInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
                    <View style={styles.badges}>
                      <ItemStatusBadge item={item} compact />
                      <View style={[styles.typePill, isLost ? styles.typePillLost : styles.typePillFound]}>
                        <Text style={[styles.typePillText, isLost ? styles.typeTextLost : styles.typeTextFound]}>
                          {isLost ? 'LOST' : 'FOUND'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.itemName}
                  </Text>
                  <Text style={styles.itemLine} numberOfLines={1}>
                    <Ionicons name="location-outline" size={13} color={Colors.slate500} /> {item.location || 'Unknown'}
                  </Text>
                  <Text style={styles.itemLine} numberOfLines={1}>
                    <Ionicons name="person-outline" size={13} color={Colors.slate500} />{' '}
                    {isLost ? `Owner: ${item.ownerName || 'Unknown'}` : `Finder: ${item.finderName || 'Unknown'}`}
                  </Text>
                  <Text style={styles.itemLine} numberOfLines={1}>
                    <Ionicons name="call-outline" size={13} color={Colors.slate500} /> Contact: {item.phnum || 'N/A'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.itemDeleteBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    if (isLost) handleDeleteLost(item);
                    else handleDeleteFound(item);
                  }}
                >
                  <Ionicons name="trash-outline" size={19} color={Colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={56} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No matching items</Text>
            <Text style={styles.emptyText}>Try another search keyword or switch tabs.</Text>
          </View>
        )}
      </ScrollView>

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCardPrimary: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  statCardLost: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statCardFound: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.primaryDark,
  },
  statNumLost: {
    color: Colors.error,
  },
  statNumFound: {
    color: Colors.success,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.slate600,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate900,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate500,
  },
  tabTextActive: {
    color: Colors.slate900,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  itemCardImg: {
    width: 68,
    height: 68,
    borderRadius: 14,
    marginRight: 12,
  },
  itemCardImgPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 14,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCardInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typePillLost: {
    backgroundColor: '#FEF2F2',
  },
  typePillFound: {
    backgroundColor: '#ECFDF5',
  },
  typePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  typeTextLost: {
    color: Colors.error,
  },
  typeTextFound: {
    color: Colors.success,
  },
  itemName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.slate900,
    marginBottom: 3,
  },
  itemLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.slate600,
    marginTop: 2,
  },
  itemDeleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },
  emptyTitle: {
    marginTop: 14,
    fontFamily: 'Poppins_600SemiBold',
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
});
