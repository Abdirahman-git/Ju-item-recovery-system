'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Box,
  ClipboardList,
  Database,
  FileText,
  Gift,
  Hourglass,
  Mail,
  RefreshCw,
  RotateCcw,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { categoriesMatch, canonicalizeCategory, resolveSystemCategories } from '@/lib/categories';
import { isValidJuStudentId } from '@/lib/faculty';
import { enrichContributorsWithUsers, fetchStoredCategories, fetchSystemReportsData } from '@/lib/supabase';
import { buildReportsPageSparklinesFromRecords } from '@/lib/pageSparklines';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/session';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import StatCard from '@/components/admin/StatCard';
import ItemThumbnail from '@/components/admin/ItemThumbnail';
import ReportFiltersPanel from '@/components/admin/reports/ReportFiltersPanel';
import ReportExportMenu, { SummaryExportMenu } from '@/components/admin/reports/ReportExportMenu';
import { exportOfficialExecutivePdf } from '@/lib/reportExport';
import ClaimsTrackingChart from '@/components/admin/reports/ClaimsTrackingChart';
import CategoriesBreakdownPanel from '@/components/admin/reports/CategoriesBreakdownPanel';
import TopContributorsPanel from '@/components/admin/reports/TopContributorsPanel';

const CONTRIBUTOR_SOURCES = new Set([
  'inventory',
  'lost',
  'found',
  'returned',
  'claims',
  'drafts',
  'secure',
  'pending',
]);

/** Item-based report sources — show Category filter and item insight panels */
const ITEM_REPORT_SOURCES = new Set([
  'inventory',
  'lost',
  'found',
  'returned',
  'pending',
  'claims',
  'drafts',
  'secure',
  'recycle',
  'archived',
]);

/** Non-item sources (e.g. Registered Users) — hide category + item breakdowns */
const NON_ITEM_REPORT_SOURCES = new Set(['users', 'contact', 'people']);

const EMPTY_STUDENT_IDS = new Set(['', '—', '–', '?', 'â€”']);

function isFoundKind(row = {}) {
  return row.itemKind === 'found' || String(row.id || '').startsWith('found-');
}

function peopleOrdinal(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `#${rank}`;
}

function peopleIdentityKey(row = {}) {
  const sid = String(row.studentId || '').trim().toUpperCase();
  if (isValidJuStudentId(sid)) return `sid:${sid}`;

  const email = normalizePersonKey(row.posterEmail || row.email);
  if (email && email.includes('@')) return `email:${email}`;

  const key = String(row.posterKey || '').trim();
  if (key && !key.startsWith('unknown')) return key;

  const name = normalizePersonKey(row.reporter || row.claimer || row.recipient);
  return name ? `name:${name}` : 'unknown:anonymous';
}

function peopleDisplayName(row = {}) {
  return String(row.reporter || row.claimer || row.recipient || row.name || '').trim() || 'Unknown';
}

function cleanStudentId(value) {
  const sid = String(value || '').trim().toUpperCase();
  if (!sid || EMPTY_STUDENT_IDS.has(sid)) return '—';
  return sid;
}

function buildPeopleRankingFromEvents(
  { lost = [], found = [], returned = [], claims = [] } = {},
  users = []
) {
  const map = new Map();

  function ensure(row) {
    const key = peopleIdentityKey(row);
    if (!map.has(key)) {
      const name = peopleDisplayName(row);
      const email = row.posterEmail || row.email || '';
      map.set(key, {
        id: key,
        posterKey: key,
        name,
        reporter: name,
        studentId: cleanStudentId(row.studentId),
        faculty: row.faculty || 'Unassigned',
        email,
        posterEmail: email,
        lost: 0,
        found: 0,
        returned: 0,
        ownership: 0,
        total: 0,
        count: 0,
        dateKey: row.dateKey || '',
      });
    }

    const entry = map.get(key);
    const sid = cleanStudentId(row.studentId);
    if ((entry.studentId === '—' || !isValidJuStudentId(entry.studentId)) && isValidJuStudentId(sid)) {
      entry.studentId = sid;
    }
    if (entry.faculty === 'Unassigned' && row.faculty) entry.faculty = row.faculty;
    if (!entry.email && (row.posterEmail || row.email)) {
      entry.email = row.posterEmail || row.email;
      entry.posterEmail = entry.email;
    }
    if (row.dateKey && (!entry.dateKey || row.dateKey > entry.dateKey)) {
      entry.dateKey = row.dateKey;
    }
    return entry;
  }

  lost.forEach((row) => {
    ensure(row).lost += 1;
  });
  found.forEach((row) => {
    ensure(row).found += 1;
  });
  returned.forEach((row) => {
    ensure(row).returned += 1;
  });
  claims.forEach((row) => {
    ensure(row).ownership += 1;
  });

  const rawRows = Array.from(map.values()).map((entry) => {
    const total = entry.lost + entry.found + entry.returned + entry.ownership;
    return { ...entry, total, count: total, key: entry.posterKey };
  });

  const enriched = enrichContributorsWithUsers(rawRows, users);

  const bySid = new Map();
  const leftovers = [];

  enriched.forEach((row) => {
    const sid = cleanStudentId(row.studentId);
    const next = {
      ...row,
      lost: Number(row.lost) || 0,
      found: Number(row.found) || 0,
      returned: Number(row.returned) || 0,
      ownership: Number(row.ownership) || 0,
    };

    if (isValidJuStudentId(sid)) {
      const existing = bySid.get(sid);
      if (!existing) {
        bySid.set(sid, {
          ...next,
          id: `sid:${sid}`,
          posterKey: `sid:${sid}`,
          studentId: sid,
        });
        return;
      }
      existing.lost += next.lost;
      existing.found += next.found;
      existing.returned += next.returned;
      existing.ownership += next.ownership;
      if (existing.faculty === 'Unassigned' && next.faculty) existing.faculty = next.faculty;
      if (!existing.email && next.email) existing.email = next.email;
      if (next.dateKey && (!existing.dateKey || next.dateKey > existing.dateKey)) {
        existing.dateKey = next.dateKey;
      }
      return;
    }

    leftovers.push(next);
  });

  const ranked = [...bySid.values(), ...leftovers]
    .map((entry) => {
      const total = entry.lost + entry.found + entry.returned + entry.ownership;
      const name = String(entry.name || entry.reporter || 'Unknown').trim() || 'Unknown';
      return {
        ...entry,
        name,
        reporter: name,
        identity: `${entry.faculty || 'Unassigned'} · ID ${entry.studentId || '—'}`,
        total,
        count: total,
      };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  let rank = 0;
  let prevTotal = null;
  return ranked.map((row) => {
    if (row.total !== prevTotal) {
      rank += 1;
      prevTotal = row.total;
    }
    const tied = ranked.filter((entry) => entry.total === row.total).length > 1;
    return {
      ...row,
      rank,
      rankLabel: tied ? `T-${peopleOrdinal(rank)}` : peopleOrdinal(rank),
    };
  });
}

function fieldsFromPosterKey(key = '') {
  if (key.startsWith('email:')) return { posterEmail: key.slice(6), studentId: '—' };
  if (key.startsWith('sid:')) return { posterEmail: '', studentId: key.slice(4) };
  return { posterEmail: '', studentId: '—' };
}

function aggregateContributorsFromRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.posterKey || row.reporter || 'unknown';
    if (!map.has(key)) {
      const fromKey = fieldsFromPosterKey(key);
      map.set(key, {
        key,
        name: row.reporter || 'Unknown',
        faculty: row.faculty || 'Unassigned',
        studentId: row.studentId && row.studentId !== '—' ? row.studentId : fromKey.studentId,
        email: row.posterEmail || fromKey.posterEmail || '',
        count: 0,
        lost: 0,
        found: 0,
      });
    }
    const entry = map.get(key);
    entry.count += 1;
    if (entry.faculty === 'Unassigned' && row.faculty) entry.faculty = row.faculty;
    if ((!entry.studentId || entry.studentId === '—') && row.studentId && row.studentId !== '—') {
      entry.studentId = row.studentId;
    }
    if (!entry.email && row.posterEmail) entry.email = row.posterEmail;
    const type = String(row.type || '').toLowerCase();
    if (type === 'found') entry.found += 1;
    else entry.lost += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function getLocalDateKey(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getQuickRangeDates(preset) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  if (preset === 'all_time') {
    return { from: '', to: '' };
  }

  if (preset === 'today') {
    return { from: todayKey, to: todayKey };
  }

  if (preset === 'this_week') {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { from: getLocalDateKey(start), to: todayKey };
  }

  if (preset === 'last_7') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: getLocalDateKey(start), to: todayKey };
  }

  if (preset === 'last_30') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: getLocalDateKey(start), to: todayKey };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: getLocalDateKey(start), to: todayKey };
}

