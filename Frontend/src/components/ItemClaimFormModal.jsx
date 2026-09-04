import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppModalSheet, AppReadOnlyField } from './AppForm';

export default function ItemClaimFormModal({
  visible,
  onClose,
  onSubmit,
  submitting,
  initialName = '',
  initialStudentId = '',
  questions = [],
  loadingQuestions = false,
  loadError = '',
}) {
  const [answers, setAnswers] = useState({});
  const list = Array.isArray(questions) ? questions : [];
  const allAnswered =
    list.length > 0 && list.every((_, i) => Number.isInteger(Number(answers[i])));
  const canSubmit =
    Boolean(initialStudentId) && allAnswered && !submitting && !loadingQuestions && !loadError;

  useEffect(() => {
    if (!visible) setAnswers({});
  }, [visible]);

  const helperText = useMemo(() => {
    if (loadError) return loadError;
    if (!initialStudentId) return 'Student ID is missing on your account.';
    if (loadingQuestions) return 'Loading Ownership Challenge…';
    if (!list.length) return 'No challenge questions yet.';
    if (!allAnswered) {
      const left = list.filter((_, i) => !Number.isInteger(Number(answers[i]))).length;
      return `Answer ${left} more question${left === 1 ? '' : 's'}.`;
    }
    return 'Submit to score your Ownership Challenge.';
  }, [allAnswered, answers, initialStudentId, list, loadError, loadingQuestions]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const selectedIndexes = list.map((_, i) => Number(answers[i]));
    onSubmit({ selectedIndexes });
  };

  const handleClose = () => {
    if (!submitting) {
      setAnswers({});
      onClose();
    }
  };

  return (
    <AppModalSheet
      visible={visible}
      title="Ownership Challenge"
      subtitle="Answer the private questions set by admin. Correct answers prove this item is yours."
      icon="shield-checkmark-outline"
      onClose={handleClose}
      maxHeight="88%"
      footer={
        <View style={styles.footer}>
          <AppButton title="Cancel" variant="secondary" onPress={handleClose} disabled={submitting} style={styles.footerBtn} />
          <AppButton
            title="Submit answers"
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
          <Ionicons name="help-circle-outline" size={20} color="#1D4ED8" />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>How scoring works</Text>
          <Text style={styles.infoText}>
            90%+ auto-approved · 51–89% visit office · 50% or below rejected.
          </Text>
        </View>
      </View>

      {initialName ? <AppReadOnlyField label="Your name" value={initialName} icon="person-outline" /> : null}
      <AppReadOnlyField label="Student ID" value={initialStudentId || 'Missing'} icon="card-outline" />

      {loadingQuestions ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1A56DB" />
          <Text style={styles.loadingText}>Loading challenge…</Text>
        </View>
      ) : null}

      {loadError ? <Text style={styles.warn}>{loadError}</Text> : null}

      {!loadingQuestions && !loadError
        ? list.map((q, qi) => (
            <View key={q.id || qi} style={styles.questionCard}>
              <Text style={styles.questionLabel}>Question {qi + 1}</Text>
              <Text style={styles.questionPrompt}>{q.prompt}</Text>
              <View style={styles.optionsWrap}>
                {(q.options || []).map((opt, oi) => {
                  const selected = Number(answers[qi]) === oi;
                  return (
                    <TouchableOpacity
                      key={oi}
                      style={[styles.optionRow, selected && styles.optionSelected]}
                      onPress={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                      activeOpacity={0.85}
                      disabled={submitting}
                    >
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={[styles.optionText, selected && styles.optionTextOn]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        : null}

      <Text style={[styles.helperText, canSubmit && styles.helperGood]}>{helperText}</Text>
      {!initialStudentId ? (
        <Text style={styles.warn}>Contact admin to add your Student ID before submitting.</Text>
      ) : null}
    </AppModalSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerBtn: { flex: 1 },
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
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  loadingText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  questionCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  questionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1A56DB',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  questionPrompt: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10, lineHeight: 20 },
  optionsWrap: { gap: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: '#1A56DB' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A56DB' },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },
  optionTextOn: { color: '#1E3A8A', fontWeight: '800' },
  helperText: { marginTop: 4, marginBottom: 8, fontSize: 12, color: '#64748B', fontWeight: '600' },
  helperGood: { color: '#059669' },
  warn: { fontSize: 12, color: '#B45309', marginTop: 8, fontWeight: '600' },
});
