'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Crown, Search, TrendingUp, UserRound, Users } from 'lucide-react';

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

function formatContributorMeta(row) {
  const parts = [];
  if (row.lost > 0) parts.push(`${row.lost} lost`);
  if (row.found > 0) parts.push(`${row.found} found`);
  return parts.length ? parts.join(' · ') : `${row.count} post${row.count === 1 ? '' : 's'}`;
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

function PodiumCard({ row, style, rank }) {
  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-2 py-3 text-center opacity-40">
        <span className={`mb-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${style.badge}`}>{style.label}</span>
        <p className="text-xs font-semibold text-slate-400">—</p>
        <p className="mt-2 text-lg font-black text-slate-300">0</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-1 flex-col items-center rounded-xl border border-slate-200/80 px-2 py-3 text-center ring-1 ${style.ring} ${style.bg}`}
      title={`${formatIdentityLine(row)} · ${formatContributorMeta(row)}`}
    >
      <span className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${style.badge}`}>
        {rank === 1 ? <Crown size={10} /> : null}
        {style.label}
      </span>
      <p className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-snug text-slate-800" title={row.name}>
        {row.name}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug text-slate-500" title={formatIdentityLine(row)}>
        {formatIdentityLine(row)}
      </p>
      <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{row.count}</p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-400">{formatContributorMeta(row)}</p>
    </div>
  );
}

function CompactRow({ row, rank, maxCount }) {
  const width = maxCount > 0 ? Math.max(Math.round((row.count / maxCount) * 100), 8) : 0;

  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50">
      <span className="pt-0.5 text-[11px] font-black tabular-nums text-slate-400">#{rank}</span>
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
    </div>
  );
}

export default function TopContributorsPanel({
  contributors = [],
  title = 'Top Contributors',
  subtitle = 'Most item reports by person',
  totalPosts = 0,
  filtered = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('all');

  const topContributor = contributors[0] || null;
  const contributorCount = contributors.length;
  const sumShown = contributors.reduce((sum, row) => sum + row.count, 0);
  const maxCount = useMemo(() => Math.max(...contributors.map((row) => row.count), 1), [contributors]);
  const avgPosts = contributorCount > 0 ? (sumShown / contributorCount).toFixed(1) : '0';
  const activityInsight = useMemo(() => buildActivityInsight(contributors), [contributors]);

  const podium = contributors.slice(0, 3);
  const rest = contributors.slice(3);
  const previewRest = rest.slice(0, PREVIEW_AFTER_PODIUM);
  const hiddenRest = rest.slice(PREVIEW_AFTER_PODIUM);
  const hiddenPeople = hiddenRest.length;
  const hiddenPosts = hiddenRest.reduce((sum, row) => sum + row.count, 0);

  const baseListRows = expanded ? rest : previewRest;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const facultyOptions = useMemo(() => buildFacultyOptions(rest), [rest]);
  const listRows = useMemo(
    () => baseListRows.filter((row) => matchesContributorFilters(row, normalizedSearch, facultyFilter)),
    [baseListRows, normalizedSearch, facultyFilter]
  );

  const showExpand = hiddenPeople > 0;
  const hasActiveListFilters = Boolean(normalizedSearch) || facultyFilter !== 'all';

  return (
    <section className="w-full self-start overflow-visible rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="m-0 text-lg font-bold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {filtered ? 'Based on current report filters' : subtitle}
          </p>
        </div>
        {topContributor ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
            <Crown size={11} />
            Max · {topContributor.count}
          </span>
        ) : null}
      </div>

      {contributors.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {contributorCount} people
          </span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#1A56DB]">
            {(totalPosts || sumShown).toLocaleString()} posts
          </span>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
            avg {avgPosts} / person
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {contributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-12 text-center">
            <UserRound size={28} className="mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No contributor data</p>
            <p className="mt-1 text-xs text-slate-400">Switch to an item data source or widen your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {PODIUM_STYLES.map((style, index) => (
                <PodiumCard key={style.label} row={podium[index]} style={style} rank={index + 1} />
              ))}
            </div>

            {activityInsight ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-500">
                <span className="font-bold text-slate-700">Activity spread:</span> {activityInsight}
              </p>
            ) : null}

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

                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10.5rem]">
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
                      <select
                        value={facultyFilter}
                        onChange={(event) => setFacultyFilter(event.target.value)}
                        aria-label="Filter by faculty"
                        className="h-9 w-full truncate rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#1A56DB]/40 focus:ring-2 focus:ring-[#1A56DB]/15"
                      >
                        {facultyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
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
                          const rank = contributors.findIndex((entry) => entry.key === row.key) + 1;
                          return (
                            <CompactRow key={row.key || row.name} row={row} rank={rank || 0} maxCount={maxCount} />
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
                      setFacultyFilter('all');
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
                {(totalPosts || sumShown).toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Posts</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2.5">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <Users size={14} />
              </div>
              <p className="text-base font-black leading-none tabular-nums text-slate-900">{contributorCount}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">People</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2.5">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Crown size={14} />
              </div>
              <p className="truncate px-1 text-xs font-black leading-tight text-slate-900" title={topContributor?.name}>
                {topContributor?.name || '—'}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Top · {topContributor?.count ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