function formatFilterDate(value) {
  if (!value) return 'Any';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(`${value}T12:00:00`)
    );
  } catch {
    return value;
  }
}

function rowStatusKey(row) {
  const value = String(row.status || '').toLowerCase();
  if (value === 'active') return 'active';
  if (value === 'pending') return 'pending';
  if (value === 'admin') return 'admin';
  return value;
}

function normalizePersonKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildPosterUserIndex(users = []) {
  const bySid = new Map();
  users.forEach((user) => {
    const sid = String(user.studentId || user.student_id || '').trim().toUpperCase();
    if (!isValidJuStudentId(sid)) return;
    bySid.set(sid, {
      sid,
      name: String(user.name || '').trim(),
      email: normalizePersonKey(user.email),
      nameKey: normalizePersonKey(user.name),
    });
  });
  return bySid;
}

function buildAdminPosterIndex(users = []) {
  const byEmail = new Map();

  users.forEach((user) => {
    const role = String(user.role || '').toLowerCase();
    if (role !== 'admin') return;
    const email = normalizePersonKey(user.email);
    if (!email) return;
    byEmail.set(email, {
      email,
      name: String(user.name || '').trim() || email,
      nameKey: normalizePersonKey(user.name || email),
      isSuper: email === SUPER_ADMIN_EMAIL,
    });
  });

  // Ensure Super Admin is always filterable even if missing from the users payload
  if (!byEmail.has(SUPER_ADMIN_EMAIL)) {
    byEmail.set(SUPER_ADMIN_EMAIL, {
      email: SUPER_ADMIN_EMAIL,
      name: 'Super admin',
      nameKey: 'super admin',
      isSuper: true,
    });
  }

  return Array.from(byEmail.values()).sort((a, b) => {
    if (a.isSuper !== b.isSuper) return a.isSuper ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function rowLooksLikeRegularAdminPost(row = {}, adminPosters = []) {
  const regularAdmins = adminPosters.filter((admin) => !admin.isSuper);
  const rowEmail = normalizePersonKey(row.posterEmail || row.email);
  const rowKey = String(row.posterKey || '').trim().toLowerCase();
  const names = [row.reporter, row.claimer, row.name, row.originalReporter]
    .map((value) => normalizePersonKey(value))
    .filter(Boolean);

  // Never treat Super admin as a regular Admin
  if (rowEmail === SUPER_ADMIN_EMAIL) return false;
  if (names.some((name) => name === 'super admin' || name.includes('super admin'))) return false;

  if (rowEmail && regularAdmins.some((admin) => admin.email === rowEmail)) return true;
  if (
    rowKey.startsWith('email:') &&
    regularAdmins.some((admin) => rowKey === `email:${admin.email}`)
  ) {
    return true;
  }
  if (regularAdmins.some((admin) => names.includes(admin.nameKey))) return true;

  // Generic campus admin mailbox (not admin2 super)
  if (rowEmail && /^admin@/.test(rowEmail)) return true;
  if (rowEmail && /^admin\d+@/.test(rowEmail) && rowEmail !== SUPER_ADMIN_EMAIL) return true;

  return false;
}

function rowMatchesAdminPoster(row, admin) {
  if (!admin) return false;
  const rowEmail = normalizePersonKey(row.posterEmail || row.email);
  if (admin.email && rowEmail && admin.email === rowEmail) return true;

  const rowKey = String(row.posterKey || '').trim();
  if (admin.email && rowKey === `email:${admin.email}`) return true;
  if (admin.nameKey && rowKey === `name:${admin.nameKey}`) return true;

  const names = [row.reporter, row.claimer, row.name, row.originalReporter]
    .map((value) => normalizePersonKey(value))
    .filter(Boolean);
  if (admin.nameKey && names.includes(admin.nameKey)) return true;

  if (admin.isSuper) {
    if (rowEmail === SUPER_ADMIN_EMAIL) return true;
    if (names.some((name) => name === 'super admin' || name.includes('super admin'))) return true;
  }

  return false;
}

function rowMatchesRegisteredPoster(row, posterFilter, posterUsersBySid, adminPosters = []) {
  if (!posterFilter || posterFilter === 'all') return true;

  const wanted = String(posterFilter).trim();

  // Regular Admin only — never includes Super admin
  if (wanted === 'role:admins') {
    const regularAdmins = adminPosters.filter((admin) => !admin.isSuper);
    return (
      regularAdmins.some((admin) => rowMatchesAdminPoster(row, admin)) ||
      rowLooksLikeRegularAdminPost(row, adminPosters)
    );
  }

  // Super admin only — never includes regular Admin
  if (wanted === 'role:super') {
    const supers = adminPosters.filter((admin) => admin.isSuper);
    if (supers.length) return supers.some((admin) => rowMatchesAdminPoster(row, admin));
    return rowMatchesAdminPoster(row, {
      email: SUPER_ADMIN_EMAIL,
      nameKey: 'super admin',
      isSuper: true,
    });
  }

  if (wanted.startsWith('admin:')) {
    const email = normalizePersonKey(wanted.slice(6));
    const admin =
      adminPosters.find((entry) => entry.email === email) ||
      ({
        email,
        nameKey: '',
        isSuper: email === SUPER_ADMIN_EMAIL,
      });
    return rowMatchesAdminPoster(row, admin);
  }

  const sid = wanted.startsWith('sid:') ? wanted.slice(4).toUpperCase() : '';
  const user = sid ? posterUsersBySid.get(sid) : null;

  if (!user) {
    const rowKey = String(row.posterKey || '').trim();
    return rowKey === wanted;
  }

  const rowEmail = normalizePersonKey(row.posterEmail || row.email);
  if (user.email && rowEmail && user.email === rowEmail) return true;

  const rowKey = String(row.posterKey || '').trim();
  if (rowKey === `sid:${user.sid}`) return true;
  if (user.email && rowKey === `email:${user.email}`) return true;
  if (user.nameKey && rowKey === `name:${user.nameKey}`) return true;

  const rowSid = String(row.studentId || '').trim().toUpperCase();
  if (isValidJuStudentId(rowSid) && rowSid === user.sid) return true;

  const rowNames = [row.reporter, row.claimer, row.recipient, row.name, row.originalReporter]
    .map((value) => normalizePersonKey(value))
    .filter(Boolean);
  if (user.nameKey && rowNames.includes(user.nameKey)) return true;

  return false;
}

function rowActivityKey(row = {}) {
  return (
    String(row.posterKey || row.reporter || row.claimer || row.recipient || 'unknown').trim() || 'unknown'
  );
}

function rowActivityScore(row = {}) {
  if (typeof row.total === 'number' && (row.lost != null || row.ownership != null)) {
    return Number(row.total) || 0;
  }
  return null;
}

function filterReportRows(rows, filters, posterUsersBySid = null, adminPosters = []) {
  const base = rows.filter((row) => {
    if (filters.status !== 'all' && rowStatusKey(row) !== filters.status) {
      return false;
    }

    if (filters.faculty && filters.faculty !== 'all') {
      if (String(row.faculty || 'Unassigned') !== filters.faculty) {
        return false;
      }
    }

    if (filters.category && filters.category !== 'all') {
      if (!categoriesMatch(row.category || 'Other', filters.category)) {
        return false;
      }
    }

    if (filters.poster && filters.poster !== 'all') {
      if (
        !rowMatchesRegisteredPoster(
          row,
          filters.poster,
          posterUsersBySid || new Map(),
          adminPosters || []
        )
      ) {
        return false;
      }
    }

    if (filters.from || filters.to) {
      if (!row.dateKey) return false;
      if (filters.from && row.dateKey < filters.from) return false;
      if (filters.to && row.dateKey > filters.to) return false;
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const hit = Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term));
      if (!hit) return false;
    }

    return true;
  });

  const mode = String(filters.activityExtremum || 'all');
  if (mode !== 'max' && mode !== 'min') return base;

  const counts = new Map();
  base.forEach((row) => {
    const key = rowActivityKey(row);
    const preset = rowActivityScore(row);
    counts.set(key, preset != null ? preset : (counts.get(key) || 0) + 1);
  });
  if (counts.size === 0) return base;

  const values = Array.from(counts.values());
  const target = mode === 'max' ? Math.max(...values) : Math.min(...values);
  const winners = new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count === target)
      .map(([key]) => key)
  );

  return base.filter((row) => winners.has(rowActivityKey(row)));
}

