import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import AdminHeader from '../../../src/components/AdminHeader';
import AdminPageHero from '../../../src/components/AdminPageHero';
import SuccessToast from '../../../src/components/SuccessToast';
import {
  getAllUsers,
  updateUserApproval,
  deleteUser,
} from '../../../src/services/supabase';
import { showAppConfirm, showAppFailure } from '../../../src/utils/appAlert';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'admins', label: 'Admins' },
];

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AllUsersScreen() {
  const navigation = useNavigation();
  const toastRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
      showAppFailure('Failed to retrieve user directory.', 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const counts = useMemo(() => {
    const students = users.filter((u) => u.role !== 'admin');
    return {
      all: users.length,
      active: students.filter((u) => u.is_approved).length,
      pending: students.filter((u) => !u.is_approved).length,
      admins: users.filter((u) => u.role === 'admin').length,
    };
  }, [users]);

  const handleToggleApproval = async (user) => {
    const newStatus = !user.is_approved;
    try {
      await updateUserApproval(user.email, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.email === user.email ? { ...u, is_approved: newStatus } : u))
      );
      toastRef.current?.show(
        newStatus ? 'Account Approved' : 'Account Suspended',
        `${user.name}'s account has been ${newStatus ? 'approved' : 'suspended'}.`,
        'success'
      );
    } catch (err) {
      console.error('Toggle approval failed:', err);
      showAppFailure('Failed to update account status.', 'Action failed');
    }
  };

  const handleDelete = async (user) => {
    showAppConfirm({
      title: 'Delete student account',
      message: `Are you sure you want to permanently delete ${user.name}? All their listings and session access will be deleted.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteUser(user.email);
          setUsers((prev) => prev.filter((u) => u.email !== user.email));
          toastRef.current?.show('User Deleted', 'Account permanently removed.', 'success');
        } catch (err) {
          console.error('Delete user failed:', err);
          showAppFailure('Failed to remove user account.', 'Delete failed');
        }
      },
    });
  };

  const filteredUsers = users.filter((user) => {
    const isAdmin = user.role === 'admin';
    const isPending = !user.is_approved && !isAdmin;

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'admins' && isAdmin) ||
      (activeTab === 'pending' && isPending) ||
      (activeTab === 'active' && !isAdmin && user.is_approved);

    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      user.name?.toLowerCase().includes(q) ||
      user.student_id?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.includes(q);

    return matchesTab && matchesQuery;
  });

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return (
    <View style={styles.container}>
      <AdminHeader
        title="All Users"
        subtitle="Student directory"
        onMenuPress={openDrawer}
        rightElement={
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AdminPageHero
          eyebrow="User management"
          title="University directory"
          subtitle="Manage student accounts, approve new registrations, and suspend access when needed."
        />

        <View style={styles.statsRow}>
          <View style={[styles.statChip, styles.statChipPrimary]}>
            <Text style={styles.statChipNum}>{counts.all}</Text>
            <Text style={styles.statChipLabel}>Total</Text>
          </View>
          <View style={[styles.statChip, styles.statChipSuccess]}>
            <Text style={[styles.statChipNum, { color: Colors.success }]}>{counts.active}</Text>
            <Text style={styles.statChipLabel}>Active</Text>
          </View>
          <View style={[styles.statChip, styles.statChipWarn]}>
            <Text style={[styles.statChipNum, { color: Colors.warning }]}>{counts.pending}</Text>
            <Text style={styles.statChipLabel}>Pending</Text>
          </View>
          <View style={[styles.statChip, styles.statChipPurple]}>
            <Text style={[styles.statChipNum, { color: '#7C3AED' }]}>{counts.admins}</Text>
            <Text style={styles.statChipLabel}>Admins</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
                {tab.label} ({counts[tab.id]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.slate400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, name, phone or email…"
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading directory…</Text>
          </View>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const isAdmin = user.role === 'admin';
            const isPending = !user.is_approved && !isAdmin;

            const avatarBg = isAdmin ? '#EDE9FE' : isPending ? '#FEF3C7' : '#DBEAFE';
            const avatarColor = isAdmin ? '#7C3AED' : isPending ? Colors.warning : Colors.primary;

            const statusLabel = isAdmin ? 'ADMIN' : isPending ? 'PENDING' : 'ACTIVE';
            const statusBg = isAdmin ? '#EDE9FE' : isPending ? '#FEF3C7' : '#ECFDF5';
            const statusColor = isAdmin ? '#7C3AED' : isPending ? '#B45309' : Colors.success;

            return (
              <View
                key={user.email}
                style={[
                  styles.userCard,
                  isPending && styles.userCardPending,
                  isAdmin && styles.userCardAdmin,
                ]}
              >
                {isPending ? <View style={styles.pendingStripe} /> : null}

                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                    {isAdmin ? (
                      <Ionicons name="shield-checkmark" size={22} color={avatarColor} />
                    ) : (
                      <Text style={[styles.avatarText, { color: avatarColor }]}>
                        {getInitials(user.name)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.userMeta}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.name}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.userId}>ID · {user.student_id || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.contactBlock}>
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={15} color={Colors.slate400} />
                    <Text style={styles.contactText} numberOfLines={1}>{user.email}</Text>
                  </View>
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={15} color={Colors.slate400} />
                    <Text style={styles.contactText}>{user.phone || 'No phone listed'}</Text>
                  </View>
                </View>

                {!isAdmin && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, isPending ? styles.approveBtn : styles.suspendBtn]}
                      onPress={() => handleToggleApproval(user)}
                      activeOpacity={0.88}
                    >
                      <Ionicons
                        name={isPending ? 'checkmark-circle-outline' : 'ban-outline'}
                        size={18}
                        color={isPending ? Colors.success : Colors.warning}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: isPending ? Colors.success : Colors.warning },
                        ]}
                      >
                        {isPending ? 'Approve' : 'Suspend'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(user)}
                      activeOpacity={0.88}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isAdmin && (
                  <View style={styles.adminNote}>
                    <Ionicons name="information-circle-outline" size={16} color="#7C3AED" />
                    <Text style={styles.adminNoteText}>System administrator — managed separately</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={40} color={Colors.slate400} />
            </View>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'No members match this filter yet.'}
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
    marginBottom: 18,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statChipPrimary: {
    backgroundColor: Colors.primaryLight,
    borderColor: '#BFDBFE',
  },
  statChipSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statChipWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statChipPurple: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  statChipNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.primary,
    lineHeight: 22,
  },
  statChipLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.slate500,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate600,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
    marginBottom: 18,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate900,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.slate500,
    marginTop: 12,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  userCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF7',
  },
  userCardAdmin: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FDFCFF',
  },
  pendingStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.warning,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  userMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.slate900,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  userId: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 4,
  },
  contactBlock: {
    backgroundColor: Colors.slate50,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.slate600,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  approveBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  suspendBtn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  actionBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.error,
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 12,
  },
  adminNoteText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#6D28D9',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.slate800,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 21,
  },
});
