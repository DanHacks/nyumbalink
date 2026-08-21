import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { notificationsApi } from '@/lib/api';
import EmptyState from '@/components/EmptyState';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  is_read: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Bookings',
  viewing: 'Viewings',
  new_message: 'Messages',
  payment: 'Payments',
  verification: 'Verification',
  report: 'Reports',
  security: 'Security',
};

function categoryOf(type: string) {
  return CATEGORY_LABELS[type.split(/[_-]/)[0]] || 'System';
}

export default function NotificationsPage() {
  usePageMeta('Notifications');
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const response = await notificationsApi.list();
      setItems(response.data.notifications ?? []);
      setUnreadCount(response.data.unread_count ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await notificationsApi.markRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      load();
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      load();
    }
  };

  const categories = ['all', ...Array.from(new Set(items.map((n) => categoryOf(n.type))))];
  const filtered = filter === 'all' ? items : items.filter((n) => categoryOf(n.type) === filter);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Bell className="h-7 w-7" /> Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">
              {unreadCount} new
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === c ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="No notifications yet" message="Booking updates, messages and verification news will appear here." />
      ) : (
        <ul className="mt-6 space-y-2">
          {filtered.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 transition ${n.is_read ? '' : 'border-primary/40 bg-green-50/40'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {categoryOf(n.type)}
                  </p>
                  <p className="mt-0.5 font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
