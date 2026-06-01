/** Somali / English terms that describe the same item type */
export const ITEM_SYNONYM_GROUPS = [
  ['glasses', 'ookiyaale', 'ookiyaalaha', 'muraayad', 'muraayadaha', 'eyeglasses', 'spectacles'],
  ['airpods', 'airports', 'earbuds', 'earbud', 'headphones', 'headset'],
  ['watch', 'saacad', 'clock'],
  ['phone', 'mobile', 'telefoon', 'iphone', 'samsung', 'telephone'],
  ['keys', 'key', 'furaha', 'fur'],
  ['wallet', 'boorsada', 'purse', 'boorsa'],
  ['id', 'card', 'aqoonsi', 'aqoonsiga', 'student card', 'id card'],
  ['laptop', 'computer', 'macbook', 'notebook'],
  ['bag', 'backpack', 'boorsada', 'shandad'],
  ['book', 'books', 'buug', 'buuga'],
  ['charger', 'cable', 'usb'],
];

const CAMPUS_LOCATION_RE = /\b(hall|library|floor|lab|block|room|gate|cafeteria|office|mosque|parking)\b/i;

export function itemSearchText(item) {
  return [item?.itemName, item?.description, item?.location]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ');
}

export function locationSearchText(item) {
  const loc = (item?.location || '').trim();
  const desc = (item?.description || '').trim();
  return `${loc} ${desc}`.toLowerCase();
}

export function isCampusLocation(value) {
  return CAMPUS_LOCATION_RE.test(value || '');
}

export function getSynonymHits(text) {
  const normalized = (text || '').toLowerCase();
  const matchedGroups = [];

  ITEM_SYNONYM_GROUPS.forEach((group) => {
    if (group.some((term) => normalized.includes(term))) {
      matchedGroups.push(group);
    }
  });

  return matchedGroups;
}

export function sharesSynonymGroup(textA, textB) {
  const groupsA = getSynonymHits(textA);
  if (!groupsA.length) return false;

  return groupsA.some((groupA) => {
    const groupsB = getSynonymHits(textB);
    return groupsB.some((groupB) => groupA === groupB);
  });
}

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}
