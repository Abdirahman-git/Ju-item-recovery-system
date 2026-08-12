'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LayoutGrid, Search } from 'lucide-react';
import { getCategoryIcon } from '@/components/admin/categoryOptions';

/**
 * Public browse category picker — same look as admin ReportSelect (icons + search),
 * but menu portals to body so it never clips under the item grid.
 */
export default function CategorySelect({
  value = 'all',
  options = [],
  onChange,
  label = 'Category',
  allLabel = 'All categories',
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalized = useMemo(() => {
    const rows = [
      { value: 'all', label: allLabel, icon: LayoutGrid },
      ...options.map((name) => ({
        value: name,
        label: name,
        icon: getCategoryIcon(name),
      })),
    ];
    return rows;
  }, [options, allLabel]);

  const selected = normalized.find((row) => row.value === value);
  const SelectedIcon = selected?.icon || LayoutGrid;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalized;
    return normalized.filter((row) => row.label.toLowerCase().includes(term));
  }, [normalized, query]);

  const updateCoords = () => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: r.bottom + 8,
      left: r.left,
      width: Math.max(r.width, 260),
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateCoords();
    const onWin = () => updateCoords();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlightIndex(0);
      return undefined;
    }
    const selectedIndex = filtered.findIndex((row) => row.value === value);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, value, filtered]);

  const pick = (option) => {
    onChange?.(option.value);
    setOpen(false);
  };

  const handleListKeyDown = (event) => {
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
    if (event.key === 'Enter' && filtered[highlightIndex]) {
      event.preventDefault();
      pick(filtered[highlightIndex]);
    }
  };

  const panel =
    open && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            onKeyDown={handleListKeyDown}
            className="report-select-panel report-select-panel-blue overflow-hidden rounded-[20px] border border-slate-200 bg-white"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
          >
            <div className="border-b border-slate-100 p-2.5">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlightIndex(0);
                  }}
                  placeholder="Search..."
                  className="h-10 w-full rounded-xl border border-blue-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:border-[#1A56DB] focus:bg-white"
                />
              </div>
            </div>

            <ul className="max-h-72 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm font-medium text-slate-400">
                  No matches found
                </li>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightIndex;
                  const OptionIcon = option.icon;
                  let rowClass = 'text-slate-700 hover:bg-[#1A56DB] hover:text-white';
                  if (isHighlighted) rowClass = 'bg-[#1A56DB] text-white shadow-sm shadow-blue-500/20';
                  else if (isSelected) rowClass = 'bg-blue-50 text-[#1A56DB]';

                  let iconClass = 'bg-blue-50 text-[#1A56DB] group-hover/option:bg-white/20 group-hover/option:text-white';
                  if (isHighlighted) iconClass = 'bg-white/20 text-white';
                  else if (isSelected) iconClass = 'bg-blue-50 text-[#1A56DB]';

                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlightIndex(index)}
                        onClick={() => pick(option)}
                        className={`group/option flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${rowClass}`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                          {OptionIcon ? (
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${iconClass}`}
                            >
                              <OptionIcon size={16} />
                            </span>
                          ) : null}
                          <span className="truncate">{option.label}</span>
                        </span>
                        {isSelected ? (
                          <Check
                            size={16}
                            className={`shrink-0 ${isHighlighted ? 'text-white' : 'text-[#1A56DB]'}`}
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="public-cat-select relative z-20 min-w-0 w-full sm:min-w-[14rem] sm:w-auto sm:max-w-[18rem]">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="group flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/12"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[#1A56DB]">
            <SelectedIcon size={14} />
          </span>
          <span className={`truncate ${selected ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}`}>
            {selected?.label || allLabel}
          </span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400">
          <ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {panel}
    </div>
  );
}
