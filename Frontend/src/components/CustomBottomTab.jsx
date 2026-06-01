import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const SLATE_400 = '#94A3B8';
const PRIMARY_BLUE = '#1E40AF';
const PRIMARY_GREEN = '#10B981';

const TABS = [
  { name: 'HOME', icon: 'home', route: '/(user)/DashBoard' },
  { name: 'LOST', icon: 'magnify', route: '/(user)/Lost' },
  { name: 'FOUND', icon: 'cube-outline', route: '/(user)/Found' },
  { name: 'ITEMS', icon: 'view-dashboard-outline', route: '/(user)/MyItems' },
  { name: 'PROFILE', icon: 'account-outline', route: '/(user)/MyProfile' },
];

export default function CustomBottomTab() {
  const router = useRouter();
  const pathname = usePathname();

  const getActiveColor = () => {
    return '#0F172A'; // Sleek dark active color
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = 
          pathname.toLowerCase().includes(tab.name.toLowerCase()) || 
          (tab.name === 'HOME' && pathname.toLowerCase().includes('dashboard')) ||
          (tab.name === 'ITEMS' && pathname.toLowerCase().includes('myitems'));
        
        const activeColor = getActiveColor(tab.name);

        return (
          <TouchableOpacity 
            key={tab.name} 
            style={styles.tab} 
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconContainer, 
              isActive && { backgroundColor: activeColor + '10' }
            ]}>
              <MaterialCommunityIcons 
                name={tab.icon}
                size ={24}
                color ={isActive ? activeColor : SLATE_400}
              />
              {isActive && <View style={[styles.activeDot, { backgroundColor: activeColor }]} />}
            </View>
            <Text style={[
              styles.label, 
              { color: isActive ? activeColor : '#94A3B8' }
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? 100 : 85,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    paddingTop: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    // Modern Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
