import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions, Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const JU_LOGO = require('../../assets/images/jazeera_logo.png');

const SuccessToast = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('success'); 
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useImperativeHandle(ref, () => ({
    show: (msg, subMsg = '', toastType = 'success') => {
      setMessage(msg);
      setType(toastType);
      setVisible(true);
      
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        })
      ]).start();

      setTimeout(() => {
        hide();
      }, 2500);
    }
  }));

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  const isError = type === 'error';

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <Image source={JU_LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.messageText}>{message}</Text>
        {isError && (
          <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginLeft: 8 }} />
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    zIndex: 10000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 20,
    height: 20,
  },
  messageText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  }
});

export default SuccessToast;
