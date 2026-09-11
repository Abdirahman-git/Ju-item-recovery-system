import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const JU_LOGO = require('../../assets/images/jazeera_logo.png');
const SHOW_MS = 5000;

const NotificationBanner = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);
  const onPressRef = useRef(null);

  const clearTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const hide = () => {
    clearTimer();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  useImperativeHandle(ref, () => ({
    show: (msg, subMsg = '', _type = 'success', options = {}) => {
      clearTimer();
      setTitle(String(msg || 'New notification'));
      setBody(String(subMsg || ''));
      setImageUrl(options.imageUrl || options.imageURI || null);
      onPressRef.current = typeof options.onPress === 'function' ? options.onPress : null;
      setVisible(true);
      translateY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimer.current = setTimeout(hide, options.durationMs || SHOW_MS);
    },
    hide,
  }));

  if (!visible) return null;

  const statusTop =
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 50;
  const topPad = statusTop + 8;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingTop: topPad,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        style={styles.card}
        onPress={() => {
          const fn = onPressRef.current;
          hide();
          if (fn) fn();
        }}
      >
        <View style={styles.logoWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.appLabel}>JU LOFO</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {body ? (
            <Text style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          ) : null}
        </View>
        <Ionicons name="notifications" size={18} color="#1A56DB" style={styles.bell} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(26, 86, 219, 0.14)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logo: {
    width: 26,
    height: 26,
  },
  itemImage: {
    width: 40,
    height: 40,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  appLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  body: {
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  bell: {
    marginLeft: 8,
  },
});

export default NotificationBanner;
