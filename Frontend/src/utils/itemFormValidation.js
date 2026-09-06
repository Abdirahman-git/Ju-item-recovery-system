import { validateItemReportContent } from './contentValidation';

const isFilled = (value) => typeof value === 'string' && value.trim() !== '';

const REQUIRED_MSG = {
  itemName: 'Item name is required.',
  category: 'Please select a category.',
  location: 'Location is required.',
  description: 'Description is required.',
  dateLost: 'Date lost is required.',
  timeLost: 'Time lost is required.',
  dateFound: 'Date found is required.',
  timeFound: 'Time found is required.',
  imageURI: 'Photo is required.',
};

function collectMissingFieldErrors(checks) {
  const fieldErrors = {};
  const missing = [];
  for (const { key, label, ok } of checks) {
    if (ok) continue;
    fieldErrors[key] = REQUIRED_MSG[key] || `${label} is required.`;
    missing.push(label);
  }
  return { fieldErrors, missing };
}

export const validateLostItemForm = (item) => {
  const { fieldErrors, missing } = collectMissingFieldErrors([
    { key: 'itemName', label: 'Item Name', ok: isFilled(item?.itemName) },
    { key: 'category', label: 'Category', ok: isFilled(item?.category) },
    { key: 'location', label: 'Location', ok: isFilled(item?.location) },
    { key: 'description', label: 'Description', ok: isFilled(item?.description) },
    { key: 'dateLost', label: 'Date Lost', ok: isFilled(item?.dateLost) },
    { key: 'timeLost', label: 'Time Lost', ok: isFilled(item?.timeLost) },
  ]);

  if (missing.length) {
    return { valid: false, missing, fieldErrors };
  }

  const content = validateItemReportContent({
    itemName: item.itemName,
    location: item.location,
    description: item.description,
  });
  if (!content.valid) {
    const field = content.field || 'itemName';
    return {
      valid: false,
      missing: [],
      fieldErrors: { [field]: content.message },
      contentError: content,
    };
  }

  return { valid: true, missing: [], fieldErrors: {} };
};

export const validateFoundItemForm = (item) => {
  const { fieldErrors, missing } = collectMissingFieldErrors([
    { key: 'itemName', label: 'Item Name', ok: isFilled(item?.itemName) },
    { key: 'category', label: 'Category', ok: isFilled(item?.category) },
    { key: 'location', label: 'Location', ok: isFilled(item?.location) },
    { key: 'description', label: 'Description', ok: isFilled(item?.description) },
    { key: 'dateFound', label: 'Date Found', ok: isFilled(item?.dateFound) },
    { key: 'timeFound', label: 'Time Found', ok: isFilled(item?.timeFound) },
    { key: 'imageURI', label: 'Photo', ok: isFilled(item?.imageURI) },
  ]);

  if (missing.length) {
    return { valid: false, missing, fieldErrors };
  }

  const content = validateItemReportContent({
    itemName: item.itemName,
    location: item.location,
    description: item.description,
  });
  if (!content.valid) {
    const field = content.field || 'itemName';
    return {
      valid: false,
      missing: [],
      fieldErrors: { [field]: content.message },
      contentError: content,
    };
  }

  return { valid: true, missing: [], fieldErrors: {} };
};

/** @deprecated Prefer fieldErrors under each input. Kept for legacy callers. */
export const getValidationAlertMessage = (result) => {
  if (result?.contentError) {
    return result.contentError.message;
  }
  const missing = Array.isArray(result) ? result : result?.missing || [];
  return `Please complete all required fields:\n\n• ${missing.join('\n• ')}`;
};
