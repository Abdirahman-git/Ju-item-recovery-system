/** Minimum score (out of 100) to suggest a lost/found pair */
import {
  itemSearchText,
  locationSearchText,
  sharesSynonymGroup,
  tokenize,
} from './itemMatchLexicon';

export const MATCH_THRESHOLD = 50;

export const MAX_MATCH_SCORE = 100;

function scoreCategory(lostItem, foundItem) {
  const catA = (lostItem?.category || '').trim().toLowerCase();
  const catB = (foundItem?.category || '').trim().toLowerCase();
  if (catA && catB && catA === catB) return 40;
  return 0;
}

function scoreLocation(lostItem, foundItem) {
  const locA = locationSearchText(lostItem);
  const locB = locationSearchText(foundItem);

  if (!locA.trim() || !locB.trim()) return 0;

  if (locA === locB) return 30;
  if (locA.includes(locB) || locB.includes(locA)) return 22;

  const wordsA = tokenize(locA);
  const wordsB = tokenize(locB);
  const overlap = wordsA.filter((w) => wordsB.includes(w));
  if (overlap.length > 0) return 15;

  const hallA = locA.match(/hall\s*\d+/);
  const hallB = locB.match(/hall\s*\d+/);
  if (hallA && hallB && hallA[0] === hallB[0]) return 28;

  return 0;
}

function scoreName(lostItem, foundItem) {
  const textA = itemSearchText(lostItem);
  const textB = itemSearchText(foundItem);

  if (sharesSynonymGroup(textA, textB)) {
    return {
      score: 18,
      detail: 'Same item type detected (Somali/English name or description).',
    };
  }

  const wordsA = tokenize(lostItem?.itemName);
  const wordsB = tokenize(foundItem?.itemName);
  const nameOverlap = wordsA.filter((w) =>
    wordsB.some((b) => b.includes(w) || w.includes(b))
  );

  if (nameOverlap.length >= 2) {
    return { score: 20, detail: 'Strong overlap in item name keywords.' };
  }
  if (nameOverlap.length === 1) {
    return { score: 12, detail: 'Some keywords match in the title.' };
  }

  const fullA = textA.trim();
  const fullB = textB.trim();
  if (fullA && fullB && (fullA.includes(fullB) || fullB.includes(fullA))) {
    return { score: 15, detail: 'Title and description mention similar details.' };
  }

  const descWordsA = tokenize(textA);
  const descWordsB = tokenize(textB);
  const descOverlap = descWordsA.filter((w) => descWordsB.includes(w));
  if (descOverlap.length >= 2) {
    return { score: 14, detail: 'Description fields mention similar details.' };
  }

  return { score: 0, detail: 'Item names differ significantly.' };
}

function scoreDate(lostItem, foundItem) {
  const dateLost = lostItem?.dateLost ? new Date(lostItem.dateLost) : null;
  const dateFound = foundItem?.dateFound ? new Date(foundItem.dateFound) : null;

  if (!dateLost || !dateFound || Number.isNaN(dateLost) || Number.isNaN(dateFound)) {
    return 0;
  }

  const diffDays = Math.abs(dateFound - dateLost) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 10;
  if (diffDays <= 14) return 5;
  return 0;
}

/**
 * Compare a lost item with a found item and return score + breakdown.
 */
export function computeMatchScore(lostItem, foundItem) {
  const categoryScore = scoreCategory(lostItem, foundItem);
  const locationScore = scoreLocation(lostItem, foundItem);
  const nameResult = scoreName(lostItem, foundItem);
  const nameScore = nameResult.score;
  const dateScore = scoreDate(lostItem, foundItem);

  const score = categoryScore + locationScore + nameScore + dateScore;
  const pct = (part, max) => (max > 0 ? Math.round((part / max) * 100) : 0);

  const breakdown = [
    {
      key: 'category',
      label: 'Category Match',
      percent: pct(categoryScore, 40),
      detail:
        categoryScore >= 40
          ? 'Both items share the same category.'
          : 'Categories differ or are missing.',
    },
    {
      key: 'location',
      label: 'Location Proximity',
      percent: pct(locationScore, 30),
      detail:
        locationScore >= 22
          ? 'Very similar location reported on campus.'
          : locationScore > 0
          ? 'Partial overlap in location or description.'
          : 'Locations appear different.',
    },
    {
      key: 'name',
      label: 'Name Similarity',
      percent: pct(nameScore, 20),
      detail: nameResult.detail,
    },
    {
      key: 'temporal',
      label: 'Temporal Sync',
      percent: pct(dateScore, 10),
      detail:
        dateScore >= 10
          ? 'Lost and found dates within 7 days.'
          : dateScore > 0
          ? 'Dates within 2 weeks of each other.'
          : 'Report dates are far apart.',
    },
  ];

  return { score, breakdown };
}

export function getConfidenceLabel(score) {
  if (score >= 80) return 'High Confidence Match';
  if (score >= 65) return 'Likely Match';
  if (score >= 50) return 'Possible Match';
  return 'Low Confidence';
}
