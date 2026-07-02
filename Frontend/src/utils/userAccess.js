import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/supabase';

export const ACCOUNT_SUSPENDED_MESSAGE =
  'Your account is pending admin approval or has been suspended. Please contact the Jazeera University Lost & Found office.';

/** Students must be approved; admins always allowed. */
export function canUseApp(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.is_approved === true;
}

/** Re-check DB approval for the stored student session. */
export async function verifySessionUserAccess() {
  const raw = await AsyncStorage.getItem('userSession');
  if (!raw) return { allowed: false, reason: 'no_session' };

  const session = JSON.parse(raw);
  if (!session?.isLoggedIn || !session.email) {
    return { allowed: false, reason: 'no_session' };
  }

  if (session.role === 'admin') {
    return { allowed: true, session };
  }

  const user = await getUserProfile(session.email);
  if (!user) {
    return { allowed: false, reason: 'not_found' };
  }

  if (!canUseApp(user)) {
    return { allowed: false, reason: 'not_approved', session };
  }

  return { allowed: true, session, user };
}

export async function clearUserSession(showSuspendedNotice = false) {
  await AsyncStorage.removeItem('userSession');
  if (showSuspendedNotice) {
    await AsyncStorage.setItem('showSuspendedToast', 'true');
  }
}
