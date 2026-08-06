import { validateItemReportContent } from './contentValidation';

const isFilled = (value) => typeof value === 'string' && value.trim() !== '';

export const validateLostItemForm = (item) => {
  const missing = [];

  if (!isFilled(item?.itemName)) missing.push('Item Name');
  if (!isFilled(item?.category)) missing.push('Category');
  if (!isFilled(item?.location)) missing.push('Location');
  if (!isFilled(item?.description)) missing.push('Description');
  if (!isFilled(item?.dateLost)) missing.push('Date Lost');
  if (!isFilled(item?.timeLost)) missing.push('Time Lost');

  if (missing.length) {
    return { valid: false, missing };
  }

  const content = validateItemReportContent({
    itemName: item.itemName,
    location: item.location,
    description: item.description,
  });
  if (!content.valid) {
    return { valid: false, missing: [], contentError: content };
  }

  return { valid: true, missing: [] };
};

export const validateFoundItemForm = (item) => {
  const missing = [];

  if (!isFilled(item?.itemName)) missing.push('Item Name');
  if (!isFilled(item?.category)) missing.push('Category');
  if (!isFilled(item?.location)) missing.push('Location');
  if (!isFilled(item?.description)) missing.push('Description');
  if (!isFilled(item?.dateFound)) missing.push('Date Found');
  if (!isFilled(item?.timeFound)) missing.push('Time Found');
  if (!isFilled(item?.imageURI)) missing.push('Photo');

  if (missing.length) {
    return { valid: false, missing };
  }

  const content = validateItemReportContent({
    itemName: item.itemName,
    location: item.location,
    description: item.description,
  });
  if (!content.valid) {
    return { valid: false, missing: [], contentError: content };
  }

  return { valid: true, missing: [] };
};

export const getValidationAlertMessage = (result) => {
  if (result?.contentError) {
    return result.contentError.message;
  }
  const missing = Array.isArray(result) ? result : result?.missing || [];
  return `Please complete all required fields:\n\n• ${missing.join('\n• ')}`;
};
