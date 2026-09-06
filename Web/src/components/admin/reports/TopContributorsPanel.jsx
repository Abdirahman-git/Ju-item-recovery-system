'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Crown, Search, TrendingUp, UserRound, Users, X } from 'lucide-react';
import ReportSelect from '@/components/admin/ReportSelect';
import { isValidJuStudentId } from '@/lib/faculty';
import ItemThumbnail from '@/components/admin/ItemThumbnail';
import ItemNamePlaceholder from '@/components/admin/ItemNamePlaceholder';

function ContributorItemPhoto({ row }) {
  if (row?.isSecure) {
    return (
      <div
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl"
        title="Secure hold — photo hidden"
      >
        <ItemNamePlaceholder
          name={row?.name || row?.item}
          category={row?.category}
          secure
          size={22}
        />
      </div>
    );
  }
  const itemType = String(row?.type || row?.reportType || '').toLowerCase() === 'found' ? 'found' : 'lost';
  return (
    <ItemThumbnail
      src={row?.imageUrl}
      alt={row?.name || row?.item || 'Item photo'}
      itemType={itemType}
      itemName={row?.name || row?.item}
      category={row?.category}
    />
  );
}

const PODIUM_STYLES = [
  {
    ring: 'ring-amber-300/70',
    bg: 'bg-gradient-to-b from-amber-50 to-white',
    badge: 'bg-amber-100 text-amber-800',
    label: '1st',
  },
  {
    ring: 'ring-slate-300/70',
    bg: 'bg-gradient-to-b from-slate-50 to-white',
    badge: 'bg-slate-100 text-slate-700',
    label: '2nd',
  },
  {
    ring: 'ring-orange-200/80',
    bg: 'bg-gradient-to-b from-orange-50/80 to-white',
    badge: 'bg-orange-100 text-orange-800',
    label: '3rd',
  },
];

const PREVIEW_AFTER_PODIUM = 5;
const LIST_MAX_HEIGHT = 'max-h-44';

function ordinalLabel(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `#${rank}`;
}

function withDenseRanks(contributors = []) {
  let rank = 0;
  let prevCount = null;
  return contributors.map((row) => {
    const count = Number(row.count) || 0;
    if (count !== prevCount) {
      rank += 1;
      prevCount = count;
    }
    const tied = contributors.filter((entry) => Number(entry.count) === count).length > 1;
    return { ...row, rank, tied };
  });
}

function podiumStyleForRank(rank) {
  return PODIUM_STYLES[Math.min(Math.max(rank, 1), 3) - 1] || PODIUM_STYLES[2];
}

function formatContributorMeta(row) {
  const total = Number(row.count) || 0;
  return `${total} report${total === 1 ? '' : 's'}`;
}

function formatIdentityLine(row) {
  const faculty = String(row.faculty || 'Unassigned').trim() || 'Unassigned';
  const studentId = String(row.studentId || '—').trim() || '—';
  return `${faculty} · ID ${studentId}`;
}

