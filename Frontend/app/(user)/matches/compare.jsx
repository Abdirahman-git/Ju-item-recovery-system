import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MatchCompareScreen from '../../../src/components/MatchCompareScreen';
import SuccessToast from '../../../src/components/SuccessToast';
import { useRef } from 'react';
import {
  getMatchesForItem,
  dismissMatch,
  linkMatch,
} from '../../../src/services/supabase';

export default function UserMatchCompareScreen() {
  const router = useRouter();
  const toastRef = useRef(null);
  const { matchData, itemId, itemType } = useLocalSearchParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (matchData) {
          setMatch(JSON.parse(matchData));
          setLoading(false);
          return;
        }
        if (itemId && itemType) {
          const matches = await getMatchesForItem(Number(itemId), itemType);
          setMatch(matches[0] || null);
        }
      } catch (e) {
        console.error('Failed to load match:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchData, itemId, itemType]);

  const handleConfirm = async () => {
    if (!match) return;
    try {
      setSubmitting(true);
      await linkMatch(match.id, match);
      toastRef.current?.show(
        'Match Saved',
        'We noted this as a likely match. Contact the reporter to verify.',
        'success'
      );
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save match confirmation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!match) return;
    try {
      setSubmitting(true);
      await dismissMatch(match.id, match);
      toastRef.current?.show('Dismissed', 'This suggestion was removed.', 'success');
      setTimeout(() => router.back(), 1000);
    } catch (e) {
      Alert.alert('Error', 'Could not dismiss match.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MatchCompareScreen
        match={match}
        loading={loading}
        submitting={submitting}
        onConfirmMatch={handleConfirm}
        onDismissMatch={handleDismiss}
      />
      <SuccessToast ref={toastRef} />
    </>
  );
}
