import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getConfidenceLabel } from '../utils/matchItems';

const LOST_COLOR = '#EF4444';
const FOUND_COLOR = '#10B981';
const PRIMARY = '#1E40AF';

function ScoreRing({ score }) {
  return (
    <View style={styles.scoreRingOuter}>
      <View style={styles.scoreRingInner}>
        <Text style={styles.scoreValue}>{score}%</Text>
        <Text style={styles.scoreLabel}>MATCH SCORE</Text>
      </View>
    </View>
  );
}

function ItemCompareCard({ item, tag, tagColor, tagBg }) {
  const isLost = item.type === 'LOST';
  const date = isLost ? item.dateLost : item.dateFound;

  return (
    <View style={styles.compareCard}>
      <View style={[styles.compareTag, { backgroundColor: tagBg }]}>
        <Text style={[styles.compareTagText, { color: tagColor }]}>{tag}</Text>
      </View>
      {item.imageURI ? (
        <Image source={{ uri: item.imageURI }} style={styles.compareImage} />
      ) : (
        <View style={styles.compareImagePlaceholder}>
          <MaterialCommunityIcons name="cube-outline" size={36} color="#94A3B8" />
        </View>
      )}
      <Text style={styles.compareTitle} numberOfLines={2}>{item.itemName}</Text>
      <Text style={styles.compareMeta}>{item.category || 'General'}</Text>
      <View style={styles.compareRow}>
        <Ionicons name="location-outline" size={13} color="#64748B" />
        <Text style={styles.compareMeta} numberOfLines={1}> {item.location}</Text>
      </View>
      <View style={styles.compareRow}>
        <Ionicons name="calendar-outline" size={13} color="#64748B" />
        <Text style={styles.compareMeta}> {date || 'N/A'}</Text>
      </View>
    </View>
  );
}

export default function MatchCompareScreen({
  match,
  loading,
  isAdmin = false,
  onConfirmMatch,
  onDismissMatch,
  submitting = false,
}) {
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Analyzing possible matches...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.loadingWrap}>
        <MaterialCommunityIcons name="link-off" size={48} color="#94A3B8" />
        <Text style={styles.loadingText}>Match not found.</Text>
        <TouchableOpacity style={styles.backBtnAlt} onPress={() => router.back()}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { score, breakdown, sourceItem, oppositeItem } = match;
  const confidence = getConfidenceLabel(score);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Possible Matches</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="auto-fix" size={22} color={PRIMARY} />
          </View>
          <Text style={styles.heroTitle}>{confidence}</Text>
          <Text style={styles.heroSub}>
            Our system compared category, location, item name, and report dates to find this pairing.
          </Text>
          <ScoreRing score={score} />
        </View>

        <View style={styles.compareRowCards}>
          <ItemCompareCard
            item={sourceItem}
            tag="YOUR ITEM"
            tagColor={sourceItem.type === 'LOST' ? LOST_COLOR : FOUND_COLOR}
            tagBg={sourceItem.type === 'LOST' ? '#FEE2E2' : '#D1FAE5'}
          />
          <View style={styles.vsBadge}>
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={PRIMARY} />
          </View>
          <ItemCompareCard
            item={oppositeItem}
            tag={oppositeItem.type === 'LOST' ? 'LOST ITEM' : 'FOUND ITEM'}
            tagColor={oppositeItem.type === 'LOST' ? LOST_COLOR : FOUND_COLOR}
            tagBg={oppositeItem.type === 'LOST' ? '#FEE2E2' : '#D1FAE5'}
          />
        </View>

        <Text style={styles.sectionTitle}>ANALYSIS BREAKDOWN</Text>
        <View style={styles.breakdownCard}>
          {(breakdown || []).map((row) => (
            <View key={row.key} style={styles.breakdownRow}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownLabel}>{row.label}</Text>
                <Text style={styles.breakdownPct}>{row.percent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${row.percent}%` }]} />
              </View>
              <Text style={styles.breakdownDetail}>{row.detail}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
          onPress={onConfirmMatch}
          disabled={submitting}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>This is a Match</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, submitting && { opacity: 0.7 }]}
          onPress={onDismissMatch}
          disabled={submitting}
        >
          <Ionicons name="close-circle-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
          <Text style={styles.secondaryBtnText}>Not a Match</Text>
        </TouchableOpacity>
        {isAdmin && (
          <Text style={styles.adminHint}>Admin can link or dismiss matches for the ledger.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600', fontSize: 14 },
  backBtnAlt: { marginTop: 16, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  backBtnAltText: { color: '#FFF', fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 20 },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 8 },
  scoreRingOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 8,
    borderColor: PRIMARY,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingInner: { alignItems: 'center' },
  scoreValue: { fontSize: 28, fontWeight: '900', color: PRIMARY },
  scoreLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginTop: 2 },
  compareRowCards: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 },
  compareCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  compareTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  compareTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  compareImage: { width: '100%', height: 90, borderRadius: 12, marginBottom: 8 },
  compareImagePlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  compareTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  compareMeta: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  vsBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.2, marginBottom: 12 },
  breakdownCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownRow: { marginBottom: 16 },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  breakdownPct: { fontSize: 13, fontWeight: '800', color: PRIMARY },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },
  breakdownDetail: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  adminHint: { textAlign: 'center', fontSize: 10, color: '#94A3B8', marginTop: 8 },
});
