'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { validateCategoryName } from '@/lib/categories';

const THEMES = {
  blue: {
    input: 'report-form-input-blue',
    optionSelected: 'bg-blue-50 text-[#1A56DB]',
    optionHighlight: 'bg-[#1A56DB] text-white shadow-sm shadow-blue-500/20',
    optionIdle: 'text-slate-700 hover:bg-[#1A56DB] hover:text-white',
    iconIdle: 'bg-blue-50 text-[#1A56DB]',
    iconActive: 'bg-white/20 text-white',
    check: 'text-white',
    checkSelected: 'text-[#1A56DB]',
    searchBorder: 'border-blue-200 focus:border-[#1A56DB]',
  },
  emerald: {
    input: 'report-form-input-emerald',
    optionSelected: 'bg-emerald-50 text-emerald-700',
    optionHighlight: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20',
    optionIdle: 'text-slate-700 hover:bg-emerald-600 hover:text-white',
    iconIdle: 'bg-emerald-50 text-emerald-700',
    iconActive: 'bg-white/20 text-white',
    check: 'text-white',
    checkSelected: 'text-emerald-600',
    searchBorder: 'border-emerald-200 focus:border-emerald-500',
  },
  amber: {
    input: 'report-form-input-amber',
    optionSelected: 'bg-amber-50 text-amber-800',
    optionHighlight: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20',
    optionIdle: 'text-slate-700 hover:bg-amber-500 hover:text-white',
    iconIdle: 'bg-amber-50 text-amber-700',
    iconActive: 'bg-white/20 text-white',
    check: 'text-white',
    checkSelected: 'text-amber-600',
    searchBorder: 'border-amber-200 focus:border-amber-500',
  },
};

function normalizeOptions(options) {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );
}

