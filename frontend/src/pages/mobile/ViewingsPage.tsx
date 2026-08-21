import { CalendarCheck, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import { cn } from '@/lib/utils';

export interface ViewingRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  area: string;
  slot: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export const STATUS_STYLE: Record<ViewingRequest['status'], string> = {
  REQUESTED: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-teal-50 text-teal-700',
  ON_THE_WAY: 'bg-sky-50 text-sky-700',
  ARRIVED: 'bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-800',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
};

export default function ViewingsPage() {
  const viewings = useLocalCollection<ViewingRequest>('nl.viewings');

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <h1 className="text-lg font-bold text-slate-900">Viewings</h1>
      <p className="mb-4 text-sm text-slate-500">
        Book a viewing, travel, arrive and confirm what you actually saw. Never pay before a physical visit.
      </p>

      {viewings.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-slate-400" aria-hidden />
          <p className="font-semibold text-slate-800">No viewings booked</p>
          <p className="mt-1 text-sm text-slate-500">Open a property and request a time with the verified caretaker.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Find a property
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {viewings.items.map((v) => (
          <article key={v.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">{v.propertyName}</h2>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {v.area}
                </p>
              </div>
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_STYLE[v.status])}>
                {v.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Clock className="h-4 w-4" aria-hidden /> {v.slot}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to={`/properties/${v.propertyId}`}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-center text-sm font-semibold text-white"
              >
                View property
              </Link>
              <button
                onClick={() => viewings.add({ ...v, status: 'CANCELLED' })}
                className="rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}