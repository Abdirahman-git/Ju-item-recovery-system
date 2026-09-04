'use client';

import { useEffect, useRef, useState } from 'react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudUpload,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  Save,
  Send,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import {
  createAdminFoundDraft,
  createAdminFoundItem,
  createAdminLostDraft,
  createAdminLostItem,
  fetchDraftItemById,
  mapDraftToReportForm,
  publishAdminFoundDraft,
  publishAdminLostDraft,
  updateAdminFoundDraft,
  updateAdminLostDraft,
} from '@/lib/supabase';
import { resolveItemImageUrl } from '@/lib/itemImage';
import { ADMIN_CATEGORY_OPTIONS } from '@/components/admin/categoryOptions';
import ReportSelect from '@/components/admin/ReportSelect';
import { invalidateAdminCaches, invalidateInventoryCaches } from '@/lib/adminDataCache';
import { validateMeaningfulText } from '@/lib/contentValidation';

const CATEGORY_OPTIONS = ADMIN_CATEGORY_OPTIONS;

const initialForm = {
  itemName: '',
  category: 'Electronics',
  description: '',
  location: '',
  reportDate: '',
  reportTime: '',
  phone: '',
  notifyMatches: true,
};

function createInitialForm() {
  return {
    ...initialForm,
    reportTime: getLocalTimeValue(),
  };
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">{label}</span>
      {children}
    </div>
  );
}

