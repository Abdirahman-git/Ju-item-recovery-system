'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Bell,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import {
  fetchPortalNotifications,
  markPortalNotificationRead,
  markAllPortalNotificationsRead,
} from '@/lib/portal';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';

function NotificationThumb({ note, isUnread }) {
  const name = note.item_name || note.title || '';
  const category = note.category || '';
  const PlaceholderIcon = getItemPlaceholderIcon(name, category);

  if (note.imageURI) {
    return (
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <Image
          src={note.imageURI}
          alt={name || 'Item'}
          fill
          className="object-cover"
          sizes="48px"
        />
        {isUnread ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#1A56DB]" />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
        isUnread ? 'bg-blue-50 text-[#1A56DB]' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <PlaceholderIcon size={22} strokeWidth={1.6} />
      {isUnread ? (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#1A56DB]" />
      ) : null}
    </div>
  );
}

export default function PortalNotificationsPage() {
  const { session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!session?.email) return;
    setLoading(true);
    try {
      const data = await fetchPortalNotifications(session.email);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.email]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    if (!session?.email) return;
    try {
      await markPortalNotificationRead(id, session.email);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!session?.email) return;
    setMarkingAll(true);
    try {
      await markAllPortalNotificationsRead(session.email);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Notifications Inbox</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            Real-time updates regarding your reported items, matching activity, and claim reviews.
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#1A56DB]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center">
          <Bell size={40} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">Inbox is empty</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            You don&apos;t have any notifications at the moment. When items are reported or matched,
            you&apos;ll see alerts here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((note) => {
            const isUnread = !note.isRead;

            return (
              <div
                key={note.id}
                onClick={() => isUnread && handleMarkRead(note.id)}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 transition ${
                  isUnread
                    ? 'cursor-pointer border-blue-200 bg-blue-50/40 shadow-sm'
                    : 'border-slate-200/80 bg-white'
                }`}
              >
                <NotificationThumb note={note} isUnread={isUnread} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`truncate text-sm ${
                        isUnread ? 'font-black text-slate-950' : 'font-bold text-slate-800'
                      }`}
                    >
                      {note.title || 'System Notification'}
                    </h3>
                    <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                      {note.timeAgo}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {note.body || note.item_name || 'New update'}
                  </p>

                  {note.item_name ? (
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Item:</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                        {note.item_name}
                      </span>
                      {note.category ? (
                        <span className="rounded bg-slate-50 px-2 py-0.5 font-medium text-slate-500">
                          {note.category}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
