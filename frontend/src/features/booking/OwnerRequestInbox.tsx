import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Clock, Loader2, MessageSquare, X } from 'lucide-react';
import { bookingsApi } from '@/lib/api';
import { useRealtime, type RealtimeEvent } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { STATUS_COPY, formatSlot, minutesLeft, type BookingView, type RequestEvent } from './logic';

function initials(name?: string | null) {
  if (!name) return 'T';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

export default function OwnerRequestInbox() {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [proposing, setProposing] = useState<string | null>(null);
  const [proposalTime, setProposalTime] = useState('');

  const { data: bookings = [], isLoading } = useQuery<BookingView[]>({
    queryKey: ['owner-bookings'],
    queryFn: async () => (await bookingsApi.getMyPropertyBookings()).data,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useRealtime(
    useCallback(
      (event: RealtimeEvent) => {
        const e = event as unknown as RequestEvent;
        if (!e.type?.startsWith('booking_request') && e.type !== 'proposal_accepted' && e.type !== 'proposal_declined') return;
        qc.invalidateQueries({ queryKey: ['owner-bookings'] });
        if (e.type === 'booking_request') toast('New viewing request', { icon: '🔔' });
      },
      [qc],
    ),
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ['owner-bookings'] });

  const respond = async (id: string, body: { action: 'accept' | 'decline' | 'propose'; reason?: string; proposed_time_start?: string; proposed_time_end?: string }, ok: string) => {
    setBusyId(id);
    try {
      await bookingsApi.respond(id, body);
      toast.success(ok);
      setDeclining(null);
      setProposing(null);
      setReason('');
      setProposalTime('');
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Could not respond');
    } finally {
      setBusyId(null);
    }
  };

  const active = bookings.filter((b) => b.status === 'pending');
  const awaitingTenant = bookings.filter((b) => b.status === 'rescheduled');
  const recent = bookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in').slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading viewing requests…
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Viewing requests">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Viewing requests</h2>
          <p className="text-xs text-slate-500">
            Accept, decline or suggest a new time. Tenant pays nothing in the app — payment happens after you meet.
          </p>
        </div>
        {active.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{active.length} new</span>
        )}
      </div>

      {active.length === 0 && awaitingTenant.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No pending requests. New requests appear here instantly when a tenant taps “Request viewing”.
        </div>
      )}

      {active.map((b) => {
        const left = minutesLeft(b.expires_at, now);
        const expired = left === 0;
        return (
          <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/10 text-sm font-bold text-secondary">
                {initials(b.tenant_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-slate-900">{b.tenant_name ?? 'Tenant'}</p>
                  <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', expired ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800')}>
                    <Clock className="h-3 w-3" />
                    {expired ? 'Expired' : left != null ? `${left} min left` : 'Pending'}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {b.property_name} · {b.house_type?.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {formatSlot(b.scheduled_time_start, b.scheduled_time_end)}
                </p>
                {b.tenant_notes && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-slate-600">
                    <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /> {b.tenant_notes}
                  </p>
                )}
              </div>
            </div>

            {proposing === b.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={proposalTime}
                  onChange={(ev) => setProposalTime(ev.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                />
                <button
                  disabled={!proposalTime || busyId === b.id}
                  onClick={() => {
                    const start = new Date(proposalTime);
                    const end = new Date(start.getTime() + 30 * 60_000);
                    respond(b.id, {
                      action: 'propose',
                      proposed_time_start: start.toISOString(),
                      proposed_time_end: end.toISOString(),
                    }, 'New time sent to the tenant');
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  Send
                </button>
                <button onClick={() => setProposing(null)} className="text-xs font-semibold text-slate-500">
                  Cancel
                </button>
              </div>
            ) : declining === b.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  placeholder="Reason (shown to the tenant)"
                  maxLength={200}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                />
                <button
                  disabled={busyId === b.id}
                  onClick={() => respond(b.id, { action: 'decline', reason: reason || undefined }, 'Request declined')}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  Confirm decline
                </button>
                <button onClick={() => setDeclining(null)} className="text-xs font-semibold text-slate-500">
                  Back
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busyId === b.id || expired}
                  onClick={() => respond(b.id, { action: 'accept' }, 'Viewing confirmed')}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button
                  disabled={expired}
                  onClick={() => setProposing(b.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  <Clock className="h-3.5 w-3.5" /> New time
                </button>
                <button
                  disabled={expired}
                  onClick={() => setDeclining(b.id)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            )}
          </article>
        );
      })}

      {awaitingTenant.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Waiting on tenant</p>
          {awaitingTenant.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-amber-900">{b.tenant_name} · {b.property_name}</p>
                <p className="text-[11px] text-amber-800">
                  You proposed {formatSlot(b.proposed_time_start, b.proposed_time_end || null)}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">Sent</span>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming viewings</p>
          {recent.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-emerald-900">{b.tenant_name} · {b.property_name}</p>
                <p className="text-[11px] text-emerald-800">{formatSlot(b.scheduled_time_start, b.scheduled_time_end)}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                {STATUS_COPY[b.status]?.label ?? b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