function buildStatusOptions(rows = []) {
  const values = new Set();
  rows.forEach((row) => {
    const key = rowStatusKey(row);
    if (key) values.add(key);
  });

  const labelMap = {
    live: 'Live',
    draft: 'Draft',
    pending_review: 'Pending review',
    pending: 'Approved',
    approved: 'Approved',
    physical: 'Physical',
    rejected: 'Rejected',
    active: 'Active',
    admin: 'Admin',
    new: 'New',
    read: 'Read',
    archived: 'Archived',
  };

  return [
    { value: 'all', label: 'All statuses' },
    ...Array.from(values)
      .sort()
      .map((value) => ({ value, label: labelMap[value] || formatStatusLabel(value) })),
  ];
}

const DEFAULT_RANGE = getQuickRangeDates('all_time');

const EMPTY_REPORTS = {
  summary: {
    totalUsers: 0,
    students: 0,
    admins: 0,
    approvedStudents: 0,
    pendingStudents: 0,
    totalItems: 0,
    lostItems: 0,
    foundItems: 0,
    returnedItems: 0,
    pendingReports: 0,
    draftItems: 0,
    secureItems: 0,
    totalClaims: 0,
    pendingClaims: 0,
    physicalClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    recoveryRate: 0,
    maxUserActivityCount: 0,
    maxUserActivityName: '—',
    maxUserActivityMeta: 'No item posts yet',
  },
  categories: [],
  faculties: [],
  topContributors: [],
  dataSources: [],
  records: {},
  generatedAt: null,
};

