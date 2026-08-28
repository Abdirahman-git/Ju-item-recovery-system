import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SLATE_400 = '#94A3B8';
const SLATE_900 = '#0F172A';
const HORIZONTAL_INSET = 50;
const MIN_PREVIEW_HEIGHT = 200;
const MAX_PREVIEW_HEIGHT = 420;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function VisualEvidenceUpload({
  imageUri,
  onPick,
  onRemove,
  accentColor,
  required = false,
  title = 'Upload or drag photos',
  subtitle = 'Optional — add a photo if you have one from before',
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [dims, setDims] = useState(null);
  const [loadingDims, setLoadingDims] = useState(false);

  useEffect(() => {
    if (!imageUri) {
      setDims(null);
      setLoadingDims(false);
      return undefined;
    }

    let active = true;
    setLoadingDims(true);
    setDims(null);

    Image.getSize(
      imageUri,
      (width, height) => {
        if (!active) return;
        setDims({ width, height });
        setLoadingDims(false);
      },
      () => {
        if (!active) return;
        setDims(null);
        setLoadingDims(false);
      },
    );

    return () => {
      active = false;
    };
  }, [imageUri]);

  const previewWidth = screenWidth - HORIZONTAL_INSET;
  const previewHeight = useMemo(() => {
    if (!dims?.width || !dims?.height) return 240;
    return clamp(previewWidth * (dims.height / dims.width), MIN_PREVIEW_HEIGHT, MAX_PREVIEW_HEIGHT);
  }, [dims, previewWidth]);

  const hasImage = Boolean(imageUri);

  return (
    <>
      <Text style={styles.fieldLabel}>VISUAL EVIDENCE ({required ? 'REQUIRED' : 'OPTIONAL'})</Text>
      <TouchableOpacity
        style={[
          styles.uploadBox,
          hasImage ? styles.uploadBoxFilled : styles.uploadBoxEmpty,
          hasImage
            ? { height: previewHeight, borderColor: 'transparent' }
            : { borderColor: `${accentColor}40`, shadowColor: accentColor },
        ]}
        onPress={onPick}
        activeOpacity={0.92}
      >
        {hasImage ? (
          <View key={imageUri} style={[styles.previewWrap, { height: previewHeight }]}>
            {loadingDims ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#FFF" />
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.uploadedImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.55)']}
                  style={styles.bottomFade}
                  pointerEvents="none"
                >
                  <Text style={styles.changeHint}>Tap to change photo</Text>
                </LinearGradient>
              </>
            )}
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadInner}>
            <View style={[styles.uploadIconCircle, { backgroundColor: `${accentColor}10` }]}>
              <MaterialCommunityIcons name="camera-plus-outline" size={32} color={accentColor} />
            </View>
            <Text style={styles.uploadTitle}>{title}</Text>
            <Text style={styles.uploadSubtitle}>{subtitle}</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: SLATE_400,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 25,
    textTransform: 'uppercase',
  },
  uploadBox: {
    marginHorizontal: 25,
    borderRadius: 18,
    marginBottom: 30,
    overflow: 'hidden',
  },
  uploadBoxEmpty: {
    minHeight: 220,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadBoxFilled: {
    borderWidth: 0,
    backgroundColor: SLATE_900,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  previewWrap: {
    width: '100%',
    backgroundColor: SLATE_900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  changeHint: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadInner: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SLATE_900,
    marginBottom: 4,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 12,
    color: SLATE_400,
    textAlign: 'center',
  },
});
