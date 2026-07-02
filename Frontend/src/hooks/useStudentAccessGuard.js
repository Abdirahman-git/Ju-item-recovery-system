import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { clearUserSession, verifySessionUserAccess } from '../utils/userAccess';

/** Kick suspended / deleted students out of the user app area. */
export default function useStudentAccessGuard() {
  const router = useRouter();

  const enforceAccess = useCallback(async () => {
    try {
      const result = await verifySessionUserAccess();
      if (result.allowed || result.reason === 'no_session') return;

      const suspended = result.reason === 'not_approved';
      await clearUserSession(suspended);
      router.replace('/(auth)/login');
    } catch (e) {
      console.warn('Student access check failed:', e?.message);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      enforceAccess();
    }, [enforceAccess])
  );
}
