import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { isSecureListing, normalizeItemStatus, ITEM_STATUS } from '../utils/itemStatus';
import { getSecureItemDisplay } from '../utils/secureItemDisplay';

const LOST_BLUE = '#3B82F6';
const SECURE_AMBER = '#D97706';
const RETURNED_SLATE = '#64748B';

function isAdminPosted(item) {
  return item.email && (
    item.email.toLowerCase().includes('admin') ||
    item.userId === 'admin-01' ||
    item.finderId === 'admin-01'
  );
}

export default function FeedItemCard({ item, onPress }) {
  const isSecure = isSecureListing(item);
  const isReturned = normalizeItemStatus(item) === ITEM_STATUS.RETURNED;
  const secureDisplay = isSecure ? getSecureItemDisplay(item) : null;
  const typeColor = isReturned ? RETURNED_SLATE : LOST_BLUE;
  const typeLabel = isReturned ? 'RETURNED' : 'LOST';
  const displayName = isSecure ? secureDisplay.name : item.itemName;
  const displayLocation = isSecure
    ? (item.security_location || item.location || 'Campus Security Office')
    : item.location;
  const displayDate = isSecure
    ? (item.dateFound || item.timeAgo || '')
    : (item.timeAgo || item.dateLost || item.dateFound || '');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Left: Thumbnail Image or Placeholder */}
      <View style={styles.thumbWrap}>
        {!isSecure && item.imageURI ? (
          <Image source={{ uri: item.imageURI }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbPlaceholder, isSecure && styles.secureThumb]}>
            {isSecure ? (
              <View style={styles.secureIconContainer}>
                <MaterialCommunityIcons name="shield-alert-outline" size={32} color={SECURE_AMBER} />
                <View style={styles.secureMiniBadge}>
                  <Text style={styles.secureMiniText}>!</Text>
                </View>
              </View>
            ) : (
              <MaterialCommunityIcons
                name="magnify-scan"
                size={34}
                color={typeColor}
              />
            )}
          </View>
        )}
      </View>

      {/* Right: Content Body */}
      <View style={styles.body}>
        {/* Top Row: Category and Badges */}
        <View style={styles.topRow}>
          <View style={styles.categoryChip}>
            <MaterialCommunityIcons name="tag-outline" size={11} color="#64748B" />
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.category || 'General'}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            {isAdminPosted(item) && !isSecure ? (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#1E40AF" />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            ) : null}
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '12', borderColor: typeColor + '25' }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
          </View>
        </View>

        {/* Item Title */}
        <Text style={styles.title} numberOfLines={1}>{displayName}</Text>

        {/* Item Description / Public Notice */}
        {isSecure && secureDisplay?.showNotice ? (
          <Text style={styles.notice} numberOfLines={1}>{secureDisplay.notice}</Text>
        ) : null}

        {!isSecure && item.description ? (
          <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
        ) : null}

        {/* Bottom Row: Location & Date (Horizontal Layout) */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{displayLocation}</Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{displayDate}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    // Soft, premium shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  secureThumb: {
    backgroundColor: '#FEF3C7',
  },
  secureIconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
  },
  secureMiniBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: SECURE_AMBER,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
  },
  secureMiniText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 11,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '50%',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1E40AF',
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  notice: {
    fontSize: 12,
    lineHeight: 16,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '45%',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metaDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 6,
  },
});
