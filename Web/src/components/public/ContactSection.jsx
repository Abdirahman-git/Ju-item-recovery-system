'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, Package } from 'lucide-react';
import Swal from 'sweetalert2';
import RevealOnScroll from '@/components/public/RevealOnScroll';
import { submitContactMessage } from '@/lib/supabase';

const inputClass = 'public-contact-input';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  studentId: '',
  itemName: '',
  place: '',
  message: '',
};

const REQUIRED_FIELDS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Student / staff email' },
  { key: 'phone', label: 'Phone' },
  { key: 'studentId', label: 'Student ID' },
  { key: 'itemName', label: 'Item name' },
  { key: 'place', label: 'Campus place' },
  { key: 'message', label: 'Tell us what happened' },
];

const swalBase = {
  width: 'min(420px, calc(100vw - 2rem))',
  padding: '1.75em',
  confirmButtonText: 'OK',
  confirmButtonColor: '#1A56DB',
  backdrop: 'rgba(15, 23, 42, 0.55)',
  heightAuto: false,
  allowOutsideClick: true,
  customClass: {
    container: 'ju-swal-container',
    popup: 'ju-swal-popup',
    title: 'ju-swal-title',
    htmlContainer: 'ju-swal-text',
    confirmButton: 'ju-swal-confirm',
  },
};

function bumpSwalZIndex() {
  if (typeof document === 'undefined') return;
  const container = document.querySelector('.swal2-container');
  if (container) container.style.zIndex = '20000';
}

function showWarning(title, text) {
  return Swal.fire({
    ...swalBase,
    icon: 'warning',
    title,
    text,
    didOpen: bumpSwalZIndex,
  });
}

function showSuccess(title, text) {
  return Swal.fire({
    ...swalBase,
    icon: 'success',
    iconColor: '#059669',
    title,
    text,
    didOpen: bumpSwalZIndex,
  });
}

function showError(title, text) {
  return Swal.fire({
    ...swalBase,
    icon: 'error',
    title,
    text,
    didOpen: bumpSwalZIndex,
  });
}

export default function ContactSection() {
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const missing = REQUIRED_FIELDS.filter((field) => !String(form[field.key] || '').trim());
    if (missing.length > 0) {
      const text =
        missing.length >= 3
          ? 'Please complete all fields before sending your message to the Lost & Found desk.'
          : `Please fill in: ${missing.map((f) => f.label).join(', ')}.`;
      await showWarning('Form incomplete', text);
      return;
    }

    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await showWarning('Invalid email', 'Please enter a valid student or staff email address.');
      return;
    }

    setSending(true);
    setSubmitFeedback(null);

    const subject = form.itemName.trim()
      ? `LOFO contact · ${form.itemName.trim()}`
      : 'LOFO contact';

    const messageBody = [
      form.message.trim(),
      '',
      '— Lost & Found details —',
      form.itemName.trim() ? `Item: ${form.itemName.trim()}` : null,
      form.place.trim() ? `Campus place: ${form.place.trim()}` : null,
      `Student ID: ${form.studentId.trim()}`,
    ]
      .filter(Boolean)
      .join('\n');

    let succeeded = false;
    let errorText = null;

    try {
      await submitContactMessage({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        subject,
        message: messageBody,
      });
      succeeded = true;
      setForm(EMPTY);
      setSubmitFeedback({
        type: 'success',
        text: 'Your message has been sent. The JU Lost & Found desk will review it soon.',
      });
    } catch (err) {
      errorText = err?.message || 'Please try again in a moment.';
      setSubmitFeedback({
        type: 'error',
        text: errorText,
      });
    } finally {
      setSending(false);
    }

    if (succeeded) {
      requestAnimationFrame(() => {
        document.getElementById('contact-submit-feedback')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
      void showSuccess(
        'Message sent',
        'Your message has been sent. The JU Lost & Found desk will review it soon.'
      );
    } else if (errorText) {
      void showError('Could not send', errorText);
    }
  };

  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 xl:px-8">
      <RevealOnScroll>
        <div className="mb-8 max-w-2xl sm:mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1A56DB]">
            Lost & Found desk
          </p>
          <h2 className="mt-2 text-balance text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
            Need help recovering a campus item?
          </h2>
          <p className="mt-2 text-pretty text-sm font-medium text-slate-600 sm:text-base">
            Message the JU LOFO office about a lost or found item, a claim, or app support.
            New reports still start in the mobile app.
          </p>
        </div>
      </RevealOnScroll>

      {/* Image + form: close together, form vertically centered */}
      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-center lg:gap-6 xl:gap-8">
        <RevealOnScroll className="w-full max-w-[360px] shrink-0 sm:max-w-[400px] lg:w-[42%] lg:max-w-[420px]">
          <div className="public-contact-campus relative w-full">
            <Image
              src="/ju-best.png"
              alt="Jazeera University campus"
              width={1024}
              height={1536}
              className="public-contact-campus-img h-auto w-full select-none"
              sizes="(max-width: 1024px) 400px, 420px"
              priority
            />
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={70} className="w-full min-w-0 flex-1 lg:max-w-[520px]">
          <form
            noValidate
            onSubmit={onSubmit}
            className="public-contact-form flex w-full flex-col rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.07)] sm:p-6 lg:p-7"
          >
            {submitFeedback ? (
              <div
                id="contact-submit-feedback"
                role="status"
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  submitFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                {submitFeedback.text}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">
                First name
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  placeholder="Your first name"
                  disabled={sending}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Last name
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  placeholder="Your last name"
                  disabled={sending}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">
                Student / staff email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="name@jazeerauniversity.edu.so"
                  disabled={sending}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Phone
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="+252…"
                  disabled={sending}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              Student ID
              <input
                name="studentId"
                value={form.studentId}
                onChange={onChange}
                placeholder="CS13..."
                disabled={sending}
                className={inputClass}
              />
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">
                Item name
                <input
                  name="itemName"
                  value={form.itemName}
                  onChange={onChange}
                  placeholder="e.g. Black AirPods, ID card…"
                  disabled={sending}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Campus place
                <span className="public-contact-field-icon mt-1.5 block">
                  <MapPin
                    size={15}
                    aria-hidden
                    className="public-contact-field-icon-svg text-slate-400"
                  />
                  <input
                    name="place"
                    value={form.place}
                    onChange={onChange}
                    placeholder="Library, Block A, cafeteria…"
                    disabled={sending}
                    className={`${inputClass} public-contact-input--icon !mt-0`}
                  />
                </span>
              </label>
            </div>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              Tell us what happened
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                rows={4}
                placeholder="Describe the item, when you lost/found it, and how we can help…"
                disabled={sending}
                className={`${inputClass} min-h-[110px] resize-y`}
              />
            </label>

            <button
              type="submit"
              disabled={sending}
              className="public-press mt-5 inline-flex w-full min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1A56DB] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(26,86,219,0.3)] transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Package size={16} strokeWidth={2.2} />
              {sending ? 'Sending to LOFO desk…' : 'Send to Lost & Found desk'}
            </button>
          </form>
        </RevealOnScroll>
      </div>
    </section>
  );
}
