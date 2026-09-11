import React, { useState } from 'react';
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
import { validateCategoryName } from '../utils/categories';

export default function CategoryPills({
  entries = [],
  selectedCategory,
  onSelect,
  accentColor = '#1E40AF',
  loading = false,
  allowCustom = true,
  showAllOption = false,
  allLabel = 'All',
  customPlaceholder = 'New category name',
  onPersistCustom,
}) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [customError, setCustomError] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  const knownNames = new Set(entries.map((entry) => entry.name));
  const hasCustomSelection =
    Boolean(selectedCategory) &&
    selectedCategory !== 'all' &&
    !knownNames.has(selectedCategory);

  async function commitCustom(rawValue = customDraft) {
    const check = validateCategoryName(rawValue);
    if (!check.valid) {
      setCustomError(check.message);
      return;
    }
    try {
      setSavingCustom(true);
      setCustomError('');
      const saved = onPersistCustom
        ? await onPersistCustom(check.value)
        : check.value;
      onSelect(saved);
      setCustomDraft(saved);
      setAddingCustom(false);
    } catch (error) {
      setCustomError(error?.message || 'Could not save category.');
    } finally {
      setSavingCustom(false);
    }
  }

  function startCustom() {
    setAddingCustom(true);
    setCustomError('');
    setCustomDraft(hasCustomSelection ? selectedCategory : '');
  }

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
      <View style={styles.wrap}>
        <TextInput
          style={[styles.customInput, { borderColor: customError ? '#DC2626' : `${accentColor}26` }]}
          placeholder={customPlaceholder}
          placeholderTextColor="#94A3B8"
          value={selectedCategory || ''}
          onChangeText={(text) => {
            setCustomError('');
            onSelect(text);
          }}
          onBlur={() => {
            if (!selectedCategory) return;
            const check = validateCategoryName(selectedCategory);
            if (!check.valid) setCustomError(check.message);
          }}
        />
        {customError ? <Text style={styles.errorText}>{customError}</Text> : null}
      </View>
    );
  }

  const allActive = !selectedCategory || selectedCategory === 'all';

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {showAllOption ? (
          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: `${accentColor}26` },
              allActive && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
            onPress={() => {
              setAddingCustom(false);
              setCustomError('');
              onSelect('all');
            }}
          >
            <MaterialCommunityIcons name="view-grid-outline" size={18} color={allActive ? '#FFF' : accentColor} />
            <Text style={[styles.pillText, allActive && styles.pillTextActive]}>{allLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {entries.map((cat) => {
          const active = selectedCategory === cat.name && !addingCustom;
          return (
            <TouchableOpacity
              key={cat.name}
              style={[
                styles.pill,
                { borderColor: `${accentColor}26` },
                active && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
              onPress={() => {
                setAddingCustom(false);
                setCustomError('');
                onSelect(cat.name);
              }}
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

        {allowCustom ? (
          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: `${accentColor}26` },
              (addingCustom || hasCustomSelection) && {
                backgroundColor: accentColor,
                borderColor: accentColor,
              },
            ]}
            onPress={startCustom}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={18}
              color={addingCustom || hasCustomSelection ? '#FFF' : accentColor}
            />
            <Text
              style={[
                styles.pillText,
                (addingCustom || hasCustomSelection) && styles.pillTextActive,
              ]}
            >
              {hasCustomSelection && !addingCustom ? selectedCategory : 'New'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {allowCustom && addingCustom ? (
        <View style={styles.customBlock}>
          <View style={styles.customRow}>
            <TextInput
              style={[
                styles.customInput,
                styles.customInputFlex,
                { borderColor: customError ? '#DC2626' : `${accentColor}40` },
              ]}
              placeholder={customPlaceholder}
              placeholderTextColor="#94A3B8"
              value={customDraft}
              autoFocus
              onChangeText={(text) => {
                setCustomError('');
                setCustomDraft(text);
              }}
              onSubmitEditing={() => commitCustom()}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: accentColor, opacity: savingCustom ? 0.7 : 1 }]}
              onPress={() => commitCustom()}
              disabled={savingCustom}
            >
              <Text style={styles.addBtnText}>{savingCustom ? '…' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          {customError ? <Text style={styles.errorText}>{customError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
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
  customBlock: {
    gap: 6,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInputFlex: {
    flex: 1,
  },
  addBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
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
