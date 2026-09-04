import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SLATE_400 = '#94A3B8';
const SLATE_600 = '#475569';
const PRIMARY = '#1A56DB';
const LOST_COLOR = '#1D4ED8';
const REQUESTS_COLOR = '#0D9488';
const ITEMS_COLOR = '#7C3AED';
const PROFILE_COLOR = '#0F172A';

const LEFT_TABS = [
  { name: 'LOST', icon: 'magnify', route: '/(user)/Lost', color: LOST_COLOR },
  { name: 'REQUESTS', icon: 'clipboard-text-outline', route: '/(user)/MyRequests', color: REQUESTS_COLOR },
];

const HOME_TAB = {
  name: 'HOME',
  icon: 'home',
  route: '/(user)/DashBoard',
  color: PRIMARY,
};

const RIGHT_TABS = [
  { name: 'ITEMS', icon: 'view-dashboard-outline', route: '/(user)/MyItems', color: ITEMS_COLOR },
  { name: 'PROFILE', icon: 'account-outline', route: '/(user)/MyProfile', color: PROFILE_COLOR },
];

function isTabActive(pathname, tab) {
  const path = pathname.toLowerCase();
  if (tab.name === 'HOME') return path.includes('dashboard');
  if (tab.name === 'ITEMS') return path.includes('myitems');
  if (tab.name === 'PROFILE') return path.includes('myprofile');
  if (tab.name === 'REQUESTS') return path.includes('myrequests');
  return path.includes(tab.name.toLowerCase());
}

function SideTab({ tab, pathname, onPress }) {
  const active = isTabActive(pathname, tab);

  return (
    <TouchableOpacity style={styles.sideTab} onPress={onPress} activeOpacity={0.75}>
      <MaterialCommunityIcons
        name={tab.icon}
        size={22}
        color={active ? tab.color : SLATE_400}
      />
      <Text style={[styles.sideLabel, active && { color: tab.color, fontWeight: '800' }]}>
        {tab.name}
      </Text>
      {active ? <View style={[styles.activeDot, { backgroundColor: tab.color }]} /> : null}
    </TouchableOpacity>
  );
}

export default function CustomBottomTab() {
  const router = useRouter();
  const pathname = usePathname();
  const homeActive = isTabActive(pathname, HOME_TAB);

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <View style={styles.sideGroup}>
          {LEFT_TABS.map((tab) => (
            <SideTab
              key={tab.name}
              tab={tab}
              pathname={pathname}
              onPress={() => router.push(tab.route)}
            />
          ))}
        </View>

        <View style={styles.centerSlot} />

        <View style={styles.sideGroup}>
          {RIGHT_TABS.map((tab) => (
            <SideTab
              key={tab.name}
              tab={tab}
              pathname={pathname}
              onPress={() => router.push(tab.route)}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.centerBtn, homeActive && styles.centerBtnActive]}
        onPress={() => router.push(HOME_TAB.route)}
        activeOpacity={0.88}
      >
        <View style={[styles.centerBtnInner, homeActive && styles.centerBtnInnerActive]}>
          <MaterialCommunityIcons name={HOME_TAB.icon} size={28} color="#FFF" />
        </View>
        <Text style={[styles.centerLabel, homeActive && styles.centerLabelActive]}>
          {HOME_TAB.name}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;
const CENTER_SIZE = 62;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT + 28,
    zIndex: 1000,
    alignItems: 'center',
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 24 },
    }),
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  centerSlot: {
    width: CENTER_SIZE + 16,
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    minHeight: 52,
  },
  sideLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: SLATE_400,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  centerBtn: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    width: CENTER_SIZE + 20,
  },
  centerBtnActive: {},
  centerBtnInner: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 12 },
    }),
  },
  centerBtnInnerActive: {
    backgroundColor: '#1E40AF',
    transform: [{ scale: 1.04 }],
  },
  centerLabel: {
    marginTop: 6,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: SLATE_600,
    letterSpacing: 0.6,
  },
  centerLabelActive: {
    color: PRIMARY,
  },
});
