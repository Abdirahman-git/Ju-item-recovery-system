import { isHighValueCategory } from './categories';
import { isSecureListing } from './itemStatus';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDayKeys(dayCount = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - 1 - index));
    return toDayKey(date);
  });
}

/** Count items per day for the last N days */
export function seriesFromItems(items = [], getDate, filter = () => true, dayCount = 7) {
  const keys = buildDayKeys(dayCount);
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));

  items.forEach((item) => {
    if (!filter(item)) return;
    const date = parseDate(getDate(item));
    if (!date) return;
    date.setHours(0, 0, 0, 0);
    const key = toDayKey(date);
    if (key in counts) counts[key] += 1;
  });

  return keys.map((key) => counts[key]);
}

export function buildPendingPageSparklines(reports = []) {
  const trend = seriesFromItems(reports, (r) => r.reportedAt);
  const highValue = seriesFromItems(
    reports,
    (r) => r.reportedAt,
    (r) => isHighValueCategory(r.displayCategory)
  );
  const lost = seriesFromItems(reports, (r) => r.reportedAt, (r) => r.reportType === 'lost');
  const found = seriesFromItems(reports, (r) => r.reportedAt, (r) => r.reportType === 'found');

  return {
    queue: trend,
    highValue,
    resolution: lost.map((v, i) => Math.max(v, found[i] ? Math.ceil(found[i] * 0.6) : 0)),
    integrity: found,
  };
}

export function buildUsersPageSparklines(users = []) {
  const getCreated = (u) => u.created_at;
  return {
    total: seriesFromItems(users, getCreated),
    active: seriesFromItems(users, getCreated, (u) => u.role === 'user' && u.is_approved === true),
    pending: seriesFromItems(users, getCreated, (u) => u.role === 'user' && u.is_approved !== true),
    admins: seriesFromItems(users, getCreated, (u) => u.role === 'admin'),
  };
}

export function buildContactMessagesSparklines(messages = []) {
  const getCreated = (m) => m.createdAt || m.created_at;
  return {
    inbox: seriesFromItems(messages, getCreated),
    new: seriesFromItems(messages, getCreated, (m) => m.status === 'new'),
    read: seriesFromItems(messages, getCreated, (m) => m.status === 'read'),
    archived: seriesFromItems(messages, getCreated, (m) => m.status === 'archived'),
  };
}

export function buildReturnedPageSparklines(items = []) {
  const getReturned = (item) => item.returnedAt || item.returned_at || item.created_at;
  return {
    total: seriesFromItems(items, getReturned),
    archive: seriesFromItems(items, getReturned, (item) => item.itemType === 'lost'),
  };
}

export function buildArchivedPageSparklines(items = []) {
  const getArchived = (item) => item.archivedAt || item.archived_at || item.created_at;
  return {
    total: seriesFromItems(items, getArchived),
    lost: seriesFromItems(items, getArchived, (item) => String(item.displayType || item.type || '').toUpperCase() === 'LOST'),
    found: seriesFromItems(items, getArchived, (item) => String(item.displayType || item.type || '').toUpperCase() === 'FOUND'),
  };
}

export function buildDraftsPageSparklines(items = []) {
  const getDrafted = (item) =>
    item.reportedAt || item.created_at || item.updated_at || item.dateLost || item.date_lost || item.dateFound || item.date_found;
  return {
    total: seriesFromItems(items, getDrafted),
    lost: seriesFromItems(items, getDrafted, (item) => item.itemType === 'lost'),
    found: seriesFromItems(items, getDrafted, (item) => item.itemType === 'found' && !isSecureListing(item)),
    secure: seriesFromItems(items, getDrafted, (item) => isSecureListing(item)),
  };
}

export function buildRecyclePageSparklines(items = []) {
  const getDeleted = (item) => item.deletedAt || item.deleted_at || item.created_at;
  return {
    total: seriesFromItems(items, getDeleted),
    users: seriesFromItems(items, getDeleted, (item) => item.entityType === 'user'),
    inventory: seriesFromItems(
      items,
      getDeleted,
      (item) => item.entityType === 'lost_item' || item.entityType === 'found_item'
    ),
    contact: seriesFromItems(items, getDeleted, (item) => item.entityType === 'contact_message'),
  };
}

export function buildMyItemsPageSparklines(items = []) {
  const getReported = (item) =>
    item.reportedAt || item.created_at || item.date_reported || item.date_lost || item.date_found;

  return {
    total: seriesFromItems(items, getReported),
    found: seriesFromItems(items, getReported, (item) => item.itemType === 'found' && !isSecureListing(item)),
    lost: seriesFromItems(items, getReported, (item) => item.itemType === 'lost'),
    secure: seriesFromItems(items, getReported, (item) => isSecureListing(item)),
    withPhoto: seriesFromItems(items, getReported, (item) => Boolean(item.imageUrl)),
  };
}

export function buildReportsPageSparklinesFromRecords(records = {}) {
  const keys = buildDayKeys(7);
  const seriesFromDateKeys = (rows = []) => {
    const counts = Object.fromEntries(keys.map((key) => [key, 0]));
    rows.forEach((row) => {
      if (row.dateKey && row.dateKey in counts) counts[row.dateKey] += 1;
    });
    return keys.map((key) => counts[key]);
  };

  const pending = records.pending || [];
  const claims = records.claims || [];

  return {
    users: seriesFromDateKeys(records.users),
    inventory: seriesFromDateKeys(records.inventory),
    returned: seriesFromDateKeys(records.returned),
    action: seriesFromDateKeys([...pending, ...claims]),
  };
}

export function buildReportsPageSparklines(data = {}) {
  const users = data.users || [];
  const items = data.items || [];
  const returned = data.returnedItems || [];
  const pending = data.pendingCombined || data.pendingReports?.combined || [];
  const claims = data.claims || [];

  const getReported = (item) =>
    item.reportedAt || item.created_at || item.date_reported || item.date_lost || item.date_found;
  const getUserDate = (u) => u.created_at;
  const getReturned = (item) => item.returnedAt || item.returned_at || item.created_at;
  const getClaimDate = (c) => c.requestedAt || c.created_at;

  const actionRows = [
    ...pending.map((r) => ({ at: r.reportedAt })),
    ...claims.map((c) => ({ at: getClaimDate(c) })),
  ];

  return {
    users: seriesFromItems(users, getUserDate),
    inventory: seriesFromItems(items, getReported),
    returned: seriesFromItems(returned, getReturned),
    action: seriesFromItems(actionRows, (row) => row.at),
  };
}