function formInputClass(isFound, extra = '') {
  return [
    'report-form-input',
    isFound ? 'report-form-input-emerald' : 'report-form-input-blue',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

function getLocalDateValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getLocalTimeValue(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateDisplay(value) {
  const date = parseLocalDate(value);
  if (!date) return 'Select date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTimeDisplay(value) {
  if (!value) return 'Select time';
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function GlassDatePicker({ value, onChange, max, toneText, isFound = false }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const [viewDate, setViewDate] = useState(() => parseLocalDate(value) || parseLocalDate(max) || new Date());
  const maxDate = parseLocalDate(max) || new Date();
  const selected = parseLocalDate(value);
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDate);
    day.setDate(firstGridDate.getDate() + index);
    const dayValue = getLocalDateValue(day);
    return {
      date: day,
      value: dayValue,
      inMonth: day.getMonth() === monthStart.getMonth(),
      isToday: dayValue === getLocalDateValue(),
      isSelected: selected ? dayValue === getLocalDateValue(selected) : false,
      disabled: dayValue > max,
    };
  });
  const canGoNext = getLocalDateValue(addMonths(monthStart, 1)) <= getLocalDateValue(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));

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

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${formInputClass(isFound, 'group flex h-11 w-full items-center justify-between rounded-[18px] px-4 text-left text-sm outline-none')}`}
      >
        <span className={value ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}>{formatDateDisplay(value)}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition group-hover:scale-105 ${toneText}`}>
          <Calendar size={16} />
        </span>
      </button>

      {open ? (
        <div className={`report-select-panel absolute bottom-[calc(100%+0.45rem)] left-0 z-50 w-[min(18.75rem,calc(100vw-3rem))] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3 ${isFound ? 'report-select-panel-emerald' : 'report-select-panel-blue'}`}>
          <div className="mb-2 rounded-[18px] border border-slate-100 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate((current) => addMonths(current, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/75 text-slate-600 shadow-sm transition hover:bg-white hover:text-[#1A56DB]"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-black text-slate-950">{monthLabel}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">Past or today only</p>
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
              <span key={`${day}-${index}`} className="py-1">{day}</span>
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
                      ? 'text-slate-300'
                      : day.inMonth
                        ? 'text-slate-700 hover:bg-white/85 hover:text-[#1A56DB]'
                        : 'text-slate-300 hover:bg-white/50'
                } ${day.isToday && !day.isSelected ? 'ring-1 ring-[#1A56DB]/35' : ''}`}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/70 pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="rounded-2xl px-3 py-1.5 text-xs font-black text-slate-500 transition hover:bg-white/70"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(max);
                setViewDate(maxDate);
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

function GlassTimePicker({ value, onChange, max, toneText, isFound = false }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const selected = (() => {
    if (!value) return { hour: '08', minute: '00', period: 'AM' };
    const [rawHour, rawMinute] = value.split(':').map(Number);
    const period = rawHour >= 12 ? 'PM' : 'AM';
    const hour12 = rawHour % 12 || 12;
    return {
      hour: String(hour12).padStart(2, '0'),
      minute: String(rawMinute || 0).padStart(2, '0'),
      period,
    };
  })();
  const hours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  const periods = ['AM', 'PM'];
  const currentValue = max || getLocalTimeValue();

  function buildTime(next = {}) {
    const hour12 = Number(next.hour || selected.hour);
    const minute = next.minute || selected.minute;
    const period = next.period || selected.period;
    let hour24 = hour12 % 12;
    if (period === 'PM') hour24 += 12;
    return `${String(hour24).padStart(2, '0')}:${minute}`;
  }

  function isFutureTime(timeValue) {
    return Boolean(max && timeValue > max);
  }

  function hasValidCandidate(next = {}) {
    if (!max) return true;
    const candidateHours = next.hour ? [next.hour] : hours;
    const candidateMinutes = next.minute ? [next.minute] : minutes;
    const candidatePeriods = next.period ? [next.period] : periods;

    return candidateHours.some((hour) =>
      candidateMinutes.some((minute) =>
        candidatePeriods.some((period) => buildTime({ hour, minute, period }) <= max)
      )
    );
  }

  function chooseTime(next) {
    const nextValue = buildTime(next);
    if (isFutureTime(nextValue)) return;
    onChange(nextValue);
  }

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

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${formInputClass(isFound, 'group flex h-11 w-full items-center justify-between rounded-[18px] px-4 text-left text-sm outline-none')}`}
      >
        <span className={value ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}>{formatTimeDisplay(value)}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition group-hover:scale-105 ${toneText}`}>
          <Clock3 size={16} />
        </span>
      </button>

      {open ? (
        <div className={`report-select-panel absolute bottom-[calc(100%+0.45rem)] right-0 z-50 w-[min(14.5rem,calc(100vw-3rem))] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3 ${isFound ? 'report-select-panel-emerald' : 'report-select-panel-blue'}`}>
          <div className="mb-2.5 flex items-center justify-between rounded-[18px] border border-slate-100 bg-slate-50 p-2.5">
            <div>
              <p className="text-sm font-black text-slate-950">{formatTimeDisplay(buildTime())}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">
                {max ? `Latest ${formatTimeDisplay(max)}` : 'Pick exact time'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/75 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900"
              aria-label="Close time picker"
            >
              <X size={16} />
            </button>
          </div>

          <label className="mb-2 block rounded-[16px] border border-white/70 bg-white/55 px-2.5 py-2 shadow-sm">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Type time
            </span>
            <input
              type="time"
              value={value || currentValue}
              max={max}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (!nextValue || isFutureTime(nextValue)) return;
                onChange(nextValue);
              }}
              className="h-8 w-full rounded-xl bg-white/70 px-2 text-xs font-black text-slate-800 outline-none [color-scheme:light] focus:ring-2 focus:ring-[#1A56DB]/15"
            />
          </label>

          <div className="grid grid-cols-[1fr_1fr_0.82fr] gap-2">
            <div className="rounded-[18px] border border-white/70 bg-white/45 p-1">
              <p className="px-1 pb-1 text-center text-[9px] font-black uppercase tracking-wide text-slate-400">Hour</p>
              <div className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
                {hours.map((hour) => {
                  const disabled = !hasValidCandidate({ hour });
                  return (
                    <button
                      key={hour}
                      type="button"
                      disabled={disabled}
                      onClick={() => chooseTime({ hour })}
                      className={`rounded-xl py-1.5 text-xs font-black transition ${
                        selected.hour === hour
                          ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25'
                          : disabled
                            ? 'text-slate-300'
                            : 'text-slate-700 hover:bg-white hover:text-[#1A56DB]'
                      }`}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/70 bg-white/45 p-1">
              <p className="px-1 pb-1 text-center text-[9px] font-black uppercase tracking-wide text-slate-400">Min</p>
              <div className="grid max-h-32 gap-1 overflow-y-auto pr-0.5">
                {minutes.map((minute) => {
                  const nextValue = buildTime({ minute });
                  const disabled = isFutureTime(nextValue);
                  return (
                    <button
                      key={minute}
                      type="button"
                      disabled={disabled}
                      onClick={() => chooseTime({ minute })}
                      className={`rounded-xl py-1.5 text-xs font-black transition ${
                        selected.minute === minute
                          ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25'
                          : disabled
                            ? 'text-slate-300'
                            : 'text-slate-700 hover:bg-white hover:text-[#1A56DB]'
                      }`}
                    >
                      {minute}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/70 bg-white/45 p-1">
              <p className="px-1 pb-1 text-center text-[9px] font-black uppercase tracking-wide text-slate-400">Mode</p>
              <div className="grid gap-1">
                {periods.map((period) => {
                  const disabled = !hasValidCandidate({ period });
                  return (
                    <button
                      key={period}
                      type="button"
                      disabled={disabled}
                      onClick={() => chooseTime({ period })}
                      className={`rounded-xl py-1.5 text-xs font-black transition ${
                        selected.period === period
                          ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25'
                          : disabled
                            ? 'text-slate-300'
                            : 'text-slate-700 hover:bg-white hover:text-[#1A56DB]'
                      }`}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/70 pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange(currentValue);
                setOpen(false);
              }}
              className="rounded-2xl px-3 py-1.5 text-xs font-black text-slate-500 transition hover:bg-white/70"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-2xl bg-[#1A56DB] px-3 py-1.5 text-xs font-black text-white shadow-md shadow-blue-500/25"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function isReportFormEmpty(form, { imageFile, imagePreview, existingImageUrl }) {
  const hasText =
    form.itemName.trim() ||
    form.description.trim() ||
    form.location.trim() ||
    form.reportDate.trim() ||
    form.phone.trim();
  const hasImage = Boolean(imageFile || imagePreview || existingImageUrl);
  return !hasText && !hasImage;
}

function NoticeModal({ state, onClose }) {
  if (!state) return null;
  const success = state.type === 'success';
  const info = state.type === 'info';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            success
              ? 'bg-emerald-50 text-emerald-700'
              : info
                ? 'bg-amber-50 text-amber-600'
                : 'bg-red-50 text-red-600'
          }`}
        >
          {success ? <CheckCircle2 size={31} /> : info ? <TriangleAlert size={31} /> : <X size={31} />}
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">{state.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{state.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-2xl bg-[#1A56DB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1E40AF]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function ClearConfirmModal({ open, isEditingDraft, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <TriangleAlert size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Clear this form?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isEditingDraft
            ? 'All fields on this page will be reset. Your saved draft in Draft Items will not be deleted.'
            : 'All entered item details and the uploaded photo will be removed from this form.'}
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
            className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-600"
          >
            Yes, clear form
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportLostClient({ mode = 'lost' }) {
  const isFound = mode === 'found';
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get('draft');
  const { session } = useSession();
  const { clearActions } = useAdminHeaderActions();
  const [form, setForm] = useState(() => createInitialForm());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const ownerName = session?.userName || 'JU System Admin';
  const ownerEmail = session?.email || 'admin@ju.edu.so';
  const tone = isFound ? 'emerald' : 'blue';
  const toneText = isFound ? 'text-emerald-700' : 'text-[#1A56DB]';
  const toneBg = isFound ? 'bg-emerald-500' : 'bg-[#1A56DB]';
  const pageTitle = editingDraftId
    ? isFound
      ? 'Continue Lost Hold Draft'
      : 'Continue Lost Draft'
    : isFound
      ? 'Lost Hold Draft'
      : 'Report Lost Item';
  const pageSubtitle = editingDraftId
    ? 'Review and finish this saved draft before publishing it to the inventory.'
    : isFound
      ? 'Legacy found drafts only — new public found reports are closed.'
      : 'Log missing campus property. A photo is optional but helps with identification.';
  const dateLabel = isFound ? 'Date Held' : 'Date Lost';
  const timeLabel = isFound ? 'Time Held' : 'Time Lost';
  const personKey = isFound ? 'finderName' : 'ownerName';
  const todayValue = getLocalDateValue();
  const currentTimeValue = getLocalTimeValue();
  const maxReportTime = form.reportDate === todayValue ? currentTimeValue : undefined;
  const reportPath = isFound ? '/admin/found' : '/admin/lost';

  useEffect(() => {
    clearActions();
    return () => clearActions();
  }, [clearActions]);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      if (!draftParam) {
        setEditingDraftId(null);
        setExistingImageUrl('');
        return;
      }

      setLoadingDraft(true);
      try {
        const itemType = isFound ? 'found' : 'lost';
        const { raw } = await fetchDraftItemById(itemType, draftParam);
        if (cancelled) return;

        const nextForm = mapDraftToReportForm(raw, itemType);
        setEditingDraftId(raw.id);
        setForm({
          ...nextForm,
          reportTime: nextForm.reportTime || getLocalTimeValue(),
        });

        const imageUrl = resolveItemImageUrl(raw);
        setExistingImageUrl(imageUrl || '');
        setImagePreview(imageUrl || '');
        setImageFile(null);
      } catch (error) {
        if (cancelled) return;
        setEditingDraftId(null);
        setExistingImageUrl('');
        setForm(createInitialForm());
        setImagePreview('');
        setImageFile(null);
        setNotice({
          type: 'error',
          title: 'Could not load draft',
          message: error?.message || 'This draft could not be opened.',
        });
        router.replace(reportPath);
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    }

    loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftParam, isFound, reportPath, router]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: null }));
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
    if (fieldErrors.image) {
      setFieldErrors((current) => ({ ...current, image: null }));
    }
  }

  function validateFormFields(isPublish = true) {
    const errors = {};

    // 1. Item Name
    if (!form.itemName.trim()) {
      errors.itemName = 'Item name is required.';
    } else {
      const nameCheck = validateMeaningfulText(form.itemName, {
        fieldLabel: 'Item name',
        minLength: 3,
        minLetters: 2,
      });
      if (!nameCheck.valid) {
        errors.itemName = nameCheck.message;
      }
    }

    // 2. Category
    if (!form.category) {
      errors.category = 'Select a category.';
    }

    // 3. Location
    if (!form.location.trim()) {
      errors.location = isFound ? 'Found location is required.' : 'Last seen location is required.';
    } else {
      const locCheck = validateMeaningfulText(form.location, {
        fieldLabel: 'Location',
        minLength: 5,
        minLetters: 2,
      });
      if (!locCheck.valid) {
        errors.location = locCheck.message;
      }
    }

    // 4. Report Date
    if (!form.reportDate) {
      errors.reportDate = `${dateLabel} is required.`;
    } else if (form.reportDate > todayValue) {
      errors.reportDate = `${dateLabel} cannot be in the future.`;
    }

    // 5. Report Time
    if (!form.reportTime) {
      errors.reportTime = `${timeLabel} is required.`;
    } else if (form.reportDate === todayValue && form.reportTime > currentTimeValue) {
      errors.reportTime = `${timeLabel} cannot be in the future.`;
    }

    // 6. Description
    if (!form.description.trim()) {
      errors.description = 'Description is required.';
    } else {
      const descCheck = validateMeaningfulText(form.description, {
        fieldLabel: 'Description',
        minLength: 10,
        minLetters: 4,
      });
      if (!descCheck.valid) {
        errors.description = descCheck.message;
      }
    }

    // 7. Photo (for Found Item on Publish)
    if (isFound && isPublish && !imageFile && !existingImageUrl) {
      errors.image = 'One clear photo is required before publishing found items.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildPayload() {
    return {
      ...form,
      itemName: form.itemName.trim(),
      location: form.location.trim(),
      [personKey]: ownerName,
      finderId: ownerEmail,
      email: ownerEmail,
      userId: ownerEmail,
    };
  }

  async function saveDraft() {
    const isValid = validateFormFields(false);
    if (!isValid) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (editingDraftId) {
        const updateDraft = isFound ? updateAdminFoundDraft : updateAdminLostDraft;
        await updateDraft(editingDraftId, payload, imageFile, existingImageUrl);
        invalidateAdminCaches('admin:drafts', 'admin:items', 'admin:dashboard');
        router.push('/admin/items');
        return;
      }

      const createDraft = isFound ? createAdminFoundDraft : createAdminLostDraft;
      await createDraft(payload, imageFile);
      invalidateAdminCaches('admin:drafts', 'admin:items', 'admin:dashboard');
      setForm(createInitialForm());
      setImageFile(null);
      setImagePreview('');
      setExistingImageUrl('');
      setFieldErrors({});
      setNotice({
        type: 'success',
        title: 'Draft saved',
        message: 'The draft has been saved to the database and is visible in Draft Items.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Could not save draft',
        message: error?.message || 'The draft could not be saved to the database.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleClearRequest() {
    if (isReportFormEmpty(form, { imageFile, imagePreview, existingImageUrl })) {
      setNotice({
        type: 'info',
        title: 'Form is already empty',
        message: 'There is nothing to clear. Add item details or upload a photo first.',
      });
      return;
    }
    setShowClearConfirm(true);
  }

  function clearDraft() {
    const wasEditing = Boolean(editingDraftId);
    setShowClearConfirm(false);
    setForm(createInitialForm());
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl('');
    setEditingDraftId(null);
    setFieldErrors({});
    if (draftParam) {
      router.replace(reportPath);
    }
    setNotice({
      type: 'success',
      title: wasEditing ? 'Draft editing cleared' : 'Draft cleared',
      message: wasEditing
        ? 'The form was reset. Your saved draft is still available in Draft Items.'
        : 'The local draft has been removed from this browser.',
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const isValid = validateFormFields(true);
    if (!isValid) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (editingDraftId) {
        const publishDraft = isFound ? publishAdminFoundDraft : publishAdminLostDraft;
        await publishDraft(editingDraftId, payload, imageFile, existingImageUrl);
        invalidateInventoryCaches();
        router.push('/admin/items');
        return;
      }

      const createItem = isFound ? createAdminFoundItem : createAdminLostItem;
      await createItem(payload, imageFile);
      invalidateInventoryCaches();
      setForm(createInitialForm());
      setImageFile(null);
      setImagePreview('');
      setExistingImageUrl('');
      setFieldErrors({});
      setNotice({
        type: 'success',
        title: isFound ? 'Found item published' : 'Lost item published',
        message: 'The report is now live in the global inventory.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Could not save',
        message: error?.message || 'The item report could not be published.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDraft) {
    return (
      <div className="glass-card flex min-h-[420px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
        <Loader2 size={32} className={`animate-spin ${toneText}`} />
        <p className="mt-4 text-sm font-semibold text-slate-600">Loading draft...</p>
      </div>
    );
  }

  return (
    <form id={`report-${mode}-form`} onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-5">
      <div className="report-form-section rounded-[30px] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneBg} text-white shadow-xl ${isFound ? 'shadow-emerald-500/25' : 'shadow-blue-500/25'}`}>
            {isFound ? <CheckCircle2 size={25} /> : <Navigation size={25} />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">{pageTitle}</h1>
            <p className="text-sm font-medium text-slate-500">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.88fr_1.7fr]">
        <div className="h-full space-y-5">
          <section className="report-form-section flex h-full min-h-[360px] flex-col rounded-[24px] p-4 lg:min-h-[520px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={19} className={toneText} />
                <h2 className="text-base font-extrabold text-slate-950">Visual Evidence</h2>
              </div>
              {imagePreview ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
                  Change photo
                </span>
              ) : null}
            </div>

            <label className={`report-form-upload relative flex min-h-[280px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] p-3 text-center lg:min-h-[430px] ${isFound ? 'report-form-upload-emerald' : 'report-form-upload-blue'} ${fieldErrors.image ? '!border-red-500 !bg-red-50/20' : ''}`}>
              {imagePreview ? (
                <span className="relative flex h-full min-h-[270px] w-full items-center justify-center overflow-hidden rounded-[18px] bg-white/70 lg:min-h-[420px]">
                  <SafeRemoteImage src={imagePreview} alt="Lost item preview" fill className="object-contain p-2" sizes="(max-width: 1024px) 100vw, 420px" priority />
                </span>
              ) : (
                <>
                  <span className={`flex h-16 w-16 items-center justify-center rounded-[22px] ${isFound ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#1A56DB]'} shadow-xl ${isFound ? 'shadow-emerald-500/10' : 'shadow-blue-500/10'}`}>
                    <CloudUpload size={32} />
                  </span>
                  <span className="mt-4 text-base font-extrabold text-slate-900">
                    {isFound ? 'Upload one clear item photo' : 'Upload item photo (optional)'}
                  </span>
                  <span className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                    {isFound
                      ? 'JPEG, PNG, or WebP. A clear photo is required before publishing.'
                      : 'JPEG, PNG, or WebP. Optional — add one if it helps identify the item.'}
                  </span>
                </>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
            </label>
            {fieldErrors.image ? (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600">
                <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.image}
              </p>
            ) : null}
          </section>
        </div>

        <div className="space-y-5">
          <section className="report-form-section rounded-[28px] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Save size={20} className={toneText} />
              <h2 className="text-lg font-extrabold text-slate-950">Item Specifications</h2>
            </div>
            <div className="grid gap-4">
              <Field label="Item Name">
                <input
                  value={form.itemName}
                  onChange={(event) => updateField('itemName', event.target.value)}
                  placeholder="e.g., MacBook Pro 16-inch Space Gray"
                  className={formInputClass(isFound, `h-12 w-full rounded-[18px] px-4 text-sm ${fieldErrors.itemName ? '!border-red-500 !ring-2 !ring-red-500/20' : ''}`)}
                />
                {fieldErrors.itemName ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                    <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.itemName}
                  </p>
                ) : null}
              </Field>
              <Field label="Category">
                <ReportSelect
                  value={form.category}
                  onChange={(category) => updateField('category', category)}
                  options={CATEGORY_OPTIONS}
                  placeholder="Select category"
                  theme={isFound ? 'emerald' : 'blue'}
                />
                {fieldErrors.category ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                    <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.category}
                  </p>
                ) : null}
              </Field>
            </div>
          </section>

          <section className="report-form-section rounded-[24px] p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={19} className={toneText} />
              <h2 className="text-base font-extrabold text-slate-950">Discovery Context</h2>
            </div>
            <div className="grid gap-4">
              <Field label={isFound ? 'Found Location' : 'Last Seen Location'}>
                <div className="relative">
                  <Navigation size={18} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${toneText}`} />
                  <input
                    value={form.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    placeholder="Enter campus location or building name..."
                    className={formInputClass(isFound, `h-12 w-full rounded-[18px] pl-11 pr-4 text-sm ${fieldErrors.location ? '!border-red-500 !ring-2 !ring-red-500/20' : ''}`)}
                  />
                </div>
                {fieldErrors.location ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                    <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.location}
                  </p>
                ) : null}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={dateLabel}>
                  <GlassDatePicker
                    value={form.reportDate}
                    max={todayValue}
                    toneText={toneText}
                    isFound={isFound}
                    onChange={(value) => {
                      updateField('reportDate', value);
                      if (value === todayValue && form.reportTime && form.reportTime > currentTimeValue) {
                        updateField('reportTime', currentTimeValue);
                      }
                    }}
                  />
                  {fieldErrors.reportDate ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.reportDate}
                    </p>
                  ) : null}
                </Field>
                <Field label={timeLabel}>
                  <GlassTimePicker
                    value={form.reportTime}
                    max={maxReportTime}
                    toneText={toneText}
                    isFound={isFound}
                    onChange={(value) => updateField('reportTime', value)}
                  />
                  {fieldErrors.reportTime ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.reportTime}
                    </p>
                  ) : null}
                </Field>
              </div>
              <Field label="Description">
                <div className="relative">
                  <FileText size={18} className={`pointer-events-none absolute left-4 top-4 ${toneText}`} />
                  <textarea
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value.slice(0, 500))}
                    placeholder={isFound ? 'Describe where it was found and any visible details...' : 'Describe unique identifiers, scratches, or last-known condition...'}
                    className={formInputClass(isFound, `min-h-[148px] w-full resize-none rounded-[18px] py-3 pl-11 pr-4 text-sm leading-6 ${fieldErrors.description ? '!border-red-500 !ring-2 !ring-red-500/20' : ''}`)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {fieldErrors.description ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                        <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="mt-1 block text-right text-xs font-semibold text-slate-400">{form.description.length}/500</span>
                </div>
              </Field>
            </div>
          </section>

          <div className="report-form-section rounded-[22px] px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Notify me on similar matches found</span>
                <button
                  type="button"
                  onClick={() => updateField('notifyMatches', !form.notifyMatches)}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                    form.notifyMatches ? toneBg : 'bg-slate-200'
                  }`}
                  aria-label="Toggle similar match notifications"
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition ${
                      form.notifyMatches ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearRequest}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  {editingDraftId ? 'Update Draft' : 'Save Draft'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60 ${
                    isFound
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-emerald-900/20'
                      : 'bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] shadow-blue-900/25'
                  }`}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Save & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NoticeModal state={notice} onClose={() => setNotice(null)} />
      <ClearConfirmModal
        open={showClearConfirm}
        isEditingDraft={Boolean(editingDraftId)}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={clearDraft}
      />
    </form>
  );
}
