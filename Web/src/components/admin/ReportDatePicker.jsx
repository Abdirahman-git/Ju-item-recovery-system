'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

function getLocalDateValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateDisplay(value, emptyLabel = 'Select date') {
  const date = parseLocalDate(value);
  if (!date) return emptyLabel;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

/**
 * Custom calendar matching Report Found/Lost date picker.
 * Used on System Reports filters (From / To).
 */
export default function ReportDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  allowFuture = false,
  openDirection = 'down',
  className = '',
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

  const pickerRef = useRef(null);
  const todayKey = getLocalDateValue();
  const maxDateKey = allowFuture ? max || null : max && max < todayKey ? max : todayKey;
  const minDateKey = min || null;

  const [viewDate, setViewDate] = useState(
    () => parseLocalDate(value) || parseLocalDate(maxDateKey) || new Date()
  );

  useEffect(() => {
    const next = parseLocalDate(value);
    if (next) setViewDate(next);
  }, [value]);

  const maxDate = parseLocalDate(maxDateKey) || new Date();
  const selected = parseLocalDate(value);
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthStart);

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDate);
    day.setDate(firstGridDate.getDate() + index);
    const dayValue = getLocalDateValue(day);
    const disabledByMax = maxDateKey ? dayValue > maxDateKey : false;
    const disabledByMin = minDateKey ? dayValue < minDateKey : false;
    return {
      date: day,
      value: dayValue,
      inMonth: day.getMonth() === monthStart.getMonth(),
      isToday: dayValue === todayKey,
      isSelected: selected ? dayValue === getLocalDateValue(selected) : false,
      disabled: disabledByMax || disabledByMin,
    };
  });

  const canGoPrev = (() => {
    if (!minDateKey) return true;
    const prevMonth = addMonths(monthStart, -1);
    const lastDayPrev = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    return getLocalDateValue(lastDayPrev) >= minDateKey;
  })();

  const canGoNext = (() => {
    if (!maxDateKey) return true;
    const nextMonthStart = addMonths(monthStart, 1);
    return getLocalDateValue(nextMonthStart) <= getLocalDateValue(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));
  })();

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  const panelPosition =
    openDirection === 'up'
      ? 'bottom-[calc(100%+0.45rem)]'
      : 'top-[calc(100%+0.45rem)]';

  return (
    <div ref={pickerRef} className={`relative ${open ? 'z-[90]' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/12"
      >
        <span className={`truncate ${value ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}`}>
          {formatDateDisplay(value, placeholder)}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[#1A56DB]">
          <Calendar size={15} />
        </span>
      </button>

      {open ? (
        <div
          className={`report-select-panel report-select-panel-blue absolute left-0 z-[130] w-[min(18.75rem,calc(100vw-3rem))] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3 ${panelPosition}`}
        >
          <div className="mb-2 rounded-[18px] border border-slate-100 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => setViewDate((current) => addMonths(current, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/75 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#1A56DB] disabled:opacity-35"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-black text-slate-950">{monthLabel}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">
                  {allowFuture ? 'Pick a date' : 'Past or today only'}
                </p>
              </div>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setViewDate((current) => addMonths(current, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/75 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#1A56DB] disabled:opacity-35"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`${day}-${index}`} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                disabled={day.disabled}
                onClick={() => {
                  onChange(day.value);
                  setOpen(false);
                }}
                className={`flex h-8 items-center justify-center rounded-xl text-xs font-black transition ${
                  day.isSelected
                    ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25'
                    : day.disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : day.inMonth
                        ? 'text-slate-700 hover:bg-blue-50 hover:text-[#1A56DB]'
                        : 'text-slate-300 hover:bg-slate-50'
                } ${day.isToday && !day.isSelected ? 'ring-1 ring-[#1A56DB]/35' : ''}`}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="rounded-2xl px-3 py-1.5 text-xs font-black text-slate-500 transition hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = todayKey;
                if (minDateKey && today < minDateKey) return;
                if (maxDateKey && today > maxDateKey) return;
                onChange(today);
                setViewDate(new Date());
                setOpen(false);
              }}
              className="rounded-2xl bg-[#1A56DB] px-3 py-1.5 text-xs font-black text-white shadow-md shadow-blue-500/25"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { getLocalDateValue, parseLocalDate, formatDateDisplay };
