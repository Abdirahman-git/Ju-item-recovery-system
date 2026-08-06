import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppModalSheet, AppReadOnlyField } from './AppForm';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 420;

export default function ItemClaimFormModal({
  visible,
  onClose,
  onSubmit,
  submitting,
  initialName = '',
  initialStudentId = '',
}) {
  const [description, setDescription] = useState('');
  const trimmed = description.trim();
  const canSubmit = Boolean(initialStudentId) && trimmed.length >= MIN_REASON_LENGTH && !submitting;
  const remaining = MAX_REASON_LENGTH - description.length;

  useEffect(() => {
    if (!visible) setDescription('');
  }, [visible]);

  const helperText = useMemo(() => {
    if (!initialStudentId) return 'Student ID is missing on your account.';
    if (!trimmed) return 'Write a clear reason so admin can verify your ownership.';
    if (trimmed.length < MIN_REASON_LENGTH) {
      const left = MIN_REASON_LENGTH - trimmed.length;
      return `Add ${left} more character${left === 1 ? '' : 's'}.`;
    }
    return 'Looks good. Send it to admin for review.';
  }, [initialStudentId, trimmed]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ description: trimmed });
  };

  const handleClose = () => {
    if (!submitting) {
      setDescription('');
      onClose();
    }
  };

  return (
    <AppModalSheet
      visible={visible}
      title="This is mine"
      subtitle="Tell the admin why this item belongs to you. They will review your request."
      icon="hand-left-outline"
      onClose={handleClose}
      maxHeight="78%"
      footer={
        <View style={styles.footer}>
          <AppButton title="Cancel" variant="secondary" onPress={handleClose} disabled={submitting} style={styles.footerBtn} />
          <AppButton
            title="Send request"
            icon="paper-plane-outline"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            style={styles.footerBtn}
          />
        </View>
      }
    >
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#1D4ED8" />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Admin verification</Text>
          <Text style={styles.infoText}>
            Your request will appear in Ownership Requests. Admin can approve or reject it.
          </Text>
        </View>
      </View>

      {initialName ? <AppReadOnlyField label="Your name" value={initialName} icon="person-outline" /> : null}
      <AppReadOnlyField label="Student ID" value={initialStudentId || 'Missing'} icon="card-outline" />
      <AppInput
        label="Why is this yours?"
        value={description}
        onChangeText={(value) => setDescription(value.slice(0, MAX_REASON_LENGTH))}
        placeholder="Example: I lost this near the library. It has my sticker or mark..."
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />
      <View style={styles.helperRow}>
        <Text style={[styles.helperText, canSubmit && styles.helperGood]}>{helperText}</Text>
        <Text style={[styles.counter, remaining < 30 && styles.counterWarn]}>{remaining}</Text>
      </View>
      {!initialStudentId ? (
        <Text style={styles.warn}>Contact admin to add your Student ID before submitting a claim.</Text>
      ) : null}
    </AppModalSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerBtn: { flex: 1 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 14,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '900', color: '#1E3A8A', marginBottom: 3 },
  infoText: { fontSize: 12, lineHeight: 18, color: '#475569', fontWeight: '600' },
  helperRow: {
    marginTop: -6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  helperText: { flex: 1, fontSize: 12, color: '#64748B', fontWeight: '600' },
  helperGood: { color: '#059669' },
  counter: { fontSize: 11, color: '#94A3B8', fontWeight: '900' },
  counterWarn: { color: '#D97706' },
  warn: { fontSize: 12, color: '#B45309', marginTop: 8 },
});
