import { useCallback, useState } from 'react';
import { AppAlertDialog, AppConfirmDialog } from '../components/AppForm';

const INITIAL = {
  visible: false,
  title: '',
  message: '',
  variant: 'info',
  confirmText: 'OK',
  cancelText: 'Cancel',
  showCancel: false,
  destructive: false,
};

const CONFIRM_INITIAL = {
  visible: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  destructive: false,
  loading: false,
};

export function useAppAlert() {
  const [state, setState] = useState(INITIAL);
  const [confirm, setConfirm] = useState(CONFIRM_INITIAL);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirm((s) => ({ ...s, visible: false, loading: false }));
    setPendingConfirm(null);
    setPendingCancel(null);
  }, []);

  const showAlert = useCallback((options) => {
    const {
      title = 'Notice',
      message = '',
      variant = 'info',
      confirmText = 'OK',
      cancelText = 'Cancel',
      showCancel = false,
      destructive = false,
      onConfirm,
      onCancel,
    } = typeof options === 'string' ? { message: options } : options;

    setPendingConfirm(() => onConfirm || null);
    setPendingCancel(() => onCancel || null);
    setState({
      visible: true,
      title,
      message,
      variant,
      confirmText,
      cancelText,
      showCancel,
      destructive,
    });
  }, []);

  const showConfirm = useCallback((options) => {
    const {
      title = 'Confirm',
      message = '',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      destructive = false,
      onConfirm,
      onCancel,
    } = options;

    setPendingConfirm(() => onConfirm || null);
    setPendingCancel(() => onCancel || null);
    setConfirm({
      visible: true,
      title,
      message,
      confirmText,
      cancelText,
      destructive,
      loading: false,
    });
  }, []);

  const showError = useCallback(
    (title, message) => showAlert({ title: title || 'Error', message, variant: 'error' }),
    [showAlert]
  );

  const showSuccess = useCallback(
    (title, message) => showAlert({ title: title || 'Success', message, variant: 'success' }),
    [showAlert]
  );

  const showWarning = useCallback(
    (title, message) => showAlert({ title: title || 'Warning', message, variant: 'warning' }),
    [showAlert]
  );

  const runPending = (fn) => {
    hide();
    hideConfirm();
    fn?.();
  };

  const AlertUI = (
    <AppAlertDialog
      visible={state.visible}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      showCancel={state.showCancel}
      destructive={state.destructive}
      onConfirm={() => runPending(pendingConfirm)}
      onCancel={() => runPending(pendingCancel)}
    />
  );

  const ConfirmUI = (
    <AppConfirmDialog
      visible={confirm.visible}
      title={confirm.title}
      message={confirm.message}
      confirmText={confirm.confirmText}
      cancelText={confirm.cancelText}
      destructive={confirm.destructive}
      loading={confirm.loading}
      onCancel={() => runPending(pendingCancel)}
      onConfirm={async () => {
        if (!pendingConfirm) {
          hideConfirm();
          return;
        }
        try {
          setConfirm((s) => ({ ...s, loading: true }));
          await pendingConfirm();
        } finally {
          hideConfirm();
        }
      }}
    />
  );

  return {
    showAlert,
    showConfirm,
    showError,
    showSuccess,
    showWarning,
    hide,
    hideConfirm,
    AlertUI,
    ConfirmUI,
  };
}
