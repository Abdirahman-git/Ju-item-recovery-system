import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function CategoryPills({
  entries = [],
  selectedCategory,
  onSelect,
  accentColor = '#1E40AF',
  loading = false,
  allowCustom = true,
  showAllOption = false,
  allLabel = 'All',
  customPlaceholder = 'Type category (e.g. Electronics)',
}) {
  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={accentColor} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (entries.length === 0 && !showAllOption) {
    if (!allowCustom) {
      return <Text style={styles.emptyText}>No categories yet. Submit the first report to create one.</Text>;
    }

    return (
      <TextInput
        style={[styles.customInput, { borderColor: `${accentColor}26` }]}
        placeholder={customPlaceholder}
        placeholderTextColor="#94A3B8"
        value={selectedCategory || ''}
        onChangeText={onSelect}
      />
    );
  }

  const allActive = !selectedCategory || selectedCategory === 'all';
  const showCustom =
    allowCustom &&
    selectedCategory &&
    selectedCategory !== 'all' &&
    !entries.some((entry) => entry.name === selectedCategory);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {showAllOption ? (
        <TouchableOpacity
          style={[
            styles.pill,
            { borderColor: `${accentColor}26` },
            allActive && { backgroundColor: accentColor, borderColor: accentColor },
          ]}
          onPress={() => onSelect('all')}
        >
          <MaterialCommunityIcons name="view-grid-outline" size={18} color={allActive ? '#FFF' : accentColor} />
          <Text style={[styles.pillText, allActive && styles.pillTextActive]}>{allLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {entries.map((cat) => {
        const active = selectedCategory === cat.name;
        return (
          <TouchableOpacity
            key={cat.name}
            style={[
              styles.pill,
              { borderColor: `${accentColor}26` },
              active && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
            onPress={() => onSelect(cat.name)}
          >
            {cat.type === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={cat.icon} size={18} color={active ? '#FFF' : accentColor} />
            ) : (
              <FontAwesome5 name={cat.icon} size={16} color={active ? '#FFF' : accentColor} />
            )}
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        );
      })}

      {showCustom ? (
        <View style={[styles.customPill, { borderColor: accentColor, backgroundColor: accentColor }]}>
          <Text style={styles.customPillText}>{selectedCategory}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 10,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: '#FFF',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  pillTextActive: {
    color: '#FFF',
  },
  customInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFF',
  },
  inlineCustom: {
    minWidth: 88,
    height: 40,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFF',
  },
  customPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  customPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    paddingVertical: 8,
  },
});
