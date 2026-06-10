import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { showAppWarning } from './appAlert';

/** Jazeera University campus — see Map.md */
export const CAMPUS = {
  latitude: 2.04061,
  longitude: 45.29997,
  radiusMeters: 130,
  name: 'Jazeera University',
};

const EARTH_RADIUS_M = 6371000;

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinCampus(latitude, longitude) {
  const dist = distanceMeters(latitude, longitude, CAMPUS.latitude, CAMPUS.longitude);
  return { allowed: dist <= CAMPUS.radiusMeters, distanceMeters: Math.round(dist) };
}

/**
 * Read device GPS and verify the user is on campus.
 * GPS is checked locally only — coordinates are not sent to the server.
 */
export async function verifyCampusLocation() {
  if (Platform.OS === 'web') {
    return {
      allowed: false,
      reason: 'web',
      message: 'Campus location check works on the mobile app. Open this on your phone to report an item.',
    };
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return {
      allowed: false,
      reason: 'disabled',
      message: 'Turn on location services on your device to report an item.',
    };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return {
      allowed: false,
      reason: 'denied',
      message: 'Location permission is required. You can only report items while on campus.',
    };
  }

  let position;
  try {
    position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch (e) {
    return {
      allowed: false,
      reason: 'unavailable',
      message: e?.message || 'Could not read your location. Try again outdoors or near a window.',
    };
  }

  const { latitude, longitude } = position.coords;
  const { allowed, distanceMeters: dist } = isWithinCampus(latitude, longitude);

  if (allowed) {
    return { allowed: true, distanceMeters: dist };
  }

  return {
    allowed: false,
    reason: 'outside',
    distanceMeters: dist,
    message: `You are about ${dist}m from campus. Reporting is only allowed within ${CAMPUS.radiusMeters}m of ${CAMPUS.name}.`,
  };
}

/** Run campus check before opening a report form. Returns true if the form may open. */
export async function guardCampusForReport() {
  const result = await verifyCampusLocation();
  if (result.allowed) return true;

  const title =
    result.reason === 'denied' || result.reason === 'disabled'
      ? 'Location required'
      : result.reason === 'web'
      ? 'Use mobile app'
      : 'Not on campus';

  showAppWarning(title, result.message);
  return false;
}
