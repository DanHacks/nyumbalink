import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { notificationsApi } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  is_read: boolean;
  created_at: string;
  reference_id?: string | null;
  reference_type?: string | null;
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

function deepLink(n: Notification): string | null {
  if (n.reference_type === 'booking' && n.reference_id) return '/bookings';
  if (n.reference_type === 'conversation' && n.reference_id) return '/messages';
  if (n.reference_type === 'property' && n.reference_id) return `/properties/${n.reference_id}`;
  if (n.type.startsWith('new_message')) return '/messages';
  if (n.type.startsWith('booking')) return '/bookings';
  return null;
}

const PREF_FIELDS = [
  { key: 'booking_reminders', label: 'Booking reminders' },
  { key: 'message_alerts', label: 'Message alerts' },
  { key: 'review_alerts', label: 'Review alerts' },
  { key: 'scam_report_updates', label: 'Safety report updates' },
  { key: 'vacancy_alerts', label: 'Vacancy alerts' },
  { key: 'price_drop_alerts', label: 'Price drop alerts' },
  { key: 'promotional_emails', label: 'Promotional emails' },
];

export default function NotificationsPage() {
  usePageMeta('Notifications');
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

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

  const loadPrefs = async () => {
    try {
      const res = await notificationsApi.getPreferences();
      setPrefs(res.data);
    } catch {
      /* ignore */
    }
  };

  const togglePref = async (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await notificationsApi.updatePreferences({ [key]: next[key] });
    } catch {
      toast.error('Could not save preference');
      loadPrefs();
    }
  };

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
        <button
          onClick={() => {
            setShowPrefs((s) => !s);
            if (!showPrefs) loadPrefs();
          }}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
        >
          <Settings className="h-4 w-4" /> Preferences
        </button>
      </div>

      {showPrefs && (
        <div className="mt-4 rounded-xl border p-4">
          <h2 className="font-semibold mb-3">Notification preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PREF_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm">
                <span>{f.label}</span>
                <input type="checkbox" checked={!!prefs[f.key]} onChange={() => togglePref(f.key)} className="h-4 w-4" />
              </label>
            ))}
          </div>
        </div>
      )}

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
          {filtered.map((n) => {
            const link = deepLink(n);
            return (
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
                  {link && (
                    <Link to={link} onClick={() => !n.is_read && markRead(n.id)} className="mt-1 inline-block text-sm text-primary hover:underline">
                      View →
                    </Link>
                  )}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
