import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAppWarning } from './appAlert';

export { getDefaultTimeLabel, formatItemTime } from './itemTimeUtils';

/**
 * Android's native crop UI (allowsEditing) often leaves sticky +/− zoom
 * overlays on the React Native screen after crop. Skip editing on Android;
 * keep it on iOS where the system cropper works cleanly.
 */
const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: Platform.OS === 'ios',
  aspect: [4, 3],
  quality: 0.85,
};

async function launchCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    showAppWarning('Permission denied', 'Camera permission is required to take photos.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  if (result.canceled) return null;
  if (Platform.OS === 'android') {
    // Let the native picker activity fully dismiss before returning to RN
    // (prevents sticky +/− crop controls from leaking onto the form).
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return result.assets[0].uri;
}

async function launchGallery() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    showAppWarning('Permission denied', 'Gallery permission is required to choose a photo.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled) return null;
  if (Platform.OS === 'android') {
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return result.assets[0].uri;
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
