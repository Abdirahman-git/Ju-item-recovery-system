import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { AppButton, AppModalSheet, AppReadOnlyField } from './AppForm';
import {
  QUESTION_TYPE_ASK,
  QUESTION_TYPE_DIRECT,
  resolveQuestionType,
} from '../utils/ownershipChallenge';

function usesTextAnswer(q) {
  const type = resolveQuestionType(q);
  if (type === QUESTION_TYPE_DIRECT || type === QUESTION_TYPE_ASK) return true;
  const opts = Array.isArray(q?.options) ? q.options.filter((o) => String(o || '').trim()) : [];
  // Empty option list cannot be MCQ — show text box (Ask-like)
  return opts.length === 0;
}

function isQuestionAnswered(q, value) {
  if (usesTextAnswer(q)) {
    return String(value || '').trim().length > 0;
  }
  return Number.isInteger(Number(value));
}

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
    list.length > 0 && list.every((q, i) => isQuestionAnswered(q, answers[i]));
  const canSubmit =
    Boolean(initialStudentId) && allAnswered && !submitting && !loadingQuestions && !loadError;

  useEffect(() => {
    if (!visible) setAnswers({});
  }, [visible]);

  const helperText = useMemo(() => {
    if (loadError) return loadError;
    if (!initialStudentId) return 'ID is missing on your account.';
    if (loadingQuestions) return 'Loading Ownership Challenge…';
    if (!list.length) return 'No challenge questions yet.';
    if (!allAnswered) {
      const left = list.filter((q, i) => !isQuestionAnswered(q, answers[i])).length;
      return `Answer ${left} more question${left === 1 ? '' : 's'}.`;
    }
    return 'Ready to submit.';
  }, [allAnswered, answers, initialStudentId, list, loadError, loadingQuestions]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = list.map((q, i) =>
      usesTextAnswer(q) ? String(answers[i] || '').trim() : Number(answers[i])
    );
    onSubmit({ answers: payload });
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
      {initialName ? <AppReadOnlyField label="Your name" value={initialName} icon="person-outline" /> : null}
      <AppReadOnlyField label="ID" value={initialStudentId || 'Missing'} icon="card-outline" />

      {loadingQuestions ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1A56DB" />
          <Text style={styles.loadingText}>Loading challenge…</Text>
        </View>
      ) : null}

      {loadError ? <Text style={styles.warn}>{loadError}</Text> : null}

      {!loadingQuestions && !loadError
        ? list.map((q, qi) => {
            const type = resolveQuestionType(q);
            const isText = usesTextAnswer(q);
            const isAsk = type === QUESTION_TYPE_ASK || (isText && type !== QUESTION_TYPE_DIRECT);
            return (
              <View key={q.id || qi} style={styles.questionCard}>
                <Text style={styles.questionLabel}>
                  Question {qi + 1}
                  {isAsk ? ' · Ask' : type === QUESTION_TYPE_DIRECT ? ' · Direct' : ''}
                </Text>
                <Text style={styles.questionPrompt}>{q.prompt}</Text>
                {isText ? (
                  <TextInput
                    style={styles.directInput}
                    value={String(answers[qi] ?? '')}
                    onChangeText={(text) => setAnswers((prev) => ({ ...prev, [qi]: text }))}
                    placeholder={
                      isAsk
                        ? 'Type your answer in your own words…'
                        : 'Type your answer…'
                    }
                    placeholderTextColor="#94A3B8"
                    editable={!submitting}
                    autoCapitalize="sentences"
                    autoCorrect
                    multiline
                    textAlignVertical="top"
                  />
                ) : (
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
                )}
              </View>
            );
          })
        : null}

      <Text style={[styles.helperText, canSubmit && styles.helperGood]}>{helperText}</Text>
      {!initialStudentId ? (
        <Text style={styles.warn}>Contact admin to add your ID before submitting.</Text>
      ) : null}
    </AppModalSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerBtn: { flex: 1 },
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
  directInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  optionsWrap: { gap: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#1A56DB',
    backgroundColor: '#EFF6FF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: '#1A56DB' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A56DB',
  },
  optionText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#334155', lineHeight: 20 },
  optionTextOn: { color: '#1E40AF' },
  helperText: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  helperGood: { color: '#059669' },
  warn: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
  },
});