const SOURCE_ICONS = {
  users: Users,
  inventory: Box,
  people: Trophy,
  lost: FileText,
  found: Box,
  returned: Gift,
  pending: Hourglass,
  claims: ClipboardList,
  drafts: FileText,
  secure: Shield,
  recycle: Database,
  archived: Archive,
  contact: Mail,
};

const REPORT_COLUMNS = {
  users: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'joined', label: 'Joined' },
  ],
  inventory: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  people: [
    { key: 'rankLabel', label: 'Rank' },
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'lost', label: 'Lost' },
    { key: 'found', label: 'Found' },
    { key: 'returned', label: 'Returned' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'total', label: 'Total' },
  ],
  people_lost: [
    { key: 'rankLabel', label: 'Rank' },
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'lost', label: 'Lost' },
    { key: 'total', label: 'Total' },
  ],
  people_found: [
    { key: 'rankLabel', label: 'Rank' },
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'found', label: 'Found' },
    { key: 'total', label: 'Total' },
  ],
  people_returned: [
    { key: 'rankLabel', label: 'Rank' },
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'returned', label: 'Returned' },
    { key: 'total', label: 'Total' },
  ],
  people_ownership: [
    { key: 'rankLabel', label: 'Rank' },
    { key: 'name', label: 'Name' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'total', label: 'Total' },
  ],
  lost: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  found: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Reported' },
  ],
  returned: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'originalReporter', label: 'Found by' },
    { key: 'recipient', label: 'Recipient' },
    { key: 'type', label: 'Type' },
    { key: 'returnedAt', label: 'Returned' },
  ],
  pending: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'reporter', label: 'Reporter' },
    { key: 'type', label: 'Type' },
    { key: 'reportedAt', label: 'Submitted' },
  ],
  claims: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'item', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'claimer', label: 'Claimer' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'status', label: 'Status' },
    { key: 'score', label: 'Score' },
    { key: 'result', label: 'Result' },
    { key: 'requestedAt', label: 'Requested' },
  ],
  drafts: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Saved' },
  ],
  secure: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'reporter', label: 'Posted by' },
    { key: 'reportedAt', label: 'Posted' },
  ],
  recycle: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Deleted Entity' },
    { key: 'category', label: 'Summary' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Deleted At' },
  ],
  archived: [
    { key: 'imageUrl', label: 'Photo' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'reason', label: 'Reason' },
    { key: 'archivedBy', label: 'Archived By' },
    { key: 'reportedAt', label: 'Archived' },
  ],
  contact: [
    { key: 'name', label: 'Sender' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'studentId', label: 'ID' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'subject', label: 'Subject' },
    { key: 'item', label: 'Item' },
    { key: 'place', label: 'Campus place' },
    { key: 'status', label: 'Status' },
    { key: 'submittedAt', label: 'Submitted' },
  ],
};

function formatGeneratedAt(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function formatStatusLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'live') return 'Live';
  if (normalized === 'draft') return 'Draft';
  if (normalized === 'pending_review') return 'Pending Review';
  if (normalized === 'returned') return 'Returned';
  if (normalized === 'archived') return 'Archived';
  if (normalized === 'deleted') return 'Deleted';
  if (normalized === 'pending') return 'Approved';
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'physical') return 'Physical';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'active') return 'Active';
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'new') return 'New';
  if (normalized === 'read') return 'Read';
  return value || '—';
}

function statusTone(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'active' || normalized === 'approved' || normalized === 'live' || normalized === 'read') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'physical') {
    return 'bg-indigo-50 text-indigo-700';
  }
  if (
    normalized === 'pending' ||
    normalized === 'pending_review' ||
    normalized === 'draft' ||
    normalized === 'new'
  ) {
    return 'bg-amber-50 text-amber-700';
  }
  if (normalized === 'rejected') return 'bg-red-50 text-red-600';
  if (normalized === 'deleted') return 'bg-red-50 text-red-600';
  if (normalized === 'admin') return 'bg-violet-50 text-violet-700';
  if (normalized === 'archived') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
}

function ResetConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md overflow-hidden p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-inner">
          <RotateCcw size={28} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">Reset filters?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Date range, status, faculty, category, search, and data source will return to defaults (Global Inventory · All time).
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
          >
            Yes, reset
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportItemPhoto({ row }) {
  if (row.isSecure) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600"
        title="Secure hold — photo hidden"
      >
        <span className="text-lg font-black leading-none">!</span>
      </div>
    );
  }

  const itemType = String(row.type || row.reportType || '').toLowerCase() === 'found' ? 'found' : 'lost';

  return <ItemThumbnail src={row.imageUrl} alt={row.name || row.item || 'Item photo'} itemType={itemType} itemName={row.name || row.item} category={row.category} />;
}

