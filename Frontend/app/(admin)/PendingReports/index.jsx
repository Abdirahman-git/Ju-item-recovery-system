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
import { useFocusEffect, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  getPendingLostItems,
  getPendingFoundItems,
  approveLostItem,
  approveFoundItem,
  deleteLostItem,
  deleteFoundItem,
} from '../../../src/services/supabase';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const { width } = Dimensions.get('window');

export default function PendingReportsScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  // States
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'lost', 'found'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingLost, pendingFound] = await Promise.all([
        getPendingLostItems(),
        getPendingFoundItems(),
      ]);
      setLostItems(pendingLost || []);
      setFoundItems(pendingFound || []);
    } catch (error) {
      console.error('Error fetching pending reports:', error);
      showAppFailure('Failed to retrieve pending reports.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Approve Report
  const handleApprove = async (item, type) => {
    try {
      if (type === 'lost') {
        await approveLostItem(item.id);
        setLostItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        await approveFoundItem(item.id);
        setFoundItems(prev => prev.filter(i => i.id !== item.id));
      }
      
      toastRef.current?.show(
        'Report Approved',
        `"${item.itemName}" is now published publicly on the student feed.`,
        'success'
      );
    } catch (err) {
      console.error('Approval failed:', err);
      showAppFailure('Failed to approve report.', 'Action failed');
    }
  };

  // Reject (Delete) Report
  const handleReject = async (item, type) => {
    showAppConfirm({
      title: 'Reject & delete report',
      message: `Are you sure you want to permanently reject and delete the report for "${item.itemName}"?`,
      confirmText: 'Reject',
      destructive: true,
      onConfirm: async () => {
        try {
          if (type === 'lost') {
            await deleteLostItem(item.id);
            setLostItems(prev => prev.filter(i => i.id !== item.id));
          } else {
            await deleteFoundItem(item.id);
            setFoundItems(prev => prev.filter(i => i.id !== item.id));
          }

          toastRef.current?.show('Report Rejected', 'Property report permanently deleted.', 'success');
        } catch (err) {
          console.error('Reject report failed:', err);
          showAppFailure('Failed to reject report.', 'Action failed');
        }
      },
    });
  };

  // Prepare combined listing with a 'type' property
  const combinedPending = [
    ...lostItems.map(item => ({ ...item, type: 'lost' })),
    ...foundItems.map(item => ({ ...item, type: 'found' })),
  ].sort((a, b) => b.id - a.id);

  // Filters based on tab and search
  const filteredReports = combinedPending.filter(item => {
    const matchesTab = activeTab === 'all' || activeTab === 'lost';

    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (item.itemName && item.itemName.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.ownerName && item.ownerName.toLowerCase().includes(q)) ||
      (item.finderName && item.finderName.toLowerCase().includes(q));

    return matchesTab && matchesQuery;
  });

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Pending Reports"
        subtitle="Report moderation"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="Report management"
          title="Awaiting approval"
          subtitle="Review lost and found submissions before they appear on the public student feed."
        />

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>
              All ({combinedPending.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'lost' && styles.tabBtnActive]}
            onPress={() => setActiveTab('lost')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'lost' && styles.tabBtnTextActive]}>
              Lost ({lostItems.length + foundItems.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pending reports..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching pending items...</Text>
          </View>
        ) : filteredReports.length > 0 ? (
          filteredReports.map((item) => {
            const isLost = item.type === 'lost';
            const reporterName = isLost ? item.ownerName : item.finderName;
            const badgeLabel = 'LOST REQUEST';
            
            return (
              <View key={`${item.type}-${item.id}`} style={styles.reportCard}>
                {/* Reporter Profile header */}
                <View style={styles.cardHeader}>
                  <View style={styles.reporterAvatarBg}>
                    <Ionicons name="person-outline" size={20} color="#1E293B" />
                  </View>
                  
                  <View style={styles.reporterDetails}>
                    <View style={styles.reporterNameRow}>
                      <Text style={styles.reporterName}>{reporterName || 'Anonymous'}</Text>
                      <View style={[styles.badgePill, { backgroundColor: isLost ? '#FEE2E2' : '#E0F2FE' }]}>
                        <Text style={[styles.badgePillText, { color: isLost ? '#EF4444' : '#0284C7' }]}>
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.reporterEmail}>Contact: {item.phnum || 'N/A'}</Text>
                    <Text style={styles.reporterFaculty}>Category: {item.category}</Text>
                  </View>
                </View>

                {/* Item Details */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemNameText}>{item.itemName}</Text>
                  <Text style={styles.itemDescText}>{item.description || 'No description provided.'}</Text>
                  <Text style={styles.itemLocText}>
                    <Ionicons name="location-outline" size={13} color={Colors.slate500} /> {item.location}
                  </Text>
                </View>

                {/* Main Item Image Container (Exactly like the ID Card container in screenshot) */}
                <View style={styles.imageContainer}>
                  {item.imageURI ? (
                    <Image source={{ uri: item.imageURI }} style={styles.reportImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color={Colors.slate300} />
                      <Text style={styles.imagePlaceholderText}>No item image uploaded</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons (Reject Caspsule Red & Approve Capsule Teal/Green) */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(item, item.type)}
                  >
                    <Text style={styles.rejectBtnText}>REJECT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(item, item.type)}
                  >
                    <Text style={styles.approveBtnText}>APPROVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={Colors.success} />
            <Text style={styles.emptyText}>
              All clear!{'\n'}No pending lost or found reports require approval.
            </Text>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    gap: 8,
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#1E3A8A', // Deep Blue
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 20,
  },
  sectionCategory: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#0284C7', // Sky Blue title category
    letterSpacing: 1,
    marginBottom: 6,
  },
  mainTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#0F172A',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tabBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#0F172A',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reporterAvatarBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reporterDetails: {
    flex: 1,
  },
  reporterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reporterName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  badgePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgePillText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  reporterEmail: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  reporterFaculty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  itemInfo: {
    marginBottom: 14,
  },
  itemNameText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 4,
  },
  itemDescText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  itemLocText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    height: 180,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  reportImg: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#94A3B8',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23, // Capsule shape exactly like screenshot
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#B91C1C', // Deep Red
  },
  rejectBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  approveBtn: {
    backgroundColor: '#0F766E', // Sleek Teal exactly like screenshot
  },
  approveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
