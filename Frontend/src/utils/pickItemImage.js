import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export { getDefaultTimeLabel, formatItemTime } from './itemTimeUtils';

async function launchCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  });

  return result.canceled ? null : result.assets[0].uri;
}

async function launchGallery() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Gallery permission is required to choose a photo.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  });

  return result.canceled ? null : result.assets[0].uri;
}

/** Opens camera directly when the photo box is tapped (gallery on web only). */
export async function pickItemImage() {
  if (Platform.OS === 'web') {
    return launchGallery();
  }
  return launchCamera();
}

/** Long-press or secondary action if you need gallery later */
export async function pickItemImageFromGallery() {
  return launchGallery();
}