function ReportTable({ columns, rows, onResetFilters, loading = false }) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
        <p className="text-base font-extrabold text-slate-700">No records match these filters</p>
        <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
          Try &quot;All time&quot;, change the data source or status, or clear your search.
        </p>
        {onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1648c7]"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[20px] bg-white/75 backdrop-blur-[2px]">
          <RefreshCw size={18} className="animate-spin text-[#1A56DB]" />
          <span className="text-sm font-bold text-slate-600">Refreshing report...</span>
        </div>
      ) : null}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 ${
                    column.key === 'imageUrl'
                      ? 'w-[72px]'
                      : column.key === 'name' || column.key === 'item'
                        ? 'min-w-[180px]'
                        : 'whitespace-nowrap'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 transition hover:bg-blue-50/40 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                }`}
              >
                {columns.map((column) => {
                  const raw = row[column.key] ?? '—';
                  const isPhoto = column.key === 'imageUrl';
                  const isStatus = column.key === 'status' || column.key === 'role';
                  const isType = column.key === 'type';
                  const isRank = column.key === 'rankLabel';
                  const isCount =
                    column.key === 'lost' ||
                    column.key === 'found' ||
                    column.key === 'returned' ||
                    column.key === 'ownership' ||
                    column.key === 'total';
                  const value = isStatus ? formatStatusLabel(raw) : raw;
                  const wrapCell =
                    column.key === 'name' ||
                    column.key === 'item' ||
                    column.key === 'email' ||
                    column.key === 'location' ||
                    column.key === 'faculty' ||
                    column.key === 'reporter' ||
                    column.key === 'originalReporter' ||
                    column.key === 'recipient';

                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3.5 text-slate-800 ${
                        isPhoto
                          ? 'w-[72px]'
                          : wrapCell
                            ? 'min-w-[140px] max-w-[240px] whitespace-normal font-semibold'
                            : 'whitespace-nowrap font-medium'
                      }`}
                    >
                      {isPhoto ? (
                        <ReportItemPhoto row={row} />
                      ) : isStatus ? (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${statusTone(raw)}`}>
                          {value}
                        </span>
                      ) : isType ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
                            String(raw).toLowerCase() === 'found'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {value}
                        </span>
                      ) : isRank ? (
                        <span
                          className={`inline-flex min-w-[2.75rem] justify-center rounded-full px-2.5 py-1 text-[11px] font-black ${
                            row.rank === 1
                              ? 'bg-amber-100 text-amber-800'
                              : row.rank === 2
                                ? 'bg-slate-200 text-slate-700'
                                : row.rank === 3
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {value}
                        </span>
                      ) : isCount ? (
                        <span
                          className={`tabular-nums ${
                            column.key === 'total' ? 'font-black text-slate-950' : 'font-bold text-slate-700'
                          }`}
                        >
                          {Number(raw) || 0}
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemReportsClient() {
  const { session } = useSession();
  const isSuperAdmin = checkSuperAdmin(session);
  const { setActions, clearActions } = useAdminHeaderActions();

  const [quickRange, setQuickRange] = useState('all_time');
  const [filters, setFilters] = useState({
    sourceId: 'inventory',
    status: 'all',
    faculty: 'all',
    category: 'all',
    poster: 'all',
    peopleType: 'all',
    activityExtremum: 'all',
    from: DEFAULT_RANGE.from,
    to: DEFAULT_RANGE.to,
    search: '',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [sparkPlayKey, setSparkPlayKey] = useState(0);
  const [storedCategories, setStoredCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchStoredCategories({ forAdmin: true })
      .then((list) => {
        if (!cancelled) setStoredCategories(list);
      })
      .catch(() => {
        if (!cancelled) setStoredCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchReports = useCallback(
    () => fetchSystemReportsData({ includePrivilegedSources: isSuperAdmin }),
    [isSuperAdmin]
  );

  const { data, error, refresh } = useBackgroundFetch(
    isSuperAdmin ? 'admin:reports:super' : 'admin:reports',
    fetchReports,
    { fallback: EMPTY_REPORTS }
  );

  const view = data ?? EMPTY_REPORTS;
  const { summary, categories, topContributors, dataSources, records, generatedAt } = view;

  const sparklines = useMemo(() => buildReportsPageSparklinesFromRecords(records), [records]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const replaySparklines = useCallback(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const selectedSource = useMemo(
    () => dataSources.find((source) => source.id === filters.sourceId) || dataSources[0] || null,
    [dataSources, filters.sourceId]
  );

  const columns = useMemo(() => {
    if (filters.sourceId === 'people' && filters.peopleType && filters.peopleType !== 'all') {
      return REPORT_COLUMNS[`people_${filters.peopleType}`] || REPORT_COLUMNS.people;
    }
    return REPORT_COLUMNS[filters.sourceId] || REPORT_COLUMNS.users;
  }, [filters.sourceId, filters.peopleType]);
  const isPeopleSource = filters.sourceId === 'people';

  const peopleTypeOptions = useMemo(
    () => [
      { value: 'all', label: 'All types' },
      { value: 'lost', label: 'Lost' },
      { value: 'found', label: 'Found' },
      { value: 'returned', label: 'Returned' },
      { value: 'ownership', label: 'Ownership' },
    ],
    []
  );

  const posterUsersBySid = useMemo(() => buildPosterUserIndex(records.users || []), [records.users]);
  const adminPosters = useMemo(() => buildAdminPosterIndex(records.users || []), [records.users]);

  const registeredUsersForIdentity = useMemo(
    () =>
      (records.users || []).map((row) => ({
        name: row.name,
        email: row.email,
        student_id: row.studentId,
        studentId: row.studentId,
        faculty: row.faculty,
        role: row.role === 'Admin' ? 'admin' : 'user',
      })),
    [records.users]
  );

  const peopleEventBuckets = useMemo(() => {
    const lost = (records.lost || []).filter((row) => !isFoundKind(row));
    // Returned ranking credits the finder (FOUND recoveries), never the recipient/owner reunion.
    const returned = (records.returned || []).filter((row) => row.peopleReturnedCredit);
    return {
      lost,
      found: records.found || [],
      returned,
      claims: records.claims || [],
    };
  }, [records]);

  const peopleAllRows = useMemo(
    () => buildPeopleRankingFromEvents(peopleEventBuckets, registeredUsersForIdentity),
    [peopleEventBuckets, registeredUsersForIdentity]
  );

  const peopleFilteredRows = useMemo(() => {
    const eventFilters = {
      ...filters,
      faculty: 'all',
      poster: 'all',
      search: '',
      activityExtremum: 'all',
    };
    const lostRows = filterReportRows(
      peopleEventBuckets.lost,
      eventFilters,
      posterUsersBySid,
      adminPosters
    );
    const foundRows = filterReportRows(
      peopleEventBuckets.found,
      eventFilters,
      posterUsersBySid,
      adminPosters
    );
    const returnedRows = filterReportRows(
      peopleEventBuckets.returned,
      eventFilters,
      posterUsersBySid,
      adminPosters
    );
    const claimRows = filterReportRows(
      peopleEventBuckets.claims,
      eventFilters,
      posterUsersBySid,
      adminPosters
    );

    const type = String(filters.peopleType || 'all');
    const buckets =
      type === 'lost'
        ? { lost: lostRows, found: [], returned: [], claims: [] }
        : type === 'found'
          ? { lost: [], found: foundRows, returned: [], claims: [] }
          : type === 'returned'
            ? { lost: [], found: [], returned: returnedRows, claims: [] }
            : type === 'ownership'
              ? { lost: [], found: [], returned: [], claims: claimRows }
              : { lost: lostRows, found: foundRows, returned: returnedRows, claims: claimRows };

    const ranked = buildPeopleRankingFromEvents(buckets, registeredUsersForIdentity);
    return filterReportRows(
      ranked,
      { ...filters, from: '', to: '', category: 'all', status: 'all' },
      posterUsersBySid,
      adminPosters
    );
  }, [filters, peopleEventBuckets, posterUsersBySid, adminPosters, registeredUsersForIdentity]);

  const allRows = isPeopleSource ? peopleAllRows : records[filters.sourceId] || [];

  const filteredRows = useMemo(
    () =>
      isPeopleSource
        ? peopleFilteredRows
        : filterReportRows(allRows, filters, posterUsersBySid, adminPosters),
    [isPeopleSource, peopleFilteredRows, allRows, filters, posterUsersBySid, adminPosters]
  );

  const facultyOptions = useMemo(() => {
    const values = new Set();
    allRows.forEach((row) => {
      const faculty = String(row.faculty || '').trim();
      if (faculty) values.add(faculty);
    });
    return [
      { value: 'all', label: 'All faculties' },
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    ];
  }, [allRows]);

  const posterOptions = useMemo(() => {
    const adminOptions = [
      { value: 'role:admins', label: 'Admin' },
      { value: 'role:super', label: 'Super admin' },
    ];

    const studentOptions = Array.from(posterUsersBySid.values())
      .filter((user) => user.name)
      .map((user) => ({
        value: `sid:${user.sid}`,
        label: `${user.name} (${user.sid})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'all', label: 'All users' }, ...adminOptions, ...studentOptions];
  }, [posterUsersBySid]);

  const statusOptions = useMemo(() => {
    if (!isPeopleSource) return buildStatusOptions(allRows);
    return buildStatusOptions([
      ...peopleEventBuckets.lost,
      ...peopleEventBuckets.found,
      ...peopleEventBuckets.returned,
      ...peopleEventBuckets.claims,
    ]);
  }, [isPeopleSource, allRows, peopleEventBuckets]);

  const showItemInsightPanels = useMemo(
    () => !NON_ITEM_REPORT_SOURCES.has(filters.sourceId),
    [filters.sourceId]
  );

  /** Chart lifecycle: Lost = still missing, Found = returned/recovered */
  const chartRows = useMemo(() => {
    if (NON_ITEM_REPORT_SOURCES.has(filters.sourceId)) return [];

    const asLost = (rows = []) => rows.map((row) => ({ ...row, lifecycle: 'lost', type: 'Lost' }));
    const asFound = (rows = []) => rows.map((row) => ({ ...row, lifecycle: 'found', type: 'Returned' }));

    if (filters.sourceId === 'inventory' || filters.sourceId === 'lost' || filters.sourceId === 'found') {
      return [...asLost(records.inventory || []), ...asFound(records.returned || [])];
    }

    if (filters.sourceId === 'returned') {
      return asFound(allRows);
    }

    return asLost(allRows);
  }, [filters.sourceId, records, allRows]);

  const categoryOptions = useMemo(() => {
    // System list + admin-added item_categories only (no junk like "cream" / "Found - Jewelry")
    const list = resolveSystemCategories({ forAdmin: true, extras: storedCategories });
    return [
      { value: 'all', label: 'All categories' },
      ...list.map((value) => ({ value, label: value })),
    ];
  }, [storedCategories]);

  const sourceOptions = useMemo(
    () =>
      dataSources.map((source) => ({
        value: source.id,
        label: `${source.label} (${source.count.toLocaleString()})`,
        icon: SOURCE_ICONS[source.id] || Database,
      })),
    [dataSources]
  );

  const activityOptions = useMemo(
    () => [
      { value: 'all', label: 'All activity' },
      { value: 'max', label: 'Maximum (most active)' },
      { value: 'min', label: 'Minimum (least active)' },
    ],
    []
  );

  const filteredCategories = useMemo(() => {
    if (!showItemInsightPanels) return [];
    if (!filteredRows.length) {
      return ITEM_REPORT_SOURCES.has(filters.sourceId) ? [] : categories.slice(0, 8);
    }
    const map = {};
    filteredRows.forEach((row) => {
      const name = canonicalizeCategory(row.category) || 'Other';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [filteredRows, filters.sourceId, categories, showItemInsightPanels]);

  const categoryTotalItems = useMemo(
    () => filteredCategories.reduce((sum, row) => sum + row.count, 0),
    [filteredCategories]
  );

  const filteredContributors = useMemo(() => {
    if (!CONTRIBUTOR_SOURCES.has(filters.sourceId)) {
      return topContributors || [];
    }
    if (!filteredRows.length) return [];
    return aggregateContributorsFromRows(filteredRows);
  }, [filteredRows, filters.sourceId, topContributors]);

  const contributorTotalPosts = useMemo(
    () => filteredContributors.reduce((sum, row) => sum + row.count, 0),
    [filteredContributors]
  );

  const displayContributors = useMemo(() => {
    const registeredBySid = new Map();
    registeredUsersForIdentity.forEach((user) => {
      const sid = String(user.studentId || user.student_id || '')
        .trim()
        .toUpperCase();
      if (!isValidJuStudentId(sid)) return;
      registeredBySid.set(sid, user);
    });

    const enriched = enrichContributorsWithUsers(filteredContributors, registeredUsersForIdentity);
    const bySid = new Map();

    enriched.forEach((row) => {
      const sid = String(row.studentId || '')
        .trim()
        .toUpperCase();
      if (!isValidJuStudentId(sid) || !registeredBySid.has(sid)) return;

      const registered = registeredBySid.get(sid);
      const existing = bySid.get(sid);
      const count = Number(row.count) || 0;
      if (!existing) {
        bySid.set(sid, {
          ...row,
          key: `sid:${sid}`,
          name: String(registered.name || row.name || '').trim() || 'Unknown',
          email: String(registered.email || row.email || '').trim(),
          studentId: sid,
          faculty: registered.faculty || row.faculty || 'Unassigned',
          count,
        });
        return;
      }
      existing.count += count;
    });

    return Array.from(bySid.values()).sort((a, b) => b.count - a.count);
  }, [filteredContributors, registeredUsersForIdentity]);

  const categoriesAreFiltered = useMemo(
    () => ITEM_REPORT_SOURCES.has(filters.sourceId) && filteredRows.length > 0,
    [filters.sourceId, filteredRows.length]
  );

  const contributorsAreFiltered = useMemo(
    () => CONTRIBUTOR_SOURCES.has(filters.sourceId) && filteredRows.length > 0,
    [filters.sourceId, filteredRows.length]
  );

  const SelectedIcon = SOURCE_ICONS[filters.sourceId] || Database;

  const exportMetaLines = useMemo(
    () =>
      [
        `${filteredRows.length} of ${allRows.length} rows`,
        `${formatFilterDate(filters.from)} → ${formatFilterDate(filters.to)}`,
        filters.status === 'all' ? 'All statuses' : formatStatusLabel(filters.status),
        filters.faculty === 'all' ? 'All faculties' : filters.faculty,
        filters.poster === 'all'
          ? 'All users'
          : posterOptions.find((o) => o.value === filters.poster)?.label || 'One person',
        filters.category === 'all' ? 'All categories' : filters.category,
        filters.sourceId === 'people' && filters.peopleType !== 'all'
          ? peopleTypeOptions.find((o) => o.value === filters.peopleType)?.label || 'One type'
          : null,
        filters.activityExtremum === 'max'
          ? 'Maximum activity'
          : filters.activityExtremum === 'min'
            ? 'Minimum activity'
            : null,
        filters.search ? `Search: "${filters.search}"` : null,
      ].filter(Boolean),
    [filteredRows.length, allRows.length, filters, posterOptions, peopleTypeOptions]
  );

  function updateFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleQuickRange(preset) {
    const range = getQuickRangeDates(preset);
    setQuickRange(preset);
    updateFilters({ from: range.from, to: range.to });
  }

  function resetFilters() {
    const range = getQuickRangeDates('all_time');
    setQuickRange('all_time');
    setSearchDraft('');
    setFilters({
      sourceId: 'inventory',
      status: 'all',
      faculty: 'all',
      category: 'all',
      poster: 'all',
      peopleType: 'all',
      activityExtremum: 'all',
      from: range.from,
      to: range.to,
      search: '',
    });
  }

  function handleSourceChange(sourceId) {
    updateFilters({ sourceId, status: 'all', faculty: 'all', peopleType: 'all' });
  }

  function jumpToSource(sourceId) {
    setQuickRange('all_time');
    setSearchDraft('');
    setFilters((current) => ({
      ...current,
      sourceId,
      status: 'all',
      faculty: 'all',
      peopleType: 'all',
      from: '',
      to: '',
      search: '',
    }));
    requestAnimationFrame(() => {
      document.getElementById('report-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  useEffect(() => {
    if (dataSources.length && !dataSources.some((source) => source.id === filters.sourceId)) {
      updateFilters({ sourceId: dataSources[0].id });
    }
  }, [dataSources, filters.sourceId]);

  useEffect(() => {
    if (filters.status !== 'all' && !statusOptions.some((option) => option.value === filters.status)) {
      updateFilters({ status: 'all' });
    }
  }, [filters.sourceId, statusOptions, filters.status]);

  useEffect(() => {
    if (filters.faculty !== 'all' && !facultyOptions.some((option) => option.value === filters.faculty)) {
      updateFilters({ faculty: 'all' });
    }
  }, [filters.sourceId, facultyOptions, filters.faculty]);

  useEffect(() => {
    if (filters.category !== 'all' && !categoryOptions.some((option) => option.value === filters.category)) {
      updateFilters({ category: 'all' });
    }
  }, [categoryOptions, filters.category]);

  useEffect(() => {
    if (filters.poster !== 'all' && !posterOptions.some((option) => option.value === filters.poster)) {
      updateFilters({ poster: 'all' });
    }
  }, [posterOptions, filters.poster]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextSearch = searchDraft.trim();
        if (current.search === nextSearch) return current;
        return { ...current, search: nextSearch };
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const handleRefresh = useCallback(async () => {
    await refresh();
    replaySparklines();
  }, [refresh, replaySparklines]);

  useEffect(() => {
    setActions(
      <>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-[#1A56DB] hover:shadow-sm"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          type="button"
          onClick={() => exportOfficialExecutivePdf(view, formatGeneratedAt, session)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-gradient-to-r from-emerald-600 to-emerald-800 px-3 py-1.5 text-xs font-black text-white shadow-md shadow-emerald-700/20 transition hover:brightness-110"
        >
          <FileText size={13} />
          <span>Official Executive PDF</span>
        </button>
        <SummaryExportMenu view={view} formatGeneratedAt={formatGeneratedAt} />
      </>
    );
    return () => clearActions();
  }, [setActions, clearActions, handleRefresh, view, session]);

  return (
    <div className="w-full space-y-5 pb-6">
      {error ? (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-2 text-sm text-amber-800">
          Could not refresh system reports. Showing last saved data.
          <button type="button" onClick={refresh} className="ml-2 font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          active={filters.sourceId === 'users'}
          onClick={() => jumpToSource('users')}
          label="Campus Users"
          value={summary.totalUsers}
          icon="users"
          trendLabel={`${summary.approvedStudents} approved`}
          subLabel={`${summary.pendingStudents} pending`}
          sparkData={sparklines.users}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          active={filters.sourceId === 'inventory'}
          onClick={() => jumpToSource('inventory')}
          label="Total Inventory"
          value={summary.totalItems}
          icon="package"
          trendLabel={`${summary.lostItems} still missing · ${summary.foundItems} found`}
          subLabel={
            summary.maxUserActivityCount > 0
              ? `Most active: ${summary.maxUserActivityName} (${summary.maxUserActivityCount})`
              : undefined
          }
          sparkData={sparklines.inventory}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          active={filters.sourceId === 'returned'}
          onClick={() => jumpToSource('returned')}
          label="Successful Returns"
          value={summary.returnedItems}
          icon="check"
          trend={summary.recoveryRate > 0 ? `${summary.recoveryRate}%` : undefined}
          trendLabel="Recovery rate"
          sparkData={sparklines.returned}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          active={filters.sourceId === 'pending' || filters.sourceId === 'claims'}
          onClick={() => jumpToSource('pending')}
          label="Needs Action"
          value={summary.pendingReports + summary.pendingClaims}
          icon="alert"
          urgent={summary.pendingReports + summary.pendingClaims > 0}
          trendLabel={`${summary.pendingReports} reports · ${summary.physicalClaims || 0} physical · ${summary.pendingClaims} open claims`}
          sparkData={sparklines.action}
        />
      </div>

      <div id="report-filters" className="report-workspace overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.07)]">
        <ReportFiltersPanel
          quickRange={quickRange}
          onQuickRange={handleQuickRange}
          dateFrom={filters.from}
          dateTo={filters.to}
          onDateFrom={(value) => {
            setQuickRange('custom');
            updateFilters({ from: value });
          }}
          onDateTo={(value) => {
            setQuickRange('custom');
            updateFilters({ to: value });
          }}
          sourceOptions={sourceOptions}
          sourceValue={filters.sourceId}
          onSourceChange={handleSourceChange}
          statusOptions={statusOptions}
          statusValue={filters.status}
          onStatusChange={(status) => updateFilters({ status })}
          facultyOptions={facultyOptions}
          facultyValue={filters.faculty}
          onFacultyChange={(faculty) => updateFilters({ faculty })}
          posterOptions={posterOptions}
          posterValue={filters.poster}
          onPosterChange={(poster) => updateFilters({ poster })}
          showPeopleType={isPeopleSource}
          peopleTypeOptions={peopleTypeOptions}
          peopleTypeValue={filters.peopleType}
          onPeopleTypeChange={(peopleType) => updateFilters({ peopleType })}
          categoryOptions={categoryOptions}
          categoryValue={filters.category}
          onCategoryChange={(category) => updateFilters({ category })}
          activityOptions={activityOptions}
          activityValue={filters.activityExtremum}
          onActivityChange={(activityExtremum) => updateFilters({ activityExtremum })}
          searchQuery={searchDraft}
          onSearchChange={setSearchDraft}
        />

        {selectedSource ? (
          <section id="report-results" className="relative z-10 border-t border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
                  <SelectedIcon size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-950">{selectedSource.label}</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">{selectedSource.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      `${filteredRows.length} of ${allRows.length} rows`,
                      `${formatFilterDate(filters.from)} → ${formatFilterDate(filters.to)}`,
                      filters.status === 'all' ? 'All statuses' : formatStatusLabel(filters.status),
                      filters.faculty === 'all' ? 'All faculties' : filters.faculty,
                      filters.poster === 'all'
                        ? 'All users'
                        : posterOptions.find((o) => o.value === filters.poster)?.label || 'One person',
                      filters.category === 'all' ? 'All categories' : filters.category,
                      filters.sourceId === 'people' && filters.peopleType !== 'all'
                        ? peopleTypeOptions.find((o) => o.value === filters.peopleType)?.label || 'One type'
                        : null,
                      filters.activityExtremum === 'max'
                        ? 'Maximum activity'
                        : filters.activityExtremum === 'min'
                          ? 'Minimum activity'
                          : null,
                      filters.search ? `"${filters.search}"` : null,
                    ]
                      .filter(Boolean)
                      .map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                        >
                          {chip}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Reset
                </button>
                <ReportExportMenu
                  disabled={filteredRows.length === 0}
                  filename={`ju-lofo-${selectedSource.id}${
                    isPeopleSource && filters.peopleType !== 'all' ? `-${filters.peopleType}` : ''
                  }-report-${new Date().toISOString().slice(0, 10)}`}
                  title={
                    isPeopleSource && filters.peopleType !== 'all'
                      ? `People ranking — ${
                          peopleTypeOptions.find((o) => o.value === filters.peopleType)?.label || 'Type'
                        }`
                      : selectedSource.label
                  }
                  subtitle={selectedSource.description}
                  generatedAt={generatedAt}
                  metaLines={exportMetaLines}
                  columns={columns}
                  rows={filteredRows}
                  formatStatusLabel={formatStatusLabel}
                  buttonLabel="Export report"
                />
              </div>
            </div>

            <ReportTable columns={columns} rows={filteredRows} onResetFilters={() => setConfirmReset(true)} />

            <p className="mt-3 text-right text-xs font-semibold text-slate-400">
              Updated {formatGeneratedAt(generatedAt)}
            </p>
          </section>
        ) : null}

        {showItemInsightPanels ? (
          <section
            id="report-insights"
            className="relative z-10 space-y-4 border-t border-slate-100 bg-gradient-to-b from-[#F8FAFC] to-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1A56DB]">
                  Report insights
                </p>
                <h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
                  Trends, contributors & categories
                </h3>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  Same filters as the table — everything stays in this report workspace.
                </p>
              </div>
              <p className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                {filteredRows.length.toLocaleString()} filtered row
                {filteredRows.length === 1 ? '' : 's'}
              </p>
            </div>

            <ClaimsTrackingChart
              rows={chartRows}
              sourceId={
                filters.sourceId === 'lost' || filters.sourceId === 'found'
                  ? 'inventory'
                  : filters.sourceId
              }
              sourceLabel={selectedSource?.label}
              embedded
            />

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <TopContributorsPanel
                contributors={displayContributors}
                activityRows={filteredRows}
                title={
                  contributorsAreFiltered ? 'Filtered Top Contributors' : 'Top Contributors'
                }
                subtitle="Most item reports by person across campus inventory"
                totalPosts={contributorTotalPosts || summary.totalItems}
                filtered={contributorsAreFiltered}
                embedded
              />

              <CategoriesBreakdownPanel
                categories={filteredCategories}
                title={
                  filters.sourceId === 'inventory' ||
                  filters.sourceId === 'lost' ||
                  filters.sourceId === 'found' ||
                  filters.sourceId === 'claims'
                    ? 'Filtered Categories'
                    : 'Inventory by Category'
                }
                subtitle={
                  categoriesAreFiltered
                    ? 'Based on current report filters'
                    : 'Breakdown of items across campus categories'
                }
                totalItems={categoryTotalItems || filteredRows.length || summary.totalItems}
                onViewAll={() => jumpToSource('inventory')}
                embedded
              />
            </div>
          </section>
        ) : null}
      </div>

      {confirmReset ? (
        <ResetConfirmModal
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetFilters();
            setConfirmReset(false);
          }}
        />
      ) : null}
    </div>
  );
}
