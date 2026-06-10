import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusBadgeConfig, normalizeItemStatus } from '../utils/itemStatus';

export default function ItemStatusBadge({ item, compact = false }) {
  const status = normalizeItemStatus(item);
  const { label, bg, color } = getStatusBadgeConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: bg }, compact && styles.badgeCompact]}>
      <Text style={[styles.text, { color }, compact && styles.textCompact]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textCompact: {
    fontSize: 10,
  },
});
