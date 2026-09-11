'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Download,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  deleteStaffDirectoryRow,
  fetchStaffDirectory,
  uploadStaffDirectoryRows,
  upsertStaffDirectoryRow,
} from '@/lib/supabase';
import StatCard from '@/components/admin/StatCard';

const PAGE_SIZE = 10;

const swalBase = {
  width: 'min(440px, calc(100vw - 2rem))',
  padding: '1.75em',
  confirmButtonText: 'OK',
  confirmButtonColor: '#1A56DB',
  backdrop: 'rgba(15, 23, 42, 0.55)',
  heightAuto: false,
  allowOutsideClick: true,
};

function bumpSwalZIndex() {
  if (typeof document === 'undefined') return;
  const container = document.querySelector('.swal2-container');
  if (container) container.style.zIndex = '20000';
}

async function showSuccess(title, text) {
  await Swal.fire({ ...swalBase, icon: 'success', title, text });
  bumpSwalZIndex();
}

async function showError(title, text) {
  await Swal.fire({ ...swalBase, icon: 'error', title, text });
  bumpSwalZIndex();
}

function emptyForm() {
  return {
    staff_id: '',
    full_name: '',
    phone_number: '',
    email: '',
    department: '',
  };
}

function parseStaffCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one data row.');

  const split = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const idx = {
    staff_id: headers.findIndex((h) => ['staff_id', 'id', 'employee_id', 'emp_id'].includes(h)),
    full_name: headers.findIndex((h) => ['full_name', 'name', 'fullname'].includes(h)),
    phone_number: headers.findIndex((h) => ['phone_number', 'phone', 'mobile'].includes(h)),
    email: headers.findIndex((h) => ['email', 'mail'].includes(h)),
    department: headers.findIndex((h) => ['department', 'dept', 'office', 'unit'].includes(h)),
    status: headers.findIndex((h) => ['status'].includes(h)),
  };
  if (idx.staff_id < 0) throw new Error('CSV must include a staff_id (or id) column.');
  if (idx.full_name < 0) throw new Error('CSV must include a full_name (or name) column.');

  return lines.slice(1).map((line, index) => {
    const cols = split(line);
    const get = (key) => (idx[key] >= 0 ? cols[idx[key]] || '' : '');
    return {
      _index: index,
      staff_id: get('staff_id'),
      full_name: get('full_name'),
      phone_number: get('phone_number'),
      email: get('email'),
      department: get('department'),
      status: get('status') || 'pending',
    };
  });
}

