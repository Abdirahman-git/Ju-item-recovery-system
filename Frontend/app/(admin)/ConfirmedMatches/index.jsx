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
  Platform,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import { getConfirmedMatches } from '../../../src/services/supabase';
import { getConfidenceLabel } from '../../../src/utils/matchItems';

export default function ConfirmedMatchesScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toastRef = useRef(null);

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const data = await getConfirmedMatches();
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching confirmed matches:', error);
      toastRef.current?.show('Load Failed', 'Could not load confirmed matches.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const filtered = matches.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.lostItem?.itemName?.toLowerCase().includes(q) ||
      m.foundItem?.itemName?.toLowerCase().includes(q) ||
      m.lostItem?.location?.toLowerCase().includes(q) ||
      m.foundItem?.location?.toLowerCase().includes(q) ||
      m.lostItem?.ownerName?.toLowerCase().includes(q) ||
      m.foundItem?.finderName?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="link-variant" size={22} color="#1E40AF" />
          <Text style={styles.headerTitle}>CONFIRMED MATCHES</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.mainTitle}>Student-Confirmed Pairs</Text>
        <Text style={styles.subtitle}>
          Lost and found items marked as a match by users. Review and follow up for return.
        </Text>
      </View>

      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={Colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search item, location, or reporter..."
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading confirmed matches...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="link-off" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No confirmed matches yet</Text>
          <Text style={styles.emptyText}>
            When a user taps "This is a Match" on a suggestion, it will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filtered.map((match) => (
            <View key={String(match.id)} style={styles.matchCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.confirmedPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#1E40AF" />
                  <Text style={styles.confirmedPillText}>CONFIRMED</Text>
                </View>
                <Text style={styles.scoreText}>
                  {match.score}% · {getConfidenceLabel(match.score)}
                </Text>
              </View>

              <View style={styles.pairRow}>
                <View style={styles.itemCol}>
                  <Text style={styles.itemTagLost}>LOST</Text>
                  {match.lostItem?.imageURI ? (
                    <Image source={{ uri: match.lostItem.imageURI }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="cube-outline" size={22} color="#94A3B8" />
                    </View>
                  )}
                  <Text style={styles.itemName} numberOfLines={1}>{match.lostItem?.itemName}</Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>{match.lostItem?.location}</Text>
                  <Text style={styles.reporter}>{match.lostItem?.ownerName || 'Unknown'}</Text>
                </View>

                <View style={styles.linkIcon}>
                  <MaterialCommunityIcons name="link-variant" size={22} color="#1E40AF" />
                </View>

                <View style={styles.itemCol}>
                  <Text style={styles.itemTagFound}>FOUND</Text>
                  {match.foundItem?.imageURI ? (
                    <Image source={{ uri: match.foundItem.imageURI }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="cube-outline" size={22} color="#94A3B8" />
                    </View>
                  )}
                  <Text style={styles.itemName} numberOfLines={1}>{match.foundItem?.itemName}</Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>{match.foundItem?.location}</Text>
                  <Text style={styles.reporter}>{match.foundItem?.finderName || 'Unknown'}</Text>
                </View>
              </View>

              {match.created_at ? (
                <Text style={styles.confirmedAt}>Confirmed {formatDate(match.created_at)}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(admin)/matches/compare',
                    params: { matchData: JSON.stringify(match) },
                  })
                }
              >
                <MaterialCommunityIcons name="compare-horizontal" size={18} color="#FFF" />
                <Text style={styles.viewBtnText}>View Full Comparison</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  titleBlock: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  mainTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    marginVertical: 12,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0F172A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontFamily: 'Inter_500Medium' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: { padding: 24, paddingBottom: 40 },
  matchCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedPillText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  scoreText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#1E40AF' },
  pairRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  itemCol: { flex: 1, alignItems: 'center' },
  itemTagLost: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    color: '#EF4444',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  itemTagFound: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    color: '#10B981',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  thumb: { width: 72, height: 72, borderRadius: 14, marginBottom: 8 },
  thumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  itemMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  reporter: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  linkIcon: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
  },
  confirmedAt: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 12,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E40AF',
    borderRadius: 14,
    height: 46,
  },
  viewBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF' },
});
