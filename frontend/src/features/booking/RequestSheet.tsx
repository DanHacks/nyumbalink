import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BadgeCheck, ChevronRight, Clock, Footprints, Loader2, MapPin, Navigation,
  QrCode, ShieldCheck, Wallet, X,
} from 'lucide-react';
import { bookingsApi } from '@/lib/api';
import { cn, formatCurrency, formatDistance } from '@/lib/utils';
import type { MapProperty } from '@/features/map/types';
import {
  STATUS_COPY, defaultViewingSlot, formatSlot, minutesLeft, type BookingView,
  type RequestTier,
} from './logic';

export type SheetStage =
  | { kind: 'choose' }
  | { kind: 'submitting' }
  | { kind: 'live'; booking: BookingView }
  | { kind: 'done'; booking: BookingView };

interface Props {
  tiers: RequestTier[];
  selectedTier: RequestTier['tier'] | null;
  onSelectTier: (tier: RequestTier['tier']) => void;
  stage: SheetStage;
  onRequest: (property: MapProperty, slot: { date: string; start: string; end: string }, notes: string) => void;
  liveStatus: 'online' | 'connecting' | 'offline';
  onDirections: (p: MapProperty) => void;
  onOpenProperty: (p: MapProperty) => void;
  onDismiss: () => void;
  busy: boolean;
  connectedOwnerIds?: string[];
}

function tierTone(tier: RequestTier['tier']) {
  return tier === 'budget'
    ? 'bg-slate-50 text-slate-700 border-slate-200'
    : tier === 'standard'
      ? 'bg-sky-50 text-sky-800 border-sky-200'
      : tier === 'premium'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : 'bg-violet-50 text-violet-900 border-violet-200';
}

function LiveDot({ state }: { state: Props['liveStatus'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          state === 'online' && 'bg-emerald-500',
          state === 'connecting' && 'animate-pulse bg-amber-500',
          state === 'offline' && 'bg-slate-300',
        )}
      />
      {state === 'online' ? 'Live' : state === 'connecting' ? 'Connecting' : 'Offline'}
    </span>
  );
}

