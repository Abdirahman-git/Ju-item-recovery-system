'use client';

import { Filter, Play, Search } from 'lucide-react';
import ReportSelect from '@/components/admin/ReportSelect';
import ReportDatePicker from '@/components/admin/ReportDatePicker';

const QUICK_RANGES = [
  { id: 'all_time', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_7', label: 'Last 7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_30', label: 'Last 30 days' },
];

function FilterField({ label, children, dropdown = false }) {
  return (
    <div className={`min-w-0 flex-1 ${dropdown ? 'relative z-50' : ''}`}>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

export default function ReportFiltersPanel({
  quickRange,
  onQuickRange,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  sourceOptions,
  sourceValue,
  onSourceChange,
  statusOptions,
  statusValue,
  onStatusChange,
  facultyOptions = [],
  facultyValue = 'all',
  onFacultyChange,
  searchQuery,
  onSearchChange,
  onRunReport,
  onSearchKeyDown,
  running = false,
}) {
  return (
    <section className="report-filters-panel relative z-40 overflow-visible">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A56DB]/10 text-[#1A56DB]">
            <Filter size={18} strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Filters</h3>
            <p className="text-[11px] font-medium text-slate-500">Date, faculty, source & status work together · Run report refreshes data</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((range) => {
            const active = quickRange === range.id;
            return (
              <button
                key={range.id}
                type="button"
                onClick={() => onQuickRange(range.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? 'border-[#1A56DB] bg-[#1A56DB] text-white shadow-sm shadow-blue-500/25'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-50 grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] xl:items-end">
        <FilterField label="From" dropdown>
          <ReportDatePicker
            value={dateFrom}
            onChange={onDateFrom}
            max={dateTo || undefined}
            placeholder="Select date"
            openDirection="down"
          />
        </FilterField>

        <FilterField label="To" dropdown>
          <ReportDatePicker
            value={dateTo}
            onChange={onDateTo}
            min={dateFrom || undefined}
            placeholder="Select date"
            openDirection="down"
          />
        </FilterField>

        <FilterField label="Data source" dropdown>
          <ReportSelect
            value={sourceValue}
            onChange={onSourceChange}
            options={sourceOptions}
            placeholder="Select data source"
            theme="blue"
            variant="filter"
            searchable
          />
        </FilterField>

        <FilterField label="Faculty" dropdown>
          <ReportSelect
            value={facultyValue}
            onChange={onFacultyChange}
            options={facultyOptions}
            placeholder="All faculties"
            theme="blue"
            variant="filter"
            searchable
          />
        </FilterField>

        <FilterField label="Status" dropdown>
          <ReportSelect
            value={statusValue}
            onChange={onStatusChange}
            options={statusOptions}
            placeholder="All statuses"
            theme="blue"
            variant="filter"
            searchable={false}
          />
        </FilterField>

        <div className="flex shrink-0 items-end lg:pb-0">
          <button
            type="button"
            onClick={onRunReport}
            disabled={running}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1A56DB] px-5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-[#1648c7] disabled:opacity-60 lg:w-auto lg:min-w-[140px]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <Play size={12} fill="currentColor" />
            </span>
            {running ? 'Running...' : 'Run report'}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <FilterField label="Search results">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Filter rows in the report..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/12"
            />
          </div>
        </FilterField>
      </div>
    </section>
  );
}

export { QUICK_RANGES };
