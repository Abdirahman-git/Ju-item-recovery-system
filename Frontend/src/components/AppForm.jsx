import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const PRIMARY = Colors.primaryDark || '#1E40AF';
const SLATE_900 = Colors.slate900 || '#0F172A';
const SLATE_700 = Colors.slate700 || '#334155';
const SLATE_500 = Colors.slate500 || '#64748B';
const SLATE_400 = Colors.slate400 || '#94A3B8';
const SLATE_100 = Colors.slate100 || '#F1F5F9';
const SLATE_50 = Colors.slate50 || '#F8FAFC';
const WHITE = Colors.white || '#FFFFFF';
const ERROR = Colors.error || '#EF4444';

export function AppModalSheet({
  visible,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  maxHeight = '88%',
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { maxHeight }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              {icon ? (
                <View style={styles.headerIconWrap}>
                  <Ionicons name={icon} size={18} color={PRIMARY} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
              </View>
            </View>
            {onClose ? (
              <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={SLATE_500} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  multiline = false,
  editable = true,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  style,
  inputStyle,
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputBox, multiline && styles.textAreaBox, !editable && styles.disabledBox]}>
        {icon ? <Ionicons name={icon} size={18} color={SLATE_500} style={styles.inputIcon} /> : null}
        <TextInput
          style={[styles.input, multiline && styles.textAreaInput, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={SLATE_400}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
        />
      </View>
    </View>
  );
}

export function AppReadOnlyField({ label, value, icon = 'lock-closed-outline' }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputBox, styles.disabledBox]}>
        <Ionicons name={icon} size={18} color={SLATE_500} style={styles.inputIcon} />
        <Text style={styles.readOnlyText}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export function AppButton({
  title,
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}) {
  const buttonStyle =
    variant === 'destructive'
      ? styles.destructiveButton
      : variant === 'secondary'
      ? styles.secondaryButton
      : styles.primaryButton;
  const textStyle =
    variant === 'secondary' ? styles.secondaryButtonText : styles.primaryButtonText;
  const iconColor = variant === 'secondary' ? SLATE_500 : WHITE;

  return (
    <TouchableOpacity
      style={[styles.buttonBase, buttonStyle, (disabled || loading) && styles.disabledButton, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.86}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={iconColor} style={styles.buttonIcon} /> : null}
          <Text style={textStyle}>{title || label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const ALERT_VARIANTS = {
  info: { icon: 'information-circle', color: PRIMARY, bg: '#EFF6FF' },
  success: { icon: 'checkmark-circle', color: '#059669', bg: '#ECFDF5' },
  warning: { icon: 'alert-circle', color: '#D97706', bg: '#FFFBEB' },
  error: { icon: 'close-circle', color: ERROR, bg: '#FEE2E2' },
};

export function AppAlertDialog({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  showCancel = false,
  destructive = false,
  variant = 'info',
  loading = false,
  solidBackdrop = false,
  onCancel,
  onConfirm,
}) {
  const theme = ALERT_VARIANTS[variant] || ALERT_VARIANTS.info;
  const singleButton = showCancel === false || !onCancel;

  return (
    <Modal
      visible={visible}
      transparent={!solidBackdrop}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onConfirm || onCancel}
    >
      <View style={solidBackdrop ? styles.alertOverlaySolid : styles.alertOverlay}>
        <View style={solidBackdrop ? styles.alertCardSolid : styles.alertCard}>
          <View style={[styles.alertIconWrap, { backgroundColor: theme.bg }]}>
            <Ionicons name={theme.icon} size={28} color={theme.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          {message ? <Text style={styles.alertMessage}>{message}</Text> : null}
          <View style={singleButton ? styles.alertActionsSingle : styles.confirmActions}>
            {showCancel && onCancel ? (
              <AppButton
                title={cancelText || 'Cancel'}
                variant="secondary"
                onPress={onCancel}
                disabled={loading}
                style={{ flex: 1 }}
              />
            ) : null}
            <AppButton
              title={confirmText}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm || onCancel}
              loading={loading}
              style={singleButton ? undefined : { flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AppConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const theme = destructive ? ALERT_VARIANTS.warning : ALERT_VARIANTS.info;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <View style={[styles.alertIconWrap, { backgroundColor: theme.bg }]}>
            <Ionicons name={theme.icon} size={28} color={theme.color} />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          {message ? <Text style={styles.confirmMessage}>{message}</Text> : null}
          <View style={styles.confirmActions}>
            <AppButton
              title={cancelText}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <AppButton
              title={confirmText}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SLATE_900,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: SLATE_500,
    lineHeight: 19,
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SLATE_100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingTop: 16,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: SLATE_400,
    letterSpacing: 0.8,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  inputBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLATE_50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  textAreaBox: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  disabledBox: {
    backgroundColor: SLATE_100,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: Platform.OS === 'ios' ? 0 : 1,
  },
  input: {
    flex: 1,
    color: SLATE_900,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  textAreaInput: {
    minHeight: 96,
    paddingTop: 0,
  },
  readOnlyText: {
    flex: 1,
    color: SLATE_700,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonBase: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
  },
  secondaryButton: {
    backgroundColor: SLATE_100,
  },
  destructiveButton: {
    backgroundColor: ERROR,
  },
  disabledButton: {
    opacity: 0.62,
  },
  primaryButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: SLATE_500,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonIcon: {
    marginRight: 8,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
    elevation: 24,
  },
  alertOverlaySolid: {
    flex: 1,
    backgroundColor: WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    zIndex: 9999,
    elevation: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  alertCardSolid: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLATE_100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  alertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SLATE_900,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: SLATE_500,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertActionsSingle: {
    width: '100%',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SLATE_900,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: SLATE_500,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});

export const appFormStyles = {
  label: styles.label,
  inputBox: styles.inputBox,
  textAreaBox: styles.textAreaBox,
  input: styles.input,
  textAreaInput: styles.textAreaInput,
  primaryButton: [styles.buttonBase, styles.primaryButton],
  secondaryButton: [styles.buttonBase, styles.secondaryButton],
  destructiveButton: [styles.buttonBase, styles.destructiveButton],
};
