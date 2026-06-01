const isFilled = (value) => typeof value === 'string' && value.trim() !== '';

export const validateLostItemForm = (item) => {
  const missing = [];

  if (!isFilled(item?.itemName)) missing.push('Item Name');
  if (!isFilled(item?.category)) missing.push('Category');
  if (!isFilled(item?.location)) missing.push('Location');
  if (!isFilled(item?.description)) missing.push('Description');
  if (!isFilled(item?.dateLost)) missing.push('Date Lost');
  if (!isFilled(item?.timeLost)) missing.push('Time Lost');

  return { valid: missing.length === 0, missing };
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

  return { valid: missing.length === 0, missing };
};

export const getValidationAlertMessage = (missing) =>
  `Please complete all required fields:\n\n• ${missing.join('\n• ')}`;
