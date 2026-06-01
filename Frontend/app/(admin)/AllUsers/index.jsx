import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  getAllUsers,
  updateUserApproval,
  deleteUser,
} from '../../../src/services/supabase';

const { width } = Dimensions.get('window');

export default function AllUsersScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  // States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
      toastRef.current?.show('Load Failed', 'Failed to retrieve user directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Toggle approval (Suspend/Approve)
  const handleToggleApproval = async (user) => {
    const newStatus = !user.is_approved;
    try {
      await updateUserApproval(user.email, newStatus);
      
      setUsers(prev =>
        prev.map(u => (u.email === user.email ? { ...u, is_approved: newStatus } : u))
      );
      
      toastRef.current?.show(
        newStatus ? 'Account Approved' : 'Account Suspended',
        `${user.name}'s account has been ${newStatus ? 'approved' : 'suspended'}.`,
        'success'
      );
    } catch (err) {
      console.error('Toggle approval failed:', err);
      toastRef.current?.show('Action Failed', 'Failed to update status.', 'error');
    }
  };

  // Delete User account
  const handleDelete = async (user) => {
    Alert.alert(
      'Delete Student Account',
      `Are you sure you want to permanently delete ${user.name}? All their listings and session access will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.email);
              setUsers(prev => prev.filter(u => u.email !== user.email));
              toastRef.current?.show('User Deleted', 'Account permanently removed.', 'success');
            } catch (err) {
              console.error('Delete user failed:', err);
              toastRef.current?.show('Delete Failed', 'Failed to remove user account.', 'error');
            }
          },
        },
      ]
    );
  };

  // Search Filter
  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.student_id && user.student_id.toLowerCase().includes(q)) ||
      (user.email && user.email.toLowerCase().includes(q)) ||
      (user.phone && user.phone.includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu-outline" size={28} color="#1E3A8A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>UNIVERSITY STUDENTS DIRECTORY</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={Colors.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, Name, Phone or Email..."
          placeholderTextColor={Colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching database directory...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isPending = !user.is_approved;
              const isAdmin = user.role === 'admin';

              return (
                <View key={user.email} style={[styles.userCard, isPending && styles.userCardPending]}>
                  <View style={styles.avatarContainer}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: isAdmin ? '#8B5CF6' : isPending ? '#FEF3C7' : '#EFF6FF' },
                      ]}
                    >
                      <Ionicons
                        name={isAdmin ? 'shield-half' : 'person'}
                        size={20}
                        color={isAdmin ? Colors.white : isPending ? Colors.warning : Colors.primary}
                      />
                    </View>
                    {isPending && <View style={styles.pendingDot} />}
                  </View>

                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userNameText} numberOfLines={1}>
                        {user.name}
                      </Text>
                      {isAdmin && <Text style={styles.adminBadge}>Admin</Text>}
                    </View>
                    <Text style={styles.userIdText}>ID: {user.student_id || 'N/A'}</Text>
                    <Text style={styles.userDetailText}>Email: {user.email}</Text>
                    <Text style={styles.userDetailText}>Phone: {user.phone || 'N/A'}</Text>
                  </View>

                  {/* Actions for non-admins */}
                  {!isAdmin && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionToggleBtn,
                          { backgroundColor: isPending ? Colors.success + '15' : Colors.warning + '15' },
                        ]}
                        onPress={() => handleToggleApproval(user)}
                      >
                        <Ionicons
                          name={isPending ? 'checkmark-circle' : 'ban'}
                          size={18}
                          color={isPending ? Colors.success : Colors.warning}
                        />
                        <Text style={[styles.actionLabel, { color: isPending ? Colors.success : Colors.warning }]}>
                          {isPending ? 'Approve' : 'Suspend'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(user)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={56} color={Colors.slate300} />
              <Text style={styles.emptyText}>No registered members found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <SuccessToast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
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
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate900,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
    marginTop: 12,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.white,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  userCardPending: {
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFDF5',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.slate900,
    maxWidth: width * 0.35,
  },
  adminBadge: {
    backgroundColor: '#F5F3FF',
    color: '#7C3AED',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  userIdText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.slate500,
    marginTop: 1,
  },
  userDetailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.slate400,
    marginTop: 1,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
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
    color: Colors.slate400,
    textAlign: 'center',
  },
});
