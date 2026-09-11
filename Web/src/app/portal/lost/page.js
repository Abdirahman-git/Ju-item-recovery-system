'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
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
import { createPortalLostItem, uploadPortalItemImage } from '@/lib/portal';
import ReportSelect from '@/components/admin/ReportSelect';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import { useAdminCategoryOptions } from '@/hooks/useAdminCategoryOptions';
import { validateMeaningfulText } from '@/lib/contentValidation';
import { validateCategoryName } from '@/lib/categories';

function Field({ label, children, error }) {
  return (
    <div className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
        {label}
      </span>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-red-600">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function getLocalDateValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalTimeValue(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatTimeLabel(hhmm) {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  let h = Number(hStr);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function ReportLostPage() {
  const router = useRouter();
  const { session } = useSession();
  const { options: categoryOptions, persistCategory } = useAdminCategoryOptions();

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [location, setLocation] = useState('');
  const [dateLost, setDateLost] = useState(() => getLocalDateValue());
  const [timeLost, setTimeLost] = useState(() => getLocalTimeValue());
  const [description, setDescription] = useState('');
  const [notifyMatches, setNotifyMatches] = useState(true);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  const ownerName = session?.userName || session?.name || '';
  const phnum = session?.phone || '';
  const todayValue = getLocalDateValue();
  const currentTimeValue = getLocalTimeValue();

  function clearFieldError(key) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      return { ...current, [key]: null };
    });
  }

  function updateItemName(value) {
    setItemName(value);
    clearFieldError('itemName');
  }

  function updateCategory(value) {
    setCategory(value);
    clearFieldError('category');
  }

  function updateLocation(value) {
    setLocation(value);
    clearFieldError('location');
  }

  function updateDateLost(value) {
    setDateLost(value);
    clearFieldError('dateLost');
    clearFieldError('timeLost');
  }

  function updateTimeLost(value) {
    setTimeLost(value);
    clearFieldError('timeLost');
  }

  function updateDescription(value) {
    setDescription(value.slice(0, 500));
    clearFieldError('description');
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFieldErrors((current) => ({
        ...current,
        image: 'Use JPEG, PNG, or WebP only.',
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((current) => ({
        ...current,
        image: 'Image file is too large (max 5MB).',
      }));
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    clearFieldError('image');
    setFormError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    clearFieldError('image');
  };

  const handleClear = () => {
    setItemName('');
    setCategory('Electronics');
    setLocation('');
    setDateLost(getLocalDateValue());
    setTimeLost(getLocalTimeValue());
    setDescription('');
    setNotifyMatches(true);
    removeImage();
    setFieldErrors({});
    setFormError(null);
    setSuccess(false);
  };

  /** Same rules as admin ReportLostClient validateFormFields (lost publish). */
  function validateFormFields() {
    const errors = {};

    if (!itemName.trim()) {
      errors.itemName = 'Item name is required.';
    } else {
      const nameCheck = validateMeaningfulText(itemName, {
        fieldLabel: 'Item name',
        minLength: 3,
        minLetters: 2,
      });
      if (!nameCheck.valid) errors.itemName = nameCheck.message;
    }

    if (!category) {
      errors.category = 'Select a category.';
    } else {
      const categoryCheck = validateCategoryName(category);
      if (!categoryCheck.valid) errors.category = categoryCheck.message;
    }

    if (!location.trim()) {
      errors.location = 'Last seen location is required.';
    } else {
      const locCheck = validateMeaningfulText(location, {
        fieldLabel: 'Location',
        minLength: 5,
        minLetters: 2,
      });
      if (!locCheck.valid) errors.location = locCheck.message;
    }

    if (!dateLost) {
      errors.dateLost = 'Date lost is required.';
    } else if (dateLost > todayValue) {
      errors.dateLost = 'Date lost cannot be in the future.';
    }

    if (!timeLost) {
      errors.timeLost = 'Time lost is required.';
    } else if (dateLost === todayValue && timeLost > currentTimeValue) {
      errors.timeLost = 'Time lost cannot be in the future.';
    }

    if (!description.trim()) {
      errors.description = 'Description is required.';
    } else {
      const descCheck = validateMeaningfulText(description, {
        fieldLabel: 'Description',
        minLength: 10,
        minLetters: 4,
      });
      if (!descCheck.valid) errors.description = descCheck.message;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!session?.email) {
      setFormError('Please sign in again before submitting.');
      return;
    }

    if (!validateFormFields()) {
      setFormError('Fix the highlighted fields before publishing.');
      return;
    }

    setSubmitting(true);

    try {
      let imageURI = null;
      if (imageFile) {
        imageURI = await uploadPortalItemImage(imageFile);
      }

      const categoryCheck = validateCategoryName(category);

      await createPortalLostItem({
        itemName: itemName.trim(),
        category: categoryCheck.value || category,
        location: location.trim(),
        dateLost,
        timeLost: formatTimeLabel(timeLost) || timeLost,
        description: description.trim(),
        ownerName: ownerName.trim() || 'Anonymous',
        phnum: phnum.trim() || '',
        email: session.email,
        imageURI,
        notifyMatches,
      });

      setFieldErrors({});
      setSuccess(true);
      setTimeout(() => {
        router.push('/portal/my-items');
      }, 1400);
    } catch (err) {
      console.error('Error submitting lost report:', err);
      setFormError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputErrorClass = (key) =>
    fieldErrors[key] ? '!border-red-500 !ring-2 !ring-red-500/20' : '';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-5 animate-in fade-in duration-300" noValidate>
      <div className="report-form-section rounded-[30px] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A56DB] text-white shadow-xl shadow-blue-500/25">
            <Navigation size={25} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">Report Lost Item</h1>
            <p className="text-sm font-medium text-slate-500">
              Same validation as the admin desk — meaningful details required. Photo is optional.
            </p>
          </div>
        </div>
      </div>

      {success ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 size={24} className="flex-shrink-0 text-emerald-600" />
          <div className="text-xs">
            <p className="text-sm font-black text-emerald-950">Report submitted for review</p>
            <p className="mt-0.5 font-medium">Redirecting to My Items…</p>
          </div>
        </div>
      ) : null}

      {formError ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle size={22} className="flex-shrink-0 text-red-600" />
          <p className="text-xs font-semibold">{formError}</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.88fr_1.7fr]">
        <div className="h-full space-y-5">
          <section className="report-form-section flex h-full min-h-[360px] flex-col rounded-[24px] p-4 lg:min-h-[520px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={19} className="text-[#1A56DB]" />
                <h2 className="text-base font-extrabold text-slate-950">Visual Evidence</h2>
              </div>
              {imagePreview ? (
                <button
                  type="button"
                  onClick={removeImage}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 hover:bg-white"
                >
                  Remove photo
                </button>
              ) : null}
            </div>

            {imagePreview ? (
              <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-[linear-gradient(145deg,#f8fafc_0%,#eef2f7_100%)] lg:min-h-[430px]">
                <SafeRemoteImage
                  src={imagePreview}
                  alt="Item preview"
                  fill
                  className="object-contain object-center p-2"
                  sizes="(max-width: 1024px) 100vw, 420px"
                  priority
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white hover:bg-slate-900"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label
                className={`report-form-upload report-form-upload-blue relative flex min-h-[280px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] p-3 text-center lg:min-h-[430px] ${
                  fieldErrors.image ? '!border-red-500 !bg-red-50/20' : ''
                }`}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-50 text-[#1A56DB] shadow-xl shadow-blue-500/10">
                  <CloudUpload size={32} />
                </span>
                <span className="mt-4 text-base font-extrabold text-slate-900">
                  Upload item photo (optional)
                </span>
                <span className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  JPEG, PNG, or WebP · max 5MB. Optional — helps identification.
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
            {fieldErrors.image ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-red-600">
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-500" />
                <span>{fieldErrors.image}</span>
              </p>
            ) : null}
          </section>
        </div>

        <div className="space-y-5">
          <section className="report-form-section rounded-[28px] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Save size={20} className="text-[#1A56DB]" />
              <h2 className="text-lg font-extrabold text-slate-950">Item Specifications</h2>
            </div>
            <div className="grid gap-4">
              <Field label="Item Name" error={fieldErrors.itemName}>
                <input
                  value={itemName}
                  onChange={(e) => updateItemName(e.target.value)}
                  maxLength={60}
                  placeholder="e.g., MacBook Pro 16-inch Space Gray"
                  className={`report-form-input report-form-input-blue h-12 w-full rounded-[18px] px-4 text-sm ${inputErrorClass('itemName')}`}
                  aria-invalid={Boolean(fieldErrors.itemName)}
                />
              </Field>
              <Field label="Category" error={fieldErrors.category}>
                <ReportSelect
                  value={category}
                  onChange={updateCategory}
                  options={categoryOptions}
                  placeholder="Select category"
                  theme="blue"
                  allowCustom
                  onPersistCustom={persistCategory}
                />
              </Field>
            </div>
          </section>

          <section className="report-form-section rounded-[24px] p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={19} className="text-[#1A56DB]" />
              <h2 className="text-base font-extrabold text-slate-950">Discovery Context</h2>
            </div>
            <div className="grid gap-4">
              <Field label="Last Seen Location" error={fieldErrors.location}>
                <div className="relative">
                  <Navigation
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]"
                  />
                  <input
                    value={location}
                    onChange={(e) => updateLocation(e.target.value)}
                    maxLength={80}
                    placeholder="Enter campus location or building name..."
                    className={`report-form-input report-form-input-blue h-12 w-full rounded-[18px] pl-11 pr-4 text-sm ${inputErrorClass('location')}`}
                    aria-invalid={Boolean(fieldErrors.location)}
                  />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date Lost" error={fieldErrors.dateLost}>
                  <div className="relative">
                    <Calendar
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]"
                    />
                    <input
                      type="date"
                      max={todayValue}
                      value={dateLost}
                      onChange={(e) => updateDateLost(e.target.value)}
                      className={`report-form-input report-form-input-blue h-12 w-full rounded-[18px] pl-11 pr-4 text-sm ${inputErrorClass('dateLost')}`}
                      aria-invalid={Boolean(fieldErrors.dateLost)}
                    />
                  </div>
                </Field>
                <Field label="Time Lost" error={fieldErrors.timeLost}>
                  <div className="relative">
                    <Clock3
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]"
                    />
                    <input
                      type="time"
                      value={timeLost}
                      onChange={(e) => updateTimeLost(e.target.value)}
                      max={dateLost === todayValue ? currentTimeValue : undefined}
                      className={`report-form-input report-form-input-blue h-12 w-full rounded-[18px] pl-11 pr-4 text-sm ${inputErrorClass('timeLost')}`}
                      aria-invalid={Boolean(fieldErrors.timeLost)}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Description" error={fieldErrors.description}>
                <div className="relative">
                  <FileText
                    size={18}
                    className="pointer-events-none absolute left-4 top-4 text-[#1A56DB]"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => updateDescription(e.target.value)}
                    placeholder="Describe unique identifiers, scratches, or last-known condition..."
                    className={`report-form-input report-form-input-blue min-h-[148px] w-full resize-none rounded-[18px] py-3 pl-11 pr-4 text-sm leading-6 ${inputErrorClass('description')}`}
                    aria-invalid={Boolean(fieldErrors.description)}
                  />
                </div>
                <span className="mt-1 block text-right text-xs font-semibold text-slate-400">
                  {description.length}/500
                </span>
              </Field>
            </div>
          </section>

          <div className="report-form-section rounded-[22px] px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-600">
                  Notify me on similar matches found
                </span>
                <button
                  type="button"
                  onClick={() => setNotifyMatches((v) => !v)}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                    notifyMatches ? 'bg-[#1A56DB]' : 'bg-slate-200'
                  }`}
                  aria-label="Toggle similar match notifications"
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition ${
                      notifyMatches ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={submitting}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Save &amp; Publish
                </button>
              </div>
            </div>
          </div>

          <p className="px-1 text-[11px] font-medium text-slate-400">
            Reporting as <span className="font-semibold text-slate-600">{ownerName || 'User'}</span>
            {session?.email ? ` · ${session.email}` : ''}. Your report goes to pending review first.
          </p>
        </div>
      </div>
    </form>
  );
}