function downloadStaffTemplate() {
  const csv = [
    'staff_id,full_name,phone_number,email,department,status',
    'STF001,Ahmed Ali,252612345678,ahmed@jazeerauniversity.edu.so,Student Affairs,pending',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'staff_directory_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function StaffDirectoryPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [setupHint, setSetupHint] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchStaffDirectory();
      setStaff(res.staff || []);
      setSummary(res.summary || null);
      setSetupHint(res.seeded === false ? res.message || '' : '');
    } catch (e) {
      await showError('Could not load staff', e.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    if (summary) {
      return {
        total: summary.total || 0,
        pending: summary.pending || 0,
        activated: summary.activated || 0,
      };
    }
    return {
      total: staff.length,
      pending: staff.filter((s) => s.status === 'pending').length,
      activated: staff.filter((s) => s.status === 'activated').length,
    };
  }, [staff, summary]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((row) => {
      const statusOk = statusFilter === 'all' || row.status === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      const hay = `${row.staff_id} ${row.full_name} ${row.department || ''} ${row.phone_number || ''} ${row.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [staff, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleSaveOne(e) {
    e.preventDefault();
    if (!form.staff_id.trim() || !form.full_name.trim()) {
      await showError('Missing fields', 'Staff ID and full name are required.');
      return;
    }
    try {
      setSaving(true);
      const saved = await upsertStaffDirectoryRow(form);
      const id = saved?.staff?.staff_id || form.staff_id.trim().toUpperCase();
      setForm(emptyForm());
      await load();
      await showSuccess('Saved', `${id} was added / updated in the staff directory.`);
    } catch (err) {
      await showError('Save failed', err.message || 'Could not save staff row.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    try {
      setSaving(true);
      const text = await file.text();
      const rows = parseStaffCsv(text);
      if (!rows.length) throw new Error('No data rows found.');
      const result = await uploadStaffDirectoryRows(rows);
      await load();
      const failed = Number(result.failed || 0);
      const inserted = Number(result.inserted || 0);
      if (failed > 0) {
        const sample = (result.errors || [])
          .slice(0, 5)
          .map((e) => `• ${e.staff_id || 'row'}: ${e.error}`)
          .join('\n');
        await Swal.fire({
          ...swalBase,
          icon: 'warning',
          title: 'Upload finished with errors',
          text: `Inserted ${inserted}. Failed ${failed}.${sample ? `\n\n${sample}` : ''}`,
        });
        bumpSwalZIndex();
      } else {
        await showSuccess('Uploaded', `Inserted ${inserted} staff row(s).`);
      }
    } catch (err) {
      await showError('Upload failed', err.message || 'Could not upload CSV.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(staffId) {
    const confirm = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: 'Delete staff row?',
      text: `Remove ${staffId} from the staff directory?`,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#DC2626',
    });
    bumpSwalZIndex();
    if (!confirm.isConfirmed) return;
    try {
      setSaving(true);
      await deleteStaffDirectoryRow(staffId);
      await load();
      await showSuccess('Deleted', `${staffId} removed.`);
    } catch (err) {
      await showError('Delete failed', err.message || 'Could not delete.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {setupHint ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {setupHint}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard compact icon="users" value={counts.total} label="Total Staff" subLabel="Staff directory" />
        <StatCard
          compact
          icon="alert"
          value={counts.pending}
          label="Pending"
          urgent={counts.pending > 0}
          trendLabel={counts.pending > 0 ? 'Not activated' : 'Queue clear'}
        />
        <StatCard
          compact
          icon="check"
          value={counts.activated}
          label="Activated"
          trendLabel="Linked accounts"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="glass-card overflow-hidden rounded-[28px] !p-0">
          <div className="flex flex-col gap-3 border-b border-white/50 bg-white/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, name, department…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="activated">Activated</option>
            </select>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-[#1A56DB] px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              <Upload size={15} />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={saving || loading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleUpload(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={downloadStaffTemplate}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            >
              <Download size={15} />
              Template
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Loading staff…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      No staff rows yet. Upload a CSV or add one on the right.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.staff_id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{row.full_name}</div>
                        <div className="text-xs font-semibold text-slate-500">{row.staff_id}</div>
                        {row.email ? (
                          <div className="text-xs text-slate-500">{row.email}</div>
                        ) : (
                          <div className="text-xs text-slate-400">No email</div>
                        )}
                        {row.phone_number ? (
                          <div className="text-xs text-slate-400">{row.phone_number}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {row.department || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            row.status === 'activated'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {row.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.staff_id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-500">
              {filtered.length} row(s) · page {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveOne} className="glass-card rounded-[28px] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-[#1A56DB]" />
            <h3 className="text-base font-black text-slate-900">Add / update staff</h3>
          </div>
          <p className="mb-4 text-xs font-medium leading-5 text-slate-500">
            Upserts by Staff ID. CSV columns: staff_id, full_name, phone_number, email, department, status.
          </p>
          <div className="space-y-3">
            {[
              ['staff_id', 'Staff ID', 'e.g. STF001'],
              ['full_name', 'Full name', 'Full name'],
              ['email', 'Email', 'name@jazeerauniversity.edu.so'],
              ['phone_number', 'Phone', 'Optional'],
              ['department', 'Department', 'e.g. Student Affairs'],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                  {label}
                </span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]/40"
                />
              </label>
            ))}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] text-sm font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? 'Saving…' : 'Save staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
