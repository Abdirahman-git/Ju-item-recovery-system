/**
 * Shared content-quality checks for admin Lost / Found / Secure forms.
 * Blocks empty-looking junk (hhhh, 9999, symbols-only) before draft save or publish.
 */

const DEFAULT_BLOCKED = [
  'asdf',
  'asdfgh',
  'qwerty',
  'qwertyuiop',
  'zxcvbn',
  'lorem ipsum',
  'testtest',
  'dummy',
  'spam',
  'xxxxxx',
  'yyyyyy',
  'nnnnnn',
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '').toLowerCase();
}

function hasLetters(value) {
  return /[\p{L}]/u.test(value);
}

function letterCount(value) {
  const matches = value.match(/[\p{L}]/gu);
  return matches ? matches.length : 0;
}

export function isRepeatedCharSpam(value) {
  const compact = compactText(value);
  if (compact.length < 3) return false;
  if (/^(.)\1+$/u.test(compact)) return true;
  if (/(.)\1{3,}/u.test(compact)) return true;
  const unique = new Set([...compact]);
  if (compact.length >= 4 && unique.size <= 2) return true;
  if (compact.length >= 6 && /^(..)\1+$/u.test(compact)) return true;
  return false;
}

export function isNumbersOrSymbolsOnly(value) {
  const text = normalizeText(value);
  if (!text) return true;
  return !hasLetters(text);
}

export function hasTooFewLetters(value, { minLetters = 2 } = {}) {
  const text = normalizeText(value);
  if (!text) return true;
  return letterCount(text) < minLetters;
}

export function containsBlockedPattern(value, extraBlocked = []) {
  const compact = compactText(value);
  if (!compact) return false;
  const list = [...DEFAULT_BLOCKED, ...extraBlocked].map((w) => w.toLowerCase().replace(/\s+/g, ''));
  return list.some((word) => word.length >= 4 && compact.includes(word));
}

export function validateMeaningfulText(value, options = {}) {
  const {
    fieldLabel = 'Field',
    minLength = 3,
    minLetters = 2,
    allowEmpty = false,
  } = options;

  const text = normalizeText(value);

  if (!text) {
    if (allowEmpty) return { valid: true };
    return {
      valid: false,
      title: `${fieldLabel} required`,
      message: `Please enter a real ${fieldLabel.toLowerCase()}.`,
    };
  }

  if (text.length < minLength) {
    return {
      valid: false,
      title: `${fieldLabel} too short`,
      message: `${fieldLabel} must be at least ${minLength} characters.`,
    };
  }

  if (isNumbersOrSymbolsOnly(text)) {
    return {
      valid: false,
      title: `Invalid ${fieldLabel.toLowerCase()}`,
      message: `${fieldLabel} must include real letters — not only numbers or symbols.`,
    };
  }

  if (hasTooFewLetters(text, { minLetters })) {
    return {
      valid: false,
      title: `Invalid ${fieldLabel.toLowerCase()}`,
      message: `${fieldLabel} needs clearer wording with real letters.`,
    };
  }

  if (isRepeatedCharSpam(text)) {
    return {
      valid: false,
      title: `Invalid ${fieldLabel.toLowerCase()}`,
      message: `${fieldLabel} looks like spam (repeated characters). Use a clear campus description.`,
    };
  }

  if (containsBlockedPattern(text)) {
    return {
      valid: false,
      title: `Invalid ${fieldLabel.toLowerCase()}`,
      message: `${fieldLabel} contains blocked test/spam wording. Please write a real notice.`,
    };
  }

  return { valid: true };
}

export function validateItemReportContent({
  itemName,
  location,
  description,
  requireLocation = true,
  requireDescription = true,
} = {}) {
  const nameCheck = validateMeaningfulText(itemName, {
    fieldLabel: 'Item name',
    minLength: 3,
    minLetters: 2,
  });
  if (!nameCheck.valid) return { ...nameCheck, field: 'itemName' };

  if (requireLocation) {
    const locationCheck = validateMeaningfulText(location, {
      fieldLabel: 'Location',
      minLength: 5,
      minLetters: 2,
    });
    if (!locationCheck.valid) return { ...locationCheck, field: 'location' };
  }

  if (requireDescription) {
    const descriptionCheck = validateMeaningfulText(description, {
      fieldLabel: 'Description',
      minLength: 10,
      minLetters: 4,
    });
    if (!descriptionCheck.valid) return { ...descriptionCheck, field: 'description' };
  }

  return { valid: true };
}

export function validateSecureNoticeContent({ name, description, requireDescription = false } = {}) {
  const nameCheck = validateMeaningfulText(name, {
    fieldLabel: 'Item name',
    minLength: 3,
    minLetters: 2,
  });
  if (!nameCheck.valid) return nameCheck;

  const descriptionCheck = validateMeaningfulText(description, {
    fieldLabel: 'Description',
    minLength: 10,
    minLetters: 4,
    allowEmpty: !requireDescription,
  });
  if (!descriptionCheck.valid) return descriptionCheck;

  return { valid: true };
}
