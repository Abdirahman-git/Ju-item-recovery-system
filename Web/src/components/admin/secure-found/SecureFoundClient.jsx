'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  Save,
  Send,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import {
  createAdminSecureFoundDraft,
  createAdminSecureFoundItem,
  fetchSecureDraftItemById,
  mapSecureDraftToReportForm,
  publishAdminSecureFoundDraft,
  updateAdminSecureFoundDraft,
} from '@/lib/supabase';
import { resolveItemImageUrl } from '@/lib/itemImage';
import { ADMIN_CATEGORY_OPTIONS } from '@/components/admin/categoryOptions';
import ReportSelect from '@/components/admin/ReportSelect';
import { invalidateInventoryCaches } from '@/lib/adminDataCache';
import { validateMeaningfulText } from '@/lib/contentValidation';
import { STUDENT_AFFAIRS_OFFICE } from '@/lib/itemImage';

function getLocalDateValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getLocalTimeValue(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

function createInitialForm() {
  return { name: '', category: 'Electronics', description: '' };
}

function Field({ label, hint, children }) {
  return (
    <div className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">{label}</span>
      {children}
      {hint ? <p className="mt-1.5 text-xs font-medium text-slate-500">{hint}</p> : null}
    </div>
  );
}

function formInputClass(extra = '') {
  return ['report-form-input', 'report-form-input-amber', extra].filter(Boolean).join(' ');
}

function isSecureFormEmpty(form) {
  return !form.name.trim() && !form.description.trim() && form.category === 'Electronics';
}

function NoticeModal({ state, onClose }) {
  if (!state) return null;
  const success = state.type === 'success';
  const info = state.type === 'info';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${success ? 'bg-emerald-50 text-emerald-700' : info ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
          {success ? <CheckCircle2 size={31} /> : info ? <TriangleAlert size={31} /> : <X size={31} />}
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">{state.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{state.message}</p>
        <button type="button" onClick={onClose} className="mt-6 rounded-2xl bg-[#1A56DB] px-6 py-3 text-sm font-black text-white">
          OK
        </button>
      </div>
    </div>
  );
}

function ClearConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <TriangleAlert size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Clear this form?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">The notice text will be removed from this page.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onCancel} className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white">
            Yes, clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecureFoundClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get('draft');
  const { session } = useSession();
  const { clearActions } = useAdminHeaderActions();
  const [form, setForm] = useState(createInitialForm);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const ownerName = session?.userName || 'JU System Admin';
  const ownerEmail = session?.email || 'admin@ju.edu.so';

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
        const { raw } = await fetchSecureDraftItemById(draftParam);
        if (cancelled) return;
        setEditingDraftId(raw.id);
        setForm(mapSecureDraftToReportForm(raw));
        setExistingImageUrl(resolveItemImageUrl(raw) || '');
      } catch (error) {
        if (cancelled) return;
        setNotice({
          type: 'error',
          title: 'Could not load draft',
          message: error?.message || 'This secure notice could not be opened.',
        });
        router.replace('/admin/secure-found');
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    }

    loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftParam, router]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: null }));
    }
  }

  function buildPayload() {
    const name = form.name.trim();
    const description = form.description.trim();
    const category = form.category || 'Other';

    return {
      itemName: name,
      category,
      description,
      location: STUDENT_AFFAIRS_OFFICE,
      reportDate: getLocalDateValue(),
      reportTime: getLocalTimeValue(),
      phone: '',
      publicNotice: description,
      publicCategory: category,
      securityLocation: STUDENT_AFFAIRS_OFFICE,
      finderName: ownerName,
      finderId: ownerEmail,
      email: ownerEmail,
      userId: ownerEmail,
    };
  }

  function validateFormFields() {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = 'Item name is required.';
    } else {
      const nameCheck = validateMeaningfulText(form.name, {
        fieldLabel: 'Item name',
        minLength: 3,
        minLetters: 2,
      });
      if (!nameCheck.valid) errors.name = nameCheck.message;
    }

    if (!form.category) {
      errors.category = 'Select a category.';
    }

    if (!form.description.trim()) {
      errors.description = 'Description / notice is required.';
    } else {
      const descCheck = validateMeaningfulText(form.description, {
        fieldLabel: 'Description',
        minLength: 10,
        minLetters: 4,
      });
      if (!descCheck.valid) errors.description = descCheck.message;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function resetToBlankForm({ stripDraftQuery = false } = {}) {
    setForm(createInitialForm());
    setEditingDraftId(null);
    setExistingImageUrl('');
    setFieldErrors({});
    if (stripDraftQuery && draftParam) {
      router.replace('/admin/secure-found');
    }
  }

  async function saveDraft() {
    const isValid = validateFormFields();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const wasUpdating = Boolean(editingDraftId);

      if (editingDraftId) {
        await updateAdminSecureFoundDraft(editingDraftId, payload, null, existingImageUrl);
      } else {
        await createAdminSecureFoundDraft(payload, null);
      }

      try {
        invalidateInventoryCaches();
      } catch {
        /* cache refresh is best-effort */
      }

      if (wasUpdating) {
        router.push('/admin/items');
        return;
      }

      resetToBlankForm({ stripDraftQuery: true });
      setNotice({
        type: 'success',
        title: 'Draft saved',
        message: 'Saved to Secure Drafts. Open Drafts to update or delete this notice.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Could not save draft',
        message: error?.message || 'Draft save failed.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(event) {
    event.preventDefault();
    const isValid = validateFormFields();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const wasEditingDraft = Boolean(editingDraftId);
      if (editingDraftId) {
        await publishAdminSecureFoundDraft(editingDraftId, payload, null, existingImageUrl || null);
      } else {
        await createAdminSecureFoundItem(payload, null);
      }
      try {
        invalidateInventoryCaches();
      } catch {
        /* cache refresh is best-effort */
      }

      if (wasEditingDraft) {
        router.push('/admin/items');
        return;
      }

      resetToBlankForm({ stripDraftQuery: true });
      setNotice({
        type: 'success',
        title: 'Published',
        message: 'Secure notice published to the mobile app.',
      });
    } catch (error) {
      setNotice({ type: 'error', title: 'Could not publish', message: error?.message || 'Publish failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleClearRequest() {
    if (isSecureFormEmpty(form) && !editingDraftId) {
      setNotice({
        type: 'info',
        title: 'Form is already empty',
        message: 'There is nothing to clear. Add an item name or description first.',
      });
      return;
    }
    setShowClearConfirm(true);
  }

  function clearForm() {
    setShowClearConfirm(false);
    resetToBlankForm({ stripDraftQuery: true });
  }

  if (loadingDraft) {
    return (
      <div className="glass-card flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8">
        <Loader2 size={32} className="animate-spin text-amber-600" />
        <p className="mt-4 text-sm font-semibold text-slate-600">Loading draft...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handlePublish} className="mx-auto max-w-3xl space-y-5">
      <div className="report-form-section rounded-[30px] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-white shadow-xl shadow-amber-500/25">
            !
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">Secure Lost Hold</h1>
            <p className="text-sm font-medium text-slate-500">
              {editingDraftId
                ? `Editing draft #${editingDraftId} — save or publish when ready.`
                : 'Post a short notice with item name and description.'}
            </p>
          </div>
        </div>
      </div>

      <section className="report-form-section rounded-[28px] p-6">
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-5xl font-black text-amber-700">
              !
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-amber-700">Secure mark</p>
          </div>

          <div className="space-y-4">
            <Field label="Item name" hint="Short name users must see first — e.g. Mobile phone, Gold, Wallet">
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Mobile phone"
                className={formInputClass(`h-12 w-full rounded-[18px] px-4 text-sm ${fieldErrors.name ? '!border-red-500 !ring-2 !ring-red-500/20' : ''}`)}
              />
              {fieldErrors.name ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.name}
                </p>
              ) : null}
            </Field>
            <Field label="Category" hint="Admin categories — includes Financial for high-value holds">
              <ReportSelect
                value={form.category}
                onChange={(category) => updateField('category', category)}
                options={ADMIN_CATEGORY_OPTIONS}
                placeholder="Select category"
                theme="amber"
              />
              {fieldErrors.category ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.category}
                </p>
              ) : null}
            </Field>
            <Field
              label="Description / notice"
              hint='Message for campus users — e.g. "Hadii uu ka maqan yahay nala soo xariir"'
            >
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value.slice(0, 280))}
                placeholder="Short message for campus users..."
                className={formInputClass(`min-h-[148px] w-full resize-none rounded-[18px] px-4 py-3 text-sm leading-6 ${fieldErrors.description ? '!border-red-500 !ring-2 !ring-red-500/20' : ''}`)}
              />
              <div className="flex items-center justify-between">
                <div>
                  {fieldErrors.description ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      <TriangleAlert size={14} className="shrink-0 text-red-500" /> {fieldErrors.description}
                    </p>
                  ) : null}
                </div>
                <span className="mt-1 block text-right text-xs text-slate-400">{form.description.length}/280</span>
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleClearRequest}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editingDraftId ? 'Update Draft' : 'Save Draft'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publish
          </button>
        </div>
      </section>

      <NoticeModal state={notice} onClose={() => setNotice(null)} />
      <ClearConfirmModal open={showClearConfirm} onCancel={() => setShowClearConfirm(false)} onConfirm={clearForm} />
    </form>
  );
}
