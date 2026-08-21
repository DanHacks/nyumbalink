import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriceTier, PropertyKind } from './types';
import { KIND_EMOJI, KIND_LABEL } from './types';

export interface Filters {
  kinds: PropertyKind[];
  houseTypes: string[];
  tiers: PriceTier[];
  minPrice: number | null;
  maxPrice: number | null;
  services: string[];
  availableOnly: boolean;
  verifiedOnly: boolean;
  videoOnly: boolean;
}

export const emptyFilters: Filters = {
  kinds: [],
  houseTypes: [],
  tiers: [],
  minPrice: null,
  maxPrice: null,
  services: [],
  availableOnly: false,
  verifiedOnly: false,
  videoOnly: false,
};

export const HOUSE_TYPES = [
  'Bedsitter', 'Single Room', 'Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom',
  '4 Bedroom', '5 Bedroom', 'Hostel Room', 'Double Room', 'Twin Room', 'Executive Room', 'Retail Unit',
];

export const SERVICES = [
  'Wi-Fi', 'Water 24/7', 'Parking', 'Security', 'CCTV', 'Guards', 'Backup Power',
  'Solar', 'Pool', 'Gym', 'Kitchen', 'Laundry', 'Workspace', 'Hot Shower', 'Restaurant', 'Lift', 'Cleaning', 'Electric Fence',
];

const TIERS: PriceTier[] = ['budget', 'standard', 'premium', 'luxury'];
const KINDS = Object.keys(KIND_LABEL) as PropertyKind[];

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
      )}
    >
      {children}
    </button>
  );
}

export default function FilterSheet({
  open,
  filters,
  onChange,
  onClose,
  resultCount,
}: {
  open: boolean;
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  resultCount: number;
}) {
  if (!open) return null;
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Filters</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close filters">
            <X className="h-5 w-5" />
          </button>
        </div>

        <Section title="Property type">
          {KINDS.map((k) => (
            <Chip key={k} active={filters.kinds.includes(k)} onClick={() => onChange({ ...filters, kinds: toggle(filters.kinds, k) })}>
              {KIND_EMOJI[k]} {KIND_LABEL[k]}
            </Chip>
          ))}
        </Section>

        <Section title="House type">
          {HOUSE_TYPES.map((h) => (
            <Chip key={h} active={filters.houseTypes.includes(h)} onClick={() => onChange({ ...filters, houseTypes: toggle(filters.houseTypes, h) })}>
              {h}
            </Chip>
          ))}
        </Section>

        <Section title="Price tier (local market percentiles)">
          {TIERS.map((t) => (
            <Chip key={t} active={filters.tiers.includes(t)} onClick={() => onChange({ ...filters, tiers: toggle(filters.tiers, t) })}>
              {t[0].toUpperCase() + t.slice(1)}
            </Chip>
          ))}
        </Section>

        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Price range (KES)</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice ?? ''}
              onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <span className="text-slate-400">—</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice ?? ''}
              onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <Section title="Services & amenities">
          {SERVICES.map((s) => (
            <Chip key={s} active={filters.services.includes(s)} onClick={() => onChange({ ...filters, services: toggle(filters.services, s) })}>
              {s}
            </Chip>
          ))}
        </Section>

        <Section title="Trust & availability">
          <Chip active={filters.availableOnly} onClick={() => onChange({ ...filters, availableOnly: !filters.availableOnly })}>
            Available now
          </Chip>
          <Chip active={filters.verifiedOnly} onClick={() => onChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}>
            Verified media only
          </Chip>
          <Chip active={filters.videoOnly} onClick={() => onChange({ ...filters, videoOnly: !filters.videoOnly })}>
            Has walkthrough video
          </Chip>
        </Section>

        <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-slate-100 bg-white px-5 pt-4">
          <button onClick={() => onChange(emptyFilters)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Reset
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700">
            Show {resultCount} homes
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
