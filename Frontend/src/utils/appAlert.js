let api = null;
const pending = [];

function enqueue(item) {
  pending.push(item);
}

function flushPending() {
  if (!api || pending.length === 0) return;
  const items = pending.splice(0, pending.length);
  items.forEach((item) => {
    if (item.kind === 'alert') api.showAlert(item.options);
    else if (item.kind === 'error') api.showError(item.title, item.message);
    else if (item.kind === 'warning') api.showWarning(item.title, item.message);
    else if (item.kind === 'success') api.showSuccess(item.title, item.message);
    else if (item.kind === 'confirm') api.showConfirm(item.options);
  });
}

export function setAppAlertApi(next) {
  api = next;
  flushPending();
}

export function showAppAlert(options) {
  if (!api) {
    enqueue({ kind: 'alert', options });
    return;
  }
  api.showAlert(options);
}

export function showAppError(title, message) {
  if (!api) {
    enqueue({ kind: 'error', title, message });
    return;
  }
  api.showError(title, message);
}

export function showAppWarning(title, message) {
  if (!api) {
    enqueue({ kind: 'warning', title, message });
    return;
  }
  api.showWarning(title, message);
}

export function showAppSuccess(title, message) {
  if (!api) {
    enqueue({ kind: 'success', title, message });
    return;
  }
  api.showSuccess(title, message);
}

export function showAppConfirm(options) {
  if (!api) {
    enqueue({ kind: 'confirm', options });
    return;
  }
  api.showConfirm(options);
}

/** Validation / missing input — warning modal (same design everywhere). */
export function showAppValidation(message, title = 'Check your input') {
  showAppWarning(title, message || '');
}

/** Load / action failures — error modal (same design everywhere). */
export function showAppFailure(message, title = 'Something went wrong') {
  showAppError(title, message || '');
}
