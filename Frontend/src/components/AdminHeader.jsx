import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');

export default function AdminHeader({
  title = 'Admin Console',
  subtitle = 'Jazeera University',
  onMenuPress,
  rightElement,
  dark = false,
}) {
  return (
    <View style={[styles.header, dark && styles.headerDark]}>
      <TouchableOpacity style={[styles.menuButton, dark && styles.menuButtonDark]} onPress={onMenuPress}>
        <Ionicons name="menu-outline" size={26} color={dark ? Colors.white : Colors.primaryDark} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <View style={[styles.logoWrap, dark && styles.logoWrapDark]}>
          <Image source={JU_LOGO} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View>
          <Text style={[styles.headerTitle, dark && styles.headerTitleDark]}>{title}</Text>
          <Text style={[styles.headerSubtitle, dark && styles.headerSubtitleDark]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.rightSlot}>{rightElement || <View style={{ width: 44 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 48,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerDark: {
    backgroundColor: Colors.admin.sidebar,
    borderBottomColor: Colors.admin.sidebarBorder,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
  },
  menuButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.slate50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoWrapDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: Colors.slate900,
  },
  headerTitleDark: {
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.slate500,
    marginTop: 1,
  },
  headerSubtitleDark: {
    color: Colors.admin.muted,
  },
  rightSlot: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
});
