import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock } from 'lucide-react';
import { notificationsApi, bookingsApi } from '@/lib/api';
import { useRealtime, type RealtimeEvent } from '@/lib/realtime';
import { useAuthStore } from '@/store/authStore';

const OWNER_ROLES = new Set(['owner', 'caretaker', 'agent', 'host', 'manager']);

function Badge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={
        'absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ' +
        className
      }
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

/** Header icons that update live: owner viewing requests + notifications. */
export default function HeaderBadges() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOwner = !!user?.role && OWNER_ROLES.has(user.role);

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => (await notificationsApi.unreadCount()).data.unread_count as number,
    refetchInterval: 60_000,
  });

  const { data: bookings } = useQuery({
    queryKey: ['owner-bookings'],
    queryFn: async () => (await bookingsApi.getMyPropertyBookings()).data,
    enabled: isOwner,
  });

  useRealtime(
    useCallback(
      (event: RealtimeEvent) => {
        if (event.type === 'new_message' || event.type === 'messages_read') {
          qc.invalidateQueries({ queryKey: ['notifications-unread'] });
        }
        if (event.type === 'booking_request' || event.type === 'proposal_accepted') {
          qc.invalidateQueries({ queryKey: ['owner-bookings'] });
        }
      },
      [qc],
    ),
  );

  const pendingCount = isOwner
    ? (bookings ?? []).filter((b: { status: string }) => b.status === 'pending').length
    : 0;

  return (
    <>
      {isOwner && (
        <Link
          to="/dashboard"
          aria-label={`Viewing requests${pendingCount ? `, ${pendingCount} waiting` : ''}`}
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-50"
        >
          <CalendarClock className="h-[18px] w-[18px]" aria-hidden />
          <Badge count={pendingCount} />
        </Link>
      )}
      {user && (
        <Link
          to="/notifications"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-50"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          <Badge count={unread ?? 0} />
        </Link>
      )}
    </>
  );
}