export default function ReportSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  theme = 'blue',
  searchable = true,
  allowCustom = false,
  customLabel = 'Add category',
  onPersistCustom,
  disabled = false,
  className = '',
  variant = 'default',
  open: openProp,
  onOpenChange,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

  function setOpen(next) {
    const resolved = typeof next === 'function' ? next(open) : next;
    if (!isControlled) setUncontrolledOpen(resolved);
    onOpenChange?.(resolved);
  }

  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [persistingCustom, setPersistingCustom] = useState(false);
  const [persistError, setPersistError] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const tone = THEMES[theme] || THEMES.blue;

  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const selected = normalized.find((option) => option.value === value) ||
    (value
      ? { value, label: value }
      : null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalized;
    return normalized.filter((option) => option.label.toLowerCase().includes(term));
  }, [normalized, query]);

  const customCandidate = query.trim();
  const customValidation = allowCustom && customCandidate ? validateCategoryName(customCandidate) : null;
  const canAddCustom =
    allowCustom &&
    Boolean(customCandidate) &&
    customValidation?.valid &&
    !normalized.some(
      (option) => option.label.toLowerCase() === customCandidate.toLowerCase()
    );
  const showInvalidCustom =
    allowCustom &&
    Boolean(customCandidate) &&
    !customValidation?.valid &&
    !normalized.some(
      (option) => option.label.toLowerCase() === customCandidate.toLowerCase()
    );

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlightIndex(0);
      setPersistError('');
      return;
    }
    const selectedIndex = filtered.findIndex((option) => option.value === value);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, value, filtered]);

  function selectOption(option) {
    onChange(option.value);
    setOpen(false);
  }

  async function commitCustomCategory() {
    if (!canAddCustom || !customValidation?.valid || persistingCustom) return;
    try {
      setPersistingCustom(true);
      setPersistError('');
      const saved = onPersistCustom
        ? await onPersistCustom(customValidation.value)
        : customValidation.value;
      onChange(saved);
      setOpen(false);
    } catch (error) {
      setPersistError(error?.message || 'Could not save category.');
    } finally {
      setPersistingCustom(false);
    }
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleListKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((current) => Math.min(current + 1, filtered.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (filtered[highlightIndex]) {
        selectOption(filtered[highlightIndex]);
        return;
      }
      commitCustomCategory();
    }
  }

  function optionRowClass(isSelected, isHighlighted) {
    if (isHighlighted) return tone.optionHighlight;
    if (isSelected) return tone.optionSelected;
    return tone.optionIdle;
  }

  function optionIconClass(isSelected, isHighlighted) {
    if (isHighlighted) return tone.iconActive;
    if (isSelected) return tone.iconIdle;
    return `${tone.iconIdle} group-hover/option:bg-white/20 group-hover/option:text-white`;
  }

  const SelectedIcon = selected?.icon;
  const isFilter = variant === 'filter';

  const triggerClass = isFilter
    ? 'group flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/12 disabled:cursor-not-allowed disabled:opacity-60'
    : [
        'report-form-input',
        tone.input,
        'group flex h-12 w-full items-center justify-between gap-3 rounded-[18px] px-4 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60',
      ].join(' ');

  const iconWrapClass = isFilter
    ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[#1A56DB]'
    : `flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.iconIdle}`;

  const chevronWrapClass = isFilter
    ? 'flex h-7 w-7 shrink-0 items-center justify-center text-slate-400'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition group-hover:scale-105';

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-[90]' : ''} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClass}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {SelectedIcon ? (
            <span className={iconWrapClass}>
              <SelectedIcon size={isFilter ? 14 : 16} />
            </span>
          ) : null}
          <span className={`truncate ${selected ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}`}>
            {selected?.label || placeholder}
          </span>
        </span>
        <span className={chevronWrapClass}>
          <ChevronDown size={isFilter ? 15 : 16} className={`transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open ? (
        <div
          className={`report-select-panel absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[140] overflow-hidden rounded-[20px] border border-slate-200 bg-white ${
            theme === 'emerald' ? 'report-select-panel-emerald' : theme === 'amber' ? 'report-select-panel-amber' : 'report-select-panel-blue'
          }`}
          onKeyDown={handleListKeyDown}
          role="listbox"
        >
          {searchable ? (
            <div className="border-b border-slate-100 p-2.5">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlightIndex(0);
                  }}
                  placeholder={allowCustom ? 'Search or type new...' : 'Search...'}
                  className={`h-10 w-full rounded-xl border bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:bg-white ${tone.searchBorder}`}
                />
              </div>
            </div>
          ) : null}

          <ul className="max-h-72 overflow-y-auto p-1.5">
            {filtered.length === 0 && !canAddCustom && !showInvalidCustom ? (
              <li className="px-3 py-6 text-center text-sm font-medium text-slate-400">
                {allowCustom ? 'Type a name to add a new category' : 'No matches found'}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightIndex;
                const OptionIcon = option.icon;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectOption(option)}
                      className={`group/option flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${optionRowClass(isSelected, isHighlighted)}`}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        {OptionIcon ? (
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${optionIconClass(isSelected, isHighlighted)}`}
                          >
                            <OptionIcon size={16} />
                          </span>
                        ) : null}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {isSelected ? (
                        <Check
                          size={16}
                          className={`shrink-0 ${isHighlighted ? tone.check : tone.checkSelected}`}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
            {showInvalidCustom ? (
              <li className="px-3 py-3 text-center text-xs font-semibold text-red-600">
                {customValidation?.message ||
                  'Category must use letters — not only numbers.'}
              </li>
            ) : null}
            {persistError ? (
              <li className="px-3 py-3 text-center text-xs font-semibold text-red-600">
                {persistError}
              </li>
            ) : null}
            {canAddCustom ? (
              <li>
                <button
                  type="button"
                  role="option"
                  disabled={persistingCustom}
                  onClick={() => commitCustomCategory()}
                  className={`group/option flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${tone.optionIdle} disabled:opacity-60`}
                >
                  <span className="truncate">
                    {persistingCustom
                      ? 'Saving category…'
                      : `${customLabel}: “${customValidation.value}”`}
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