function Timeline({ status }: { status: BookingView['status'] }) {
  const steps = [
    { key: 'requested', label: 'Request sent' },
    { key: 'owner', label: 'Owner responds' },
    { key: 'confirmed', label: 'Viewing confirmed' },
    { key: 'checkin', label: 'QR check-in at the door' },
  ];
  const reached =
    status === 'pending' ? 1
      : status === 'rescheduled' ? 1
        : status === 'confirmed' ? 3
          : status === 'checked_in' || status === 'completed' ? 4
            : 1;
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((s, i) => {
        const done = i < reached;
        const active = i === reached && (status === 'pending' || status === 'rescheduled');
        return (
          <li key={s.key} className="flex items-center gap-2.5 text-xs">
            <span
              className={cn(
                'grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold',
                done && 'border-emerald-500 bg-emerald-500 text-white',
                !done && active && 'border-primary bg-primary/10 text-primary',
                !done && !active && 'border-slate-200 bg-white text-slate-400',
              )}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={cn(done ? 'font-semibold text-slate-800' : active ? 'font-semibold text-slate-700' : 'text-slate-400')}>
              {s.label}
            </span>
            {active && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function RequestSheet({
  tiers,
  selectedTier,
  onSelectTier,
  stage,
  onRequest,
  liveStatus,
  onDirections,
  onOpenProperty,
  onDismiss,
  busy,
  connectedOwnerIds = [],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [slot, setSlot] = useState(() => defaultViewingSlot());
  const [notes, setNotes] = useState('');
  const [now, setNow] = useState(Date.now());
  const [proposing, setProposing] = useState(false);
  const [proposal, setProposal] = useState(() => defaultViewingSlot());

  const selected = useMemo(
    () => tiers.find((t) => t.tier === selectedTier) ?? null,
    [tiers, selectedTier],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (stage.kind === 'choose') setExpanded(false);
  }, [stage.kind]);

  if (stage.kind === 'live' || stage.kind === 'done') {
    return <LiveCard
      booking={stage.booking}
      liveStatus={liveStatus}
      now={now}
      proposing={proposing}
      setProposing={setProposing}
      proposal={proposal}
      setProposal={setProposal}
      onDismiss={onDismiss}
    />;
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[900] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[400px]">
      <div className="max-h-[52dvh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white/95 shadow-[0_-8px_40px_rgba(15,23,42,0.18)] backdrop-blur sm:max-h-none sm:overflow-visible sm:rounded-3xl sm:shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-slate-900">Find a home to view</p>
              <p className="text-[11px] text-slate-500">Pick a tier · request instantly</p>
            </div>
          </div>
          <LiveDot state={liveStatus} />
        </div>

        {/* Tier rail — the Uber/Bolt "ride options" row, houses instead of cars */}
        <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tiers.map((t) => (
            <button
              key={t.tier}
              onClick={() => {
                onSelectTier(t.tier);
                setExpanded(false);
              }}
              className={cn(
                'min-w-[104px] flex-1 rounded-2xl border-2 px-2.5 py-2 text-left transition',
                selectedTier === t.tier
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-slate-50 hover:border-slate-200',
              )}
              aria-pressed={selectedTier === t.tier}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">
                  {t.count}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">{t.label}</p>
              <p className="text-[13px] font-extrabold text-slate-900">{formatCurrency(t.fromPrice)}</p>
              <p className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <Footprints className="h-2.5 w-2.5" />
                {t.distanceKm == null ? 'city-wide' : `${formatDistance(t.distanceKm)}`} · {t.etaMin} min
              </p>
            </button>
          ))}
          {tiers.length === 0 && (
            <p className="px-1 py-3 text-[11px] leading-snug text-slate-500">
            No vacant homes pinned in this view yet. Zoom out or pan the map.
          </p>
          )}
        </div>

        {selected && (
          <div className="mt-2 px-4">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-slate-900">{selected.best.name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {selected.best.estate}, {selected.best.town} · {selected.best.houseType} · {selected.best.availableUnits} available
                </p>
              </div>
              <ChevronRight className={cn('h-4 w-4 shrink-0 text-slate-400 transition', expanded && 'rotate-90')} />
            </button>

            {expanded && (
              <div className="mt-2 space-y-3 rounded-xl border border-slate-100 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-600">Visit from</span>
                    <input
                      type="datetime-local"
                      value={slot.start}
                      onChange={(e) => {
                        const start = e.target.value;
                        const endDate = new Date(new Date(start).getTime() + 30 * 60_000);
                        const pad = (n: number) => String(n).padStart(2, '0');
                        setSlot({
                          date: start.slice(0, 10),
                          start,
                          end: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-600">Until</span>
                    <input
                      type="datetime-local"
                      value={slot.end}
                      onChange={(e) => setSlot((s) => ({ ...s, end: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    />
                  </label>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Anything the owner should know? (optional)"
                  className="w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    onOpenProperty(selected.best);
                  }}
                  className="text-[11px] font-semibold text-secondary hover:underline"
                >
                  See photos & full details →
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 p-3 pt-2 sm:p-4 sm:pt-3">
          <button
            disabled={!selected || busy}
            onClick={() => selected && onRequest(selected.best, slot, notes)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50 sm:py-3.5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            {busy ? 'Sending request…' : selected ? `Request viewing · ${formatCurrency(selected.best.price)}/mo` : 'Select a tier'}
          </button>
          <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-slate-500 sm:text-[11px]">
            <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              <span className="font-semibold text-slate-700">No payment now.</span> You only pay after you meet the owner in
              person. Owners usually respond in minutes.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function LiveCard({
  booking,
  liveStatus,
  now,
  proposing,
  setProposing,
  proposal,
  setProposal,
  onDismiss,
}: {
  booking: BookingView;
  liveStatus: Props['liveStatus'];
  now: number;
  proposing: boolean;
  setProposing: (v: boolean) => void;
  proposal: { date: string; start: string; end: string };
  setProposal: (v: { date: string; start: string; end: string }) => void;
  onDismiss: () => void;
}) {
  const copy = STATUS_COPY[booking.status];
  const left = minutesLeft(booking.expires_at, now);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[900] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[400px]">
      <div className="rounded-t-3xl border border-slate-200 bg-white/95 shadow-[0_-8px_40px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-3xl sm:shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full',
                copy.tone === 'good' && 'bg-emerald-500 text-white',
                copy.tone === 'wait' && 'bg-amber-500 text-white',
                copy.tone === 'bad' && 'bg-rose-500 text-white',
                copy.tone === 'done' && 'bg-slate-900 text-white',
                copy.tone === 'live' && 'bg-primary text-white',
              )}
            >
              {booking.status === 'confirmed' ? <BadgeCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-slate-900">{copy.label}</p>
              <p className="text-[11px] text-slate-500">{booking.property_name ?? 'Your viewing'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LiveDot state={liveStatus} />
            <button onClick={onDismiss} aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            {formatSlot(booking.scheduled_time_start, booking.scheduled_time_end)}
          </p>

          {booking.status === 'pending' && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Waiting for the owner to accept
              {left != null && <span className="ml-auto font-semibold text-slate-600">Expires in {left} min</span>}
            </p>
          )}

          {booking.status === 'rescheduled' && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-900">Owner suggested a new time</p>
              <p className="mt-0.5 text-xs text-amber-800">
                {formatSlot(booking.proposed_time_start, booking.proposed_time_end)}
              </p>
              {!proposing ? (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => act(() => bookingsApi.acceptProposal(booking.id), 'New time confirmed')}
                    className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setProposing(true)}
                    className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900"
                  >
                    Suggest another
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act(() => bookingsApi.declineProposal(booking.id), 'Request cancelled')}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-amber-900/70"
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <input
                    type="datetime-local"
                    value={proposal.start}
                    onChange={(e) => {
                      const start = e.target.value;
                      const endDate = new Date(new Date(start).getTime() + 30 * 60_000);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setProposal({
                        date: start.slice(0, 10),
                        start,
                        end: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
                      });
                    }}
                    className="w-full rounded-lg border border-amber-200 px-2 py-1.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProposing(false)}
                      className="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          () =>
                            bookingsApi.respond(booking.id, {
                              action: 'propose',
                              proposed_time_start: new Date(proposal.start).toISOString(),
                              proposed_time_end: new Date(proposal.end).toISOString(),
                            }),
                          'Time sent to the owner',
                        )
                      }
                      className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      Send time
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {booking.status === 'confirmed' && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <QrCode className="h-3.5 w-3.5" /> Your check-in code is ready
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-800">
                Show the code at the door. Check-in only unlocks within 150 m of the property.
              </p>
              <Link
                to="/viewings"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 underline-offset-2 hover:underline"
              >
                Open my viewings <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {booking.status === 'cancelled' && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {booking.decline_reason || booking.owner_notes || 'This request was cancelled.'}
            </p>
          )}

          <Timeline status={booking.status} />

          <div className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Pay nothing in the app. Payment is arranged with the owner after you meet.</span>
          </div>
        </div>

        <div className="flex gap-2 p-4 pt-3">
          <button
            onClick={() => onDismiss()}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Back to map
          </button>
          {booking.status !== 'cancelled' && (
            <button
              disabled={busy}
              onClick={() => act(() => bookingsApi.cancel(booking.id, 'Cancelled by tenant'), 'Request cancelled')}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Cancel request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DirectionsShortcut({ property, onDirections }: { property: MapProperty; onDirections: (p: MapProperty) => void }) {
  return (
    <button
      onClick={() => onDirections(property)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-white"
    >
      <Navigation className="h-3.5 w-3.5" /> Directions
    </button>
  );
}