function matchesContributorFilters(row, query, faculty) {
  if (faculty !== 'all') {
    const rowFaculty = String(row.faculty || 'Unassigned').trim() || 'Unassigned';
    if (rowFaculty !== faculty) return false;
  }
  if (!query) return true;
  const haystack = [row.name, row.faculty, row.studentId, row.email, formatContributorMeta(row)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function buildFacultyOptions(contributors = []) {
  const values = new Set();
  contributors.forEach((row) => {
    const faculty = String(row.faculty || 'Unassigned').trim() || 'Unassigned';
    values.add(faculty);
  });
  return [
    { value: 'all', label: 'All faculties' },
    ...Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  ];
}

function buildCategoryOptions(rows = []) {
  const values = new Set();
  rows.forEach((row) => {
    const category = String(row.category || '').trim();
    if (category) values.add(category);
  });
  return [
    { value: 'all', label: 'All categories' },
    ...Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  ];
}

function rowMatchesLocalFilters(row, faculty, category) {
  if (faculty !== 'all') {
    const rowFaculty = String(row.faculty || 'Unassigned').trim() || 'Unassigned';
    if (rowFaculty !== faculty) return false;
  }
  if (category !== 'all') {
    const rowCategory = String(row.category || 'Other').trim() || 'Other';
    if (rowCategory !== category) return false;
  }
  return true;
}

function contributorMatchesActivityRow(contributor, row) {
  const key = contributor.key || '';
  const name = String(contributor.name || '').trim().toLowerCase();
  const sid = String(contributor.studentId || '').trim().toLowerCase();
  const email = String(contributor.email || '').trim().toLowerCase();

  const rowKey = String(row.posterKey || row.reporter || '').trim();
  if (key && rowKey && String(rowKey) === String(key)) return true;

  const rowSid = String(row.studentId || '').trim().toLowerCase();
  if (sid && sid !== '—' && rowSid && rowSid === sid) return true;

  const rowEmail = String(row.posterEmail || row.email || '').trim().toLowerCase();
  if (email && rowEmail && rowEmail === email) return true;

  const rowName = String(row.reporter || row.claimer || row.recipient || '')
    .trim()
    .toLowerCase();
  if (name && rowName && rowName === name) return true;

  return false;
}

function scopeContributorsByActivity(contributors = [], activityRows = []) {
  if (!activityRows.length) return [];
  return contributors
    .map((contributor) => {
      const count = activityRows.filter((row) => contributorMatchesActivityRow(contributor, row)).length;
      return count > 0 ? { ...contributor, count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count);
}

function contributorKey(row, index = 0) {
  return String(row?.key || `${row?.email || ''}|${row?.studentId || ''}|${row?.name || index}`);
}

function buildUserSelectOptions(contributors = []) {
  const people = contributors.filter((row) => isValidJuStudentId(row.studentId));
  return [
    { value: 'all', label: 'All registered users' },
    ...people.map((row, index) => {
      const id = String(row.studentId || '').trim().toUpperCase();
      const count = Number(row.count) || 0;
      const rank = row.rank || contributors.findIndex((c) => c === row) + 1;
      const rankLabel = row.tied ? `T-${rank}` : `#${rank}`;
      return {
        value: contributorKey(row, index),
        label: `${rankLabel} · ${row.name} (${id}) · ${count}`,
      };
    }),
  ];
}

function itemDateTimeLabel(item = {}) {
  const raw =
    item.reportedAt ||
    item.returnedAt ||
    item.requestedAt ||
    item.archivedAt ||
    item.joined ||
    item.date ||
    item.dateKey ||
    '';
  const text = String(raw || '').trim();
  if (!text || text === '?' || text === '—') return '—';
  return text;
}

function buildActivityInsight(contributors = []) {
  if (!contributors.length) return null;

  let single = 0;
  let pair = 0;
  let power = 0;

  contributors.forEach((row) => {
    if (row.count <= 1) single += 1;
    else if (row.count === 2) pair += 1;
    else power += 1;
  });

  const parts = [];
  if (single) parts.push(`${single} × 1 post`);
  if (pair) parts.push(`${pair} × 2 posts`);
  if (power) parts.push(`${power} × 3+ posts`);

  return parts.join(' · ');
}

function PodiumCard({ row, style, rank, tied, onSelect }) {
  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-2 py-3 text-center opacity-40">
        <span className={`mb-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${style.badge}`}>{style.label}</span>
        <p className="text-xs font-semibold text-slate-400">—</p>
        <p className="mt-2 text-lg font-black text-slate-300">0</p>
      </div>
    );
  }

  const badgeLabel = tied ? `Tied ${ordinalLabel(rank)}` : ordinalLabel(rank);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(row)}
      className={`flex flex-1 flex-col items-center rounded-xl border border-slate-200/80 px-2 py-3 text-center ring-1 transition hover:-translate-y-0.5 hover:border-[#1A56DB]/40 hover:shadow-md ${style.ring} ${style.bg}`}
      title={`View items · ${formatIdentityLine(row)} · ${formatContributorMeta(row)}`}
    >
      <span className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${style.badge}`}>
        {rank === 1 ? <Crown size={10} /> : null}
        {badgeLabel}
      </span>
      <p className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-snug text-slate-800" title={row.name}>
        {row.name}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug text-slate-500" title={formatIdentityLine(row)}>
        {formatIdentityLine(row)}
      </p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{row.count}</p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-400">{formatContributorMeta(row)}</p>
      <p className="mt-1.5 text-[10px] font-bold text-[#1A56DB]">View items</p>
    </button>
  );
}

function CompactRow({ row, rank, tied, maxCount, onSelect }) {
  const width = maxCount > 0 ? Math.max(Math.round((row.count / maxCount) * 100), 8) : 0;
  const rankLabel = tied ? `T-${rank}` : `#${rank}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(row)}
      className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
      title="View items"
    >
      <span className="pt-0.5 text-[11px] font-black tabular-nums text-slate-400">{rankLabel}</span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block truncate text-xs font-semibold text-slate-800" title={row.name}>
              {row.name}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500" title={formatIdentityLine(row)}>
              {formatIdentityLine(row)}
            </span>
          </div>
          <span className="shrink-0 pt-0.5 text-[10px] font-medium text-slate-400">{formatContributorMeta(row)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full max-w-full rounded-full bg-[#1A56DB]/70" style={{ width: `${width}%` }} />
        </div>
      </div>
      <span className="pt-0.5 text-right text-xs font-black tabular-nums text-slate-800">{row.count}</span>
    </button>
  );
}

function ActivityItemRow({ item, posterName }) {
  const title = item.name || item.item || 'Unnamed item';
  const dateLabel = itemDateTimeLabel(item);
  const type = String(item.type || '').toLowerCase();
  const isFound = type === 'found';

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm shadow-slate-900/5">
      <ContributorItemPhoto row={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-900" title={title}>
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
              isFound ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {isFound ? 'Found' : 'Lost'}
          </span>
          {item.category ? (
            <span className="truncate text-[10px] font-semibold text-slate-500">{item.category}</span>
          ) : null}
          {posterName ? (
            <span className="truncate text-[10px] font-semibold text-slate-400">· {posterName}</span>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] font-bold text-slate-600">
          <span className="font-semibold text-slate-400">Date · </span>
          {dateLabel}
        </p>
      </div>
    </li>
  );
}

function SelectedUserFocus({ row, rank, tied, onClear, items = [] }) {
  return (
    <div className="rounded-xl border border-[#1A56DB]/25 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm shadow-blue-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1A56DB]">Selected user</p>
          <h5 className="mt-1 truncate text-base font-black text-slate-900" title={row.name}>
            {row.name}
          </h5>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{formatIdentityLine(row)}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <X size={12} />
          Clear
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/90 px-3 py-3 text-center ring-1 ring-slate-100">
          <p className="text-2xl font-black tabular-nums text-slate-900">{items.length || row.count}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Reports</p>
        </div>
        <div className="rounded-xl bg-white/90 px-3 py-3 text-center ring-1 ring-slate-100">
          <p className="text-2xl font-black tabular-nums text-slate-900">
            {tied ? `T-${rank}` : `#${rank || '—'}`}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {tied ? 'Tied rank' : 'Rank'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Their items ({items.length})
          </p>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center text-xs font-medium text-slate-500">
            No item rows linked for this person in the current filters.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
            {items.map((item) => (
              <ActivityItemRow
                key={item.id || `${item.name || item.item}-${itemDateTimeLabel(item)}`}
                item={item}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function TopContributorsPanel({
  contributors = [],
  activityRows = [],
  title = 'Top Contributors',
  subtitle = 'Most item reports by person',
  totalPosts = 0,
  filtered = false,
  embedded = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserKey, setSelectedUserKey] = useState('all');

  const rankedContributors = useMemo(
    () => withDenseRanks(contributors),
    [contributors]
  );

  const topContributor = rankedContributors[0] || null;
  const contributorCount = rankedContributors.length;
  const sumShown = rankedContributors.reduce((sum, row) => sum + row.count, 0);
  const maxCount = useMemo(
    () => Math.max(...rankedContributors.map((row) => row.count), 1),
    [rankedContributors]
  );
  const avgPosts = contributorCount > 0 ? (sumShown / contributorCount).toFixed(1) : '0';
  const activityInsight = useMemo(() => buildActivityInsight(rankedContributors), [rankedContributors]);

  const userOptions = useMemo(() => buildUserSelectOptions(rankedContributors), [rankedContributors]);
  const selectedUser = useMemo(() => {
    if (selectedUserKey === 'all') return null;
    return rankedContributors.find((row, index) => contributorKey(row, index) === selectedUserKey) || null;
  }, [rankedContributors, selectedUserKey]);

  useEffect(() => {
    if (selectedUserKey !== 'all' && !selectedUser) {
      setSelectedUserKey('all');
    }
  }, [selectedUserKey, selectedUser]);

  const selectedRank = useMemo(() => {
    if (!selectedUser) return 0;
    return selectedUser.rank || 0;
  }, [selectedUser]);

  const selectedItems = useMemo(() => {
    if (!selectedUser) return [];
    return (activityRows || []).filter((row) => contributorMatchesActivityRow(selectedUser, row));
  }, [activityRows, selectedUser]);

  const podium = rankedContributors.slice(0, 3);
  const rest = rankedContributors.slice(3);
  const previewRest = rest.slice(0, PREVIEW_AFTER_PODIUM);
  const hiddenRest = rest.slice(PREVIEW_AFTER_PODIUM);
  const hiddenPeople = hiddenRest.length;
  const hiddenPosts = hiddenRest.reduce((sum, row) => sum + row.count, 0);

  const baseListRows = expanded ? rest : previewRest;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const listRows = useMemo(
    () => baseListRows.filter((row) => matchesContributorFilters(row, normalizedSearch, 'all')),
    [baseListRows, normalizedSearch]
  );

  const showExpand = hiddenPeople > 0;
  const hasActiveListFilters = Boolean(normalizedSearch);
  const focusMode = Boolean(selectedUser);
  const panelFiltered = filtered;

  function selectContributor(row) {
    if (!row) return;
    const index = rankedContributors.findIndex(
      (entry) => entry === row || (entry.key && row.key && entry.key === row.key)
    );
    setSelectedUserKey(contributorKey(row, index >= 0 ? index : 0));
  }

  function posterNameForItem(item) {
    const match = rankedContributors.find((contributor) =>
      contributorMatchesActivityRow(contributor, item)
    );
    return match?.name || item.reporter || item.claimer || item.recipient || '';
  }

  return (
    <section
      className={`w-full self-start overflow-visible rounded-2xl border p-5 ${
        embedded
          ? 'border-slate-200/70 bg-white/90 shadow-sm'
          : 'border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04)]'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="m-0 text-lg font-bold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {panelFiltered ? 'Based on current report filters' : subtitle}
          </p>
        </div>
      </div>

      {contributors.length > 0 ? (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {contributorCount} users
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#1A56DB]">
              {(panelFiltered ? sumShown : totalPosts || sumShown).toLocaleString()} posts
            </span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
              avg {avgPosts} / user
            </span>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">
              Focus user
            </label>
            <ReportSelect
              value={selectedUserKey}
              onChange={setSelectedUserKey}
              options={userOptions}
              placeholder="All registered users"
              theme="blue"
              searchable
              className="w-full"
            />
            <p className="mt-1.5 text-[10px] font-medium text-slate-400">
              Use main Filters: Data source + Activity (Maximum / Minimum), then Export report.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {rankedContributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-12 text-center">
            <UserRound size={28} className="mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No contributor data</p>
            <p className="mt-1 text-xs text-slate-400">
              {contributors.length > 0
                ? 'Try the main Filters above (faculty, category, or type).'
                : 'Switch to an item data source or widen your filters.'}
            </p>
          </div>
        ) : focusMode ? (
          <SelectedUserFocus
            row={selectedUser}
            rank={selectedRank}
            tied={Boolean(selectedUser?.tied)}
            items={selectedItems}
            onClear={() => setSelectedUserKey('all')}
          />
        ) : (
          <>
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => {
                const row = podium[index];
                if (!row) {
                  return (
                    <PodiumCard
                      key={`empty-${index}`}
                      row={null}
                      style={PODIUM_STYLES[index]}
                      rank={index + 1}
                    />
                  );
                }
                const style = {
                  ...podiumStyleForRank(row.rank),
                  label: row.tied ? `Tied ${ordinalLabel(row.rank)}` : ordinalLabel(row.rank),
                };
                return (
                  <PodiumCard
                    key={row.key || row.name || index}
                    row={row}
                    style={style}
                    rank={row.rank}
                    tied={row.tied}
                    onSelect={selectContributor}
                  />
                );
              })}
            </div>

            <p className="text-[11px] font-medium text-slate-400">
              Click a person to focus — or browse every posted item below.
            </p>

            {activityInsight ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-500">
                <span className="font-bold text-slate-700">Activity spread:</span> {activityInsight}
              </p>
            ) : null}

            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                Posted items ({activityRows.length})
              </p>
              {activityRows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center text-xs font-medium text-slate-500">
                  No items match the main Filters above.
                </p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
                  {activityRows.map((item) => (
                    <ActivityItemRow
                      key={item.id || `${item.name || item.item}-${itemDateTimeLabel(item)}`}
                      item={item}
                      posterName={posterNameForItem(item)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {rest.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="overflow-visible rounded-xl border border-slate-100 bg-slate-50/40">
                  <div className="border-b border-slate-100 bg-slate-50/95 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        {expanded ? `All contributors (#4–#${contributorCount})` : 'Also active'}
                      </span>
                      {listRows.length > 3 ? (
                        <span className="text-[10px] font-semibold text-slate-400">Scroll list</span>
                      ) : null}
                    </div>

                    <div className="mt-2">
                      <label className="relative block min-w-0">
                        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search name or ID…"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1A56DB]/40 focus:ring-2 focus:ring-[#1A56DB]/15"
                        />
                      </label>
                    </div>
                  </div>

                  <div className={`${LIST_MAX_HEIGHT} overflow-y-auto overscroll-contain`}>
                    {listRows.length === 0 ? (
                      <p className="px-3 py-5 text-center text-xs font-medium text-slate-500">
                        {hasActiveListFilters
                          ? 'No contributors match these filters.'
                          : 'No contributors in this section.'}
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100/80 p-1">
                        {listRows.map((row) => {
                          return (
                            <CompactRow
                              key={row.key || row.name}
                              row={row}
                              rank={row.rank || 0}
                              tied={Boolean(row.tied)}
                              maxCount={maxCount}
                              onSelect={selectContributor}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {showExpand ? (
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded((value) => !value);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition hover:border-[#1A56DB]/30 hover:bg-blue-50/40 hover:text-[#1A56DB]"
                  >
                    <ChevronDown size={14} className={`transition ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Show less' : `Show ${hiddenPeople} more (${hiddenPosts} posts)`}
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <div className="border-t border-slate-100 pt-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-2 py-2.5">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB]">
                <TrendingUp size={14} />
              </div>
              <p className="text-base font-black leading-none tabular-nums text-slate-900">
                {focusMode ? selectedUser.count : sumShown.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {focusMode ? 'Their posts' : 'Posts'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2.5">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <Users size={14} />
              </div>
              <p className="text-base font-black leading-none tabular-nums text-slate-900">
                {focusMode
                  ? selectedUser?.tied
                    ? `T-${selectedRank}`
                    : selectedRank || '—'
                  : contributorCount}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {focusMode ? (selectedUser?.tied ? 'Tied' : 'Rank') : 'Users'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2.5">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Crown size={14} />
              </div>
              <p
                className="truncate px-1 text-xs font-black leading-tight text-slate-900"
                title={focusMode ? selectedUser?.name : topContributor?.name}
              >
                {focusMode ? selectedUser?.name || '—' : topContributor?.name || '—'}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {focusMode ? 'Selected' : 'Top'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
