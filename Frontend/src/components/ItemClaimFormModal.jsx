import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppButton, AppInput, AppModalSheet } from './AppForm';

export default function ItemClaimFormModal({
  visible,
  onClose,
  onSubmit,
  submitting,
  initialName = '',
  initialStudentId = '',
}) {
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onSubmit({ description: description.trim() });
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
      maxHeight="70%"
      footer={
        <View style={styles.footer}>
          <AppButton title="Cancel" variant="secondary" onPress={handleClose} disabled={submitting} style={styles.footerBtn} />
          <AppButton title="Send to admin" onPress={handleSubmit} loading={submitting} style={styles.footerBtn} />
        </View>
      }
    >
      <AppInput label="Your name" value={initialName} editable={false} />
      <AppInput label="Student ID" value={initialStudentId || '—'} editable={false} />
      <AppInput
        label="Why is this yours?"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. I lost this in Hall 5 on Tuesday…"
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />
      {!initialStudentId ? (
        <Text style={styles.warn}>Student ID missing on your account. Contact admin before submitting.</Text>
      ) : null}
    </AppModalSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerBtn: { flex: 1 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  warn: { fontSize: 12, color: '#B45309', marginTop: 8 },
});
