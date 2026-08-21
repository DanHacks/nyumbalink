import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { MapProperty } from '@/features/map/types';
import { marketPosition } from './marketStats';
import { formatCurrency, cn } from '@/lib/utils';

const STYLE = {
  below: { label: 'Below local range', className: 'text-emerald-700', Icon: TrendingDown },
  within: { label: 'Within typical range', className: 'text-slate-700', Icon: Minus },
  above: { label: 'Above local range', className: 'text-amber-700', Icon: TrendingUp },
} as const;

export default function PriceIntelligence({
  property,
  all,
  className,
}: {
  property: MapProperty;
  all: MapProperty[];
  className?: string;
}) {
  const stats = marketPosition(property, all);
  if (!stats) return null;

  const { label, className: tone, Icon } = STYLE[stats.verdict];
  const span = Math.max(1, stats.high - stats.low);
  const offset = Math.min(100, Math.max(0, ((property.price - stats.low) / span) * 100));

  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Market position</h3>
          <p className="text-xs text-slate-500">
            {stats.sample} comparable {property.houseType.toLowerCase()} listings in {property.town}
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', tone)}>
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      </div>

      <div className="mt-4">
        <div className="relative h-1.5 rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-slate-200" />
          <div
            className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
            style={{ left: `${offset}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{formatCurrency(stats.low)}</span>
          <span>Local range</span>
          <span>{formatCurrency(stats.high)}</span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        This listing is {formatCurrency(property.price)}/{property.priceUnit}, approximately{' '}
        <strong>{Math.abs(stats.delta)}% {stats.delta >= 0 ? 'above' : 'below'}</strong> the local median of{' '}
        {formatCurrency(stats.median)}. Based on listings currently on NyumbaLink — not an appraisal.
      </p>
    </section>
  );
}