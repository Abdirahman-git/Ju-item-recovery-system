'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { deleteAdminUser, fetchAdminUsers, updateAdminUserApproval } from '@/lib/supabase';
import { buildUsersPageSparklines } from '@/lib/pageSparklines';
import StatCard from '@/components/admin/StatCard';
import { useBackgroundFetch } from '@/hooks/useBackgroundFetch';
import { useSession } from '@/context/SessionProvider';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/session';

const PAGE_SIZE = 8;

const TABS = [
  { id: 'all', label: 'All Users' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'admins', label: 'Admins' },
];

function userFaculty(user) {
  return String(user?.faculty || '').trim();
}

function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function StatusBadge({ user }) {
  const isAdmin = user.role === 'admin';
  const isActive = user.is_approved === true;
  const className = isAdmin
    ? 'border-violet-200/60 bg-violet-500/10 text-violet-700'
    : isActive
      ? 'border-emerald-200/60 bg-emerald-500/10 text-emerald-700'
      : 'border-amber-200/60 bg-amber-500/10 text-amber-700';

  return (
    <span className={`glass-badge inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${className}`}>
      {isAdmin ? 'Admin' : isActive ? 'Active' : 'Pending'}
    </span>
  );
}

function UserConfirmModal({ action, processing, onCancel, onConfirm }) {
  if (!action) return null;

  const { type, user } = action;
  const name = user.name || user.email || 'this user';
  const isDelete = type === 'delete';
  const isSuspend = type === 'suspend';
  const title = isDelete ? 'Delete this user?' : isSuspend ? 'Suspend this account?' : 'Approve this account?';
  const message = isDelete
    ? `Delete ${name}'s account from the user directory. This only removes the account record.`
    : isSuspend
      ? `Suspend ${name}'s account. They will not be able to access the system until an admin approves them again.`
      : `Approve ${name}'s account and allow them to access the system.`;
  const confirmLabel = isDelete ? 'Delete user' : isSuspend ? 'Suspend account' : 'Approve account';
  const Icon = isDelete ? Trash2 : isSuspend ? XCircle : CheckCircle2;
  const iconClass = isDelete
    ? 'bg-slate-100 text-slate-800'
    : isSuspend
      ? 'bg-amber-50 text-amber-600'
      : 'bg-emerald-50 text-emerald-600';
  const confirmClass = isDelete
    ? 'bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] hover:bg-slate-800'
    : isSuspend
      ? 'bg-amber-500 text-white shadow-[0_18px_40px_rgba(245,158,11,0.24)] hover:bg-amber-600'
      : 'bg-emerald-600 text-white shadow-[0_18px_40px_rgba(5,150,105,0.24)] hover:bg-emerald-700';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-md">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/80 bg-white/90 text-center shadow-[0_28px_90px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
        <div className="px-8 pb-8 pt-9">
          <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${iconClass}`}>
            <Icon size={34} strokeWidth={2.2} />
          </div>
          <h3 className="text-[1.65rem] font-black tracking-tight text-slate-950">{title}</h3>
          <p className="mx-auto mt-3 max-w-[430px] text-[1.02rem] font-medium leading-7 text-slate-500">{message}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50/70 px-7 py-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="h-14 rounded-2xl border border-slate-200 bg-white text-base font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className={`h-14 rounded-2xl text-base font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${confirmClass}`}
          >
            {processing ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AllUsersClient() {
  const { session, logout } = useSession();
  const { data, error, refresh, patchData } = useBackgroundFetch(
    'admin:users',
    fetchAdminUsers,
    { fallback: [] }
  );
  const users = Array.isArray(data) ? data : [];
  const [sparkPlayKey, setSparkPlayKey] = useState(0);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [busyEmail, setBusyEmail] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionError, setActionError] = useState('');

  const isSuperAdmin = checkSuperAdmin(session);

  const counts = useMemo(() => {
    const admins = users.filter((user) => user.role === 'admin').length;
    const students = users.filter((user) => user.role !== 'admin');
    return {
      all: users.length,
      active: students.filter((user) => user.is_approved === true).length,
      pending: students.filter((user) => user.is_approved !== true).length,
      admins,
    };
  }, [users]);

  const sparklines = useMemo(() => buildUsersPageSparklines(users), [users]);

  useEffect(() => {
    setSparkPlayKey((k) => k + 1);
  }, []);

  const handleRefresh = () => {
    refresh();
    setSparkPlayKey((k) => k + 1);
  };

  const facultyOptions = useMemo(() => {
    const set = new Set();
    users.forEach((user) => {
      const faculty = userFaculty(user);
      if (faculty) set.add(faculty);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const isAdmin = user.role === 'admin';
      const isActive = user.is_approved === true;
      const matchesTab =
        tab === 'all' ||
        (tab === 'admins' && isAdmin) ||
        (tab === 'active' && !isAdmin && isActive) ||
        (tab === 'pending' && !isAdmin && !isActive);

      const faculty = userFaculty(user);
      const matchesFaculty =
        facultyFilter === 'all' ||
        (facultyFilter === 'unassigned' && !faculty) ||
        faculty === facultyFilter;

      const matchesSearch =
        !q ||
        user.name?.toLowerCase().includes(q) ||
        user.student_id?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.phone?.toLowerCase?.().includes(q) ||
        faculty.toLowerCase().includes(q);

      return matchesTab && matchesFaculty && matchesSearch;
    });
  }, [users, search, tab, facultyFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, tab, facultyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdminActionError = (err) => {
    const msg = err?.message || 'Action failed.';
    const needsRelogin =
      err?.code === 'ADMIN_TOKEN_MISSING' ||
      err?.code === 'ADMIN_TOKEN_EXPIRED' ||
      /log in again|session expired|Admin session/i.test(msg);
    if (needsRelogin) {
      setConfirmAction(null);
      logout();
      return;
    }
    setActionError(msg);
  };

  const toggleApproval = async (user) => {
    const next = !user.is_approved;
    setBusyEmail(user.email);
    setActionError('');
    try {
      await updateAdminUserApproval(user.email, next);
      patchData((current) => current.map((row) => (row.email === user.email ? { ...row, is_approved: next } : row)));
      setConfirmAction(null);
    } catch (err) {
      handleAdminActionError(err);
    } finally {
      setBusyEmail('');
    }
  };

  const removeUser = async (user) => {
    setBusyEmail(user.email);
    setActionError('');
    try {
      await deleteAdminUser(user.email, { deletedBy: session?.email || session?.userName || null });
      patchData((current) => current.filter((row) => row.email !== user.email));
      setConfirmAction(null);
    } catch (err) {
      handleAdminActionError(err);
    } finally {
      setBusyEmail('');
    }
  };

  const confirmCurrentAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete') {
      await removeUser(confirmAction.user);
      return;
    }
    await toggleApproval(confirmAction.user);
  };

  if (error && users.length === 0) {
    return (
      <div className="glass-card flex min-h-[460px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1A56DB]">
          <XCircle size={24} />
        </div>
        <h2 className="text-xl font-black text-slate-950">Could not load users</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button type="button" onClick={refresh} className="mt-5 rounded-2xl bg-[#1A56DB] px-5 py-2.5 text-sm font-black text-white">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {actionError}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={0}
          icon="users"
          value={counts.all}
          label="Total Members"
          trendLabel={`${counts.active} active`}
          subLabel="Campus directory"
          sparkData={sparklines.total}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={1}
          icon="check"
          value={counts.active}
          label="Active Accounts"
          trendLabel="Approved users"
          sparkData={sparklines.active}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={2}
          icon="alert"
          value={counts.pending}
          label="Pending Approval"
          urgent={counts.pending > 0}
          trendLabel={counts.pending > 0 ? 'Needs review' : 'Queue clear'}
          sparkData={sparklines.pending}
        />
        <StatCard
          compact
          playKey={sparkPlayKey}
          sparkIndex={3}
          icon="users"
          value={counts.admins}
          label="System Admins"
          trendLabel="Admin access"
          subLabel="Full permissions"
          sparkData={sparklines.admins}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-[22px] border border-white/60 bg-white/20 p-1 backdrop-blur-xl">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-[14px] px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                tab === item.id ? 'glass-tab-active text-slate-900' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
              }`}
            >
              {item.label} ({counts[item.id]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={facultyFilter}
            onChange={(event) => setFacultyFilter(event.target.value)}
            className="glass-input h-10 min-w-[190px] rounded-[18px] px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15"
            aria-label="Filter by department"
          >
            <option value="all">All departments</option>
            {facultyOptions.map((faculty) => (
              <option key={faculty} value={faculty}>
                {faculty}
              </option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
          <label className="relative min-w-[260px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID, name, department..."
              className="glass-input h-10 w-full rounded-[18px] pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#1A56DB]/15 lg:w-[360px]"
            />
          </label>
          <button
            type="button"
            onClick={handleRefresh}
            className="glass-button flex h-10 w-10 items-center justify-center rounded-[18px] text-slate-500 transition hover:text-[#1A56DB]"
            aria-label="Refresh users"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/40 bg-white/[0.12] text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">User</th>
                <th className="px-4 py-4">ID</th>
                <th className="px-4 py-4">Department</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-500">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const busy = busyEmail === user.email;
                  return (
                    <tr key={user.email} className="glass-row-hover border-b border-white/30 transition last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/45 text-sm font-black text-[#1A56DB] shadow-sm">
                            {isAdmin ? <ShieldCheck size={18} /> : initials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-slate-900">{user.name || 'Unnamed user'}</p>
                            <p className="text-xs font-semibold text-slate-400">{isAdmin ? 'System administrator' : 'User account'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{user.student_id || 'N/A'}</td>
                      <td className="px-4 py-4">
                        <p className="max-w-[180px] truncate font-semibold text-slate-700">
                          {userFaculty(user) || (isAdmin ? 'Administration' : 'Unassigned')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="truncate font-semibold text-slate-700">{user.email || 'No email'}</p>
                        <p className="text-xs text-slate-400">{user.phone || 'No phone listed'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge user={user} />
                      </td>
                      <td className="px-5 py-4">
                        {isAdmin ? (
                          <div className="text-center text-xs font-bold text-slate-400">Protected</div>
                        ) : isSuperAdmin ? (
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmAction({ type: user.is_approved ? 'suspend' : 'approve', user })}
                              className="glass-button inline-flex h-8 min-w-[96px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-700 transition hover:bg-white/70 disabled:opacity-50"
                            >
                              {user.is_approved ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                              {user.is_approved ? 'Suspend' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmAction({ type: 'delete', user })}
                              className="glass-button inline-flex h-8 min-w-[82px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-red-600 transition hover:bg-red-50/80 disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-xs font-bold text-slate-400">View Only</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 px-5 py-3">
          <p className="text-sm text-slate-500">
            Showing <span className="font-black text-slate-800">{pageItems.length}</span> of{' '}
            <span className="font-black text-slate-800">{filtered.length}</span> users
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  page === number ? 'bg-[#0759B8] text-white' : 'glass-button text-slate-600 hover:bg-white/70'
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-full text-slate-500 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
      <UserConfirmModal
        action={confirmAction}
        processing={Boolean(busyEmail)}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmCurrentAction}
      />
    </div>
  );
}
