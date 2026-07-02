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
import { useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import { getAllReturnedItems } from '../../../src/services/supabase';
import { showAppFailure } from '../../../src/utils/appAlert';

export default function ReturnedItemsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toastRef = useRef(null);

  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | lost | found

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

  const lostCount = returnedItems.filter((i) => i.type === 'LOST').length;
  const foundCount = returnedItems.filter((i) => i.type === 'FOUND').length;

  const query = searchQuery.trim().toLowerCase();
  const filteredItems = returnedItems.filter((item) => {
    const matchesSearch =
      !query ||
      item.item_name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.recipient_name?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query);

    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && item.type.toLowerCase() === activeTab;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const openArchiveItem = (item) => {
    router.push({
      pathname: `/(admin)/item/${item.id}`,
      params: { data: JSON.stringify({ ...item, type: item.type, isArchive: true }) },
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Returned Archives"
        subtitle="Recovered item history"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchItems}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Archive Ledger"
          title="Returned records"
          subtitle="Track completed recoveries and verify who received each item."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNum}>{returnedItems.length}</Text>
            <Text style={styles.statLabel}>Total archived</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLost]}>
            <Text style={[styles.statNum, styles.statNumLost]}>{lostCount}</Text>
            <Text style={styles.statLabel}>Returned lost</Text>
          </View>
          <View style={[styles.statCard, styles.statCardFound]}>
            <Text style={[styles.statNum, styles.statNumFound]}>{foundCount}</Text>
            <Text style={styles.statLabel}>Returned found</Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipient, item, or location..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({returnedItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'lost' && styles.tabBtnActive]}
            onPress={() => setActiveTab('lost')}
          >
            <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>
              Lost ({lostCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'found' && styles.tabBtnActive]}
            onPress={() => setActiveTab('found')}
          >
            <Text style={[styles.tabText, activeTab === 'found' && styles.tabTextActive]}>
              Found ({foundCount})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading returned archive...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isLost = item.type === 'LOST';
            return (
              <TouchableOpacity
                key={`returned-${item.id}`}
                style={styles.itemCard}
                activeOpacity={0.9}
                onPress={() => openArchiveItem(item)}
              >
                {item.imageURI || item.imageuri ? (
                  <Image source={{ uri: item.imageURI || item.imageuri }} style={styles.itemCardImg} />
                ) : (
                  <View
                    style={[
                      styles.itemCardImgPlaceholder,
                      { backgroundColor: isLost ? Colors.primaryLight : Colors.foundBadge },
                    ]}
                  >
                    <Ionicons
                      name={isLost ? 'help-buoy-outline' : 'checkmark-circle-outline'}
                      size={28}
                      color={isLost ? Colors.primary : Colors.success}
                    />
                  </View>
                )}

                <View style={styles.itemCardInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
                    <View style={[styles.typePill, isLost ? styles.typePillLost : styles.typePillFound]}>
                      <Text style={[styles.typePillText, isLost ? styles.typeTextLost : styles.typeTextFound]}>
                        {item.type}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.item_name}
                  </Text>

                  <View style={styles.recipientCard}>
                    <Text style={styles.recipientLabel}>Returned to</Text>
                    <Text style={styles.recipientValue} numberOfLines={1}>
                      {item.recipient_name || 'N/A'}
                    </Text>
                    {item.recipient_student_id ? (
                      <Text style={styles.recipientId}>{item.recipient_student_id}</Text>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.slate500} /> {formatDate(item.returned_at)}
                    </Text>
                    <Text style={styles.metaText} numberOfLines={1}>
                      <Ionicons name="location-outline" size={13} color={Colors.slate500} /> {item.location || 'N/A'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={56} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No archive matches</Text>
            <Text style={styles.emptyText}>Try another keyword or switch the tab filter.</Text>
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
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  statCardLost: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statCardFound: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.primaryDark,
    lineHeight: 23,
  },
  statNumLost: {
    color: '#4F46E5',
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
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
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
    width: 88,
    height: 112,
    borderRadius: 14,
    backgroundColor: Colors.slate100,
  },
  itemCardImgPlaceholder: {
    width: 88,
    height: 112,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  typePillLost: {
    backgroundColor: '#EEF2FF',
  },
  typePillFound: {
    backgroundColor: '#D1FAE5',
  },
  typePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  typeTextLost: {
    color: '#4F46E5',
  },
  typeTextFound: {
    color: Colors.success,
  },
  itemName: {
    marginTop: 2,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: Colors.slate900,
  },
  recipientCard: {
    marginTop: 6,
    backgroundColor: Colors.slate50,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recipientLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  recipientValue: {
    marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#4338CA',
  },
  recipientId: {
    marginTop: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.slate500,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.slate600,
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
