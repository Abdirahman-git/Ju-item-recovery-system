import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useDynamicCategories } from '../hooks/useDynamicCategories';

export default function CategoryPicker({ selectedCategory, onSelect, items = [], forAdmin = false }) {
  const [modalVisible, setModalVisible] = useState(false);
  const { categoryNames, loading } = useDynamicCategories(items, { forAdmin });

  const handleSelect = (category) => {
    onSelect(category);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[
          styles.pickerText,
          !selectedCategory && { color: Colors.slate400 }
        ]}>
          {selectedCategory || 'Select Category'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.slate400} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Category</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.slate900} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : categoryNames.length === 0 ? (
              <Text style={styles.emptyText}>No categories yet. Categories appear after the first report.</Text>
            ) : (
              <FlatList
                data={categoryNames}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategory === item && styles.categoryItemActive
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === item && styles.categoryTextActive
                    ]}>
                      {item}
                    </Text>
                    {selectedCategory === item && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.slate100,
    justifyContent: 'space-between',
  },
  pickerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate900,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.slate900,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate500,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate500,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  categoryItemActive: {
    backgroundColor: Colors.primaryLight,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  categoryText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.slate700,
  },
  categoryTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.slate50,
  }
});
