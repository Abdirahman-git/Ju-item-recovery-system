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

/** Letters from Latin + common Somali/Arabic ranges (not only A–Z). */
function hasLetters(value) {
  return /[\p{L}]/u.test(value);
}

function letterCount(value) {
  const matches = value.match(/[\p{L}]/gu);
  return matches ? matches.length : 0;
}

/**
 * True for repeated-character spam: "hhhh", "aaaaaa", "11111", "abababab" noise.
 */
export function isRepeatedCharSpam(value) {
  const compact = compactText(value);
  if (compact.length < 3) return false;

  // Entire value is one character repeated
  if (/^(.)\1+$/u.test(compact)) return true;

  // 4+ identical letter characters in a row (e.g. "hhhh", "aaaa") or 5+ identical characters
  if (/([\p{L}])\1{3,}/u.test(compact)) return true;
  if (/(.)\1{4,}/u.test(compact)) return true;

  // Very low variety (≤2 unique chars) on a string of 6+ chars
  const unique = new Set([...compact]);
  if (compact.length >= 6 && unique.size <= 2) return true;

  // Alternating 2-char spam: abababab / 12121212
  if (compact.length >= 6 && /^(..)\1{2,}$/u.test(compact)) return true;

  return false;
}

/** True when there are no letters — only digits / punctuation / emoji. */
export function isNumbersOrSymbolsOnly(value) {
  const text = normalizeText(value);
  if (!text) return true;
  return false;
}

/** Too few real letters vs length (e.g. "ab!!!!!!!!!!"). */
export function hasTooFewLetters(value, { minLetters = 0 } = {}) {
  const text = normalizeText(value);
  if (!text) return true;
  if (minLetters <= 0) return false;
  return letterCount(text) < minLetters;
}

export function containsBlockedPattern(value, extraBlocked = []) {
  const compact = compactText(value);
  if (!compact) return false;
  const list = [...DEFAULT_BLOCKED, ...extraBlocked].map((w) => w.toLowerCase().replace(/\s+/g, ''));
  return list.some((word) => word.length >= 4 && compact.includes(word));
}

/**
 * Validate one free-text field.
 * @returns {{ valid: true } | { valid: false, title: string, message: string }}
 */
export function validateMeaningfulText(value, options = {}) {
  const {
    fieldLabel = 'Field',
    minLength = 2,
    minLetters = 0,
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

  if (minLetters > 0) {
    const letterCount = (text.match(/\p{L}/gu) || []).length;
    if (letterCount < minLetters) {
      return {
        valid: false,
        title: `Invalid ${fieldLabel.toLowerCase()}`,
        message: `${fieldLabel} must include at least ${minLetters} letters (not only numbers or symbols).`,
      };
    }
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

/**
 * Lost / Found report fields (name, location, description).
 */
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
  if (!nameCheck.valid) return nameCheck;

  if (requireLocation) {
    const locationCheck = validateMeaningfulText(location, {
      fieldLabel: 'Location',
      minLength: 5,
      minLetters: 2,
    });
    if (!locationCheck.valid) return locationCheck;
  }

  if (requireDescription) {
    const descriptionCheck = validateMeaningfulText(description, {
      fieldLabel: 'Description',
      minLength: 10,
      minLetters: 4,
    });
    if (!descriptionCheck.valid) return descriptionCheck;
  }

  return { valid: true };
}

/**
 * Secure Found notice (name + public description; location is fixed).
 */
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
