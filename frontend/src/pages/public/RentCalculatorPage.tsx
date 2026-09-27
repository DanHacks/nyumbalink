import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, Wallet, PiggyBank, KeyRound, ArrowRight, Info, GraduationCap, Briefcase,
} from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAllProperties } from '@/features/map/useAllProperties';
import { buildTierIndex } from '@/features/map/logic';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import { Reveal, CountUp } from '@/components/motion';
import { formatCurrency } from '@/lib/utils';

const round500 = (n: number) => Math.floor(n / 500) * 500;

export default function RentCalculatorPage() {
  usePageMeta(
    'Rent affordability calculator',
    'Work out the rent you can actually afford, the deposit you need and see verified homes inside your budget.',
  );

  const [mode, setMode] = useState<'working' | 'student'>('working');
  const [incomeRaw, setIncomeRaw] = useState('');
  const [commitRaw, setCommitRaw] = useState('');
  const [weeklyRaw, setWeeklyRaw] = useState('');

  const { data } = useAllProperties();
  const all = useMemo(() => (data?.items ?? []).filter((p) => p.safety !== 'blacklisted'), [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);

  const income = Math.max(0, Number(incomeRaw.replace(/[^\d]/g, '')) || 0);
  const commitments = mode === 'working' ? Math.max(0, Number(commitRaw.replace(/[^\d]/g, '')) || 0) : 0;
  const weekly = Math.max(0, Number(weeklyRaw.replace(/[^\d]/g, '')) || 0);

  const disposable = Math.max(income - commitments, 0);
  // Standard housing cost-burden rule: ≤30% of net income. Students live off
  // an allowance where housing is the primary cost, so a slightly higher cap applies.
  const rate = mode === 'student' ? 0.35 : 0.3;
  const maxRent = round500(disposable * rate);
  const recommended = round500(maxRent * 0.9);
  const upfront = recommended * 2; // deposit + first month
  const weeksToSave = weekly > 0 && upfront > 0 ? Math.ceil(upfront / weekly) : null;
  const ready = income > 0 && maxRent > 0;

  const matches = useMemo(
    () =>
      ready
        ? all
            .filter((p) => p.price <= recommended && p.availableUnits > 0)
            .sort((a, b) => b.trustScore - a.trustScore || b.rating - a.rating)
        : [],
    [all, ready, recommended],
  );

  const housingShare = income > 0 ? Math.min(100, Math.round((recommended / income) * 100)) : 0;
  const commitShare = income > 0 ? Math.min(100 - housingShare, Math.round((commitments / income) * 100)) : 0;
  const restShare = Math.max(0, 100 - housingShare - commitShare);

  return (
    <div className="bg-slate-50">
      {/* Header band */}
      <section className="bg-secondary text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Pre-qualify your budget</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight lg:text-4xl">Rent affordability calculator</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Enter your income or monthly school budget. We will show the rent you can genuinely afford, the
            deposit you need to prepare, and verified homes that already fit inside that number.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-5">
        {/* ── Inputs ── */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Your situation</h2>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Applicant type">
              {([
                { id: 'working', label: 'I work', Icon: Briefcase },
                { id: 'student', label: "I'm a student", Icon: GraduationCap },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => setMode(id)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    mode === id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </button>
              ))}
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="income">
              {mode === 'working' ? 'Net monthly income (KES)' : 'Monthly budget from home / support (KES)'}
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-primary">
              <span className="text-sm font-bold text-slate-400">KES</span>
              <input
                id="income"
                inputMode="numeric"
                value={incomeRaw}
                onChange={(e) => setIncomeRaw(e.target.value)}
                placeholder={mode === 'working' ? 'e.g. 45000' : 'e.g. 12000'}
                className="w-full bg-transparent px-2 py-3 text-sm outline-none"
              />
            </div>

            {mode === 'working' && (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="commitments">
                  Monthly commitments (KES)
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-primary">
                  <span className="text-sm font-bold text-slate-400">KES</span>
                  <input
                    id="commitments"
                    inputMode="numeric"
                    value={commitRaw}
                    onChange={(e) => setCommitRaw(e.target.value)}
                    placeholder="Transport, loans, school fees…"
                    className="w-full bg-transparent px-2 py-3 text-sm outline-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Everything billed monthly — chama contributions, SACCO loans, bus fare, school fees.
                </p>
              </>
            )}

            <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="weekly">
              Savings per week towards move-in (KES) <span className="font-normal text-slate-400">— optional</span>
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-primary">
              <span className="text-sm font-bold text-slate-400">KES</span>
              <input
                id="weekly"
                inputMode="numeric"
                value={weeklyRaw}
                onChange={(e) => setWeeklyRaw(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full bg-transparent px-2 py-3 text-sm outline-none"
              />
            </div>

            <div className="mt-5 rounded-xl bg-orange-50 p-4 text-xs leading-relaxed text-slate-600">
              <Info className="mb-1 h-4 w-4 text-primary" aria-hidden />
              We use the <strong className="text-slate-800">30% rule</strong> — spend no more than 30% of net
              income on rent ({mode === 'student' ? '35% for students, since housing is the main cost of an allowance' : 'after deducting your commitments'}).
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {!ready ? (
              <div className="py-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100">
                  <Calculator className="h-7 w-7 text-primary" aria-hidden />
                </span>
                <p className="mt-4 font-semibold text-slate-800">Enter your income to see your budget</p>
                <p className="mt-1 text-sm text-slate-500">
                  Your numbers are worked out on this device — nothing is stored or sent anywhere.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Maximum affordable rent
                    </p>
                    <p className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                      {formatCurrency(maxRent)}
                      <span className="text-lg font-semibold text-slate-400"> /month</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      from {formatCurrency(disposable)} available after commitments
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Recommended</p>
                    <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(recommended)}</p>
                    <p className="text-xs text-emerald-700/80">leaves room for utilities</p>
                  </div>
                </div>

                {/* Where the money goes */}
                <div className="mt-6">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className="bg-primary" style={{ width: `${housingShare}%` }} />
                    <div className="bg-sky-500" style={{ width: `${commitShare}%` }} />
                    <div className="bg-slate-300" style={{ width: `${restShare}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-primary" /> Rent {housingShare}%</span>
                    <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Commitments {commitShare}%</span>
                    <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Living costs {restShare}%</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <Wallet className="h-5 w-5 text-primary" aria-hidden />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Move-in cost</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(upfront)}</p>
                    <p className="text-xs text-slate-500">deposit + first month</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <PiggyBank className="h-5 w-5 text-primary" aria-hidden />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Savings plan</p>
                    <p className="text-lg font-bold text-slate-900">
                      {weeksToSave ? `${weeksToSave} week${weeksToSave === 1 ? '' : 's'}` : '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {weeksToSave ? `at ${formatCurrency(weekly)} / week` : 'add weekly savings above'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <KeyRound className="h-5 w-5 text-primary" aria-hidden />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Homes in budget</p>
                    <p className="text-lg font-bold text-slate-900">
                      <CountUp value={matches.length} />
                    </p>
                    <p className="text-xs text-slate-500">available right now</p>
                  </div>
                </div>

                <Link
                  to={`/explore?maxPrice=${recommended}`}
                  className="btn-sheen mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primary/90 active:scale-[0.99]"
                >
                  Show all homes under {formatCurrency(recommended)}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>

          {/* Matching homes */}
          {ready && matches.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900">Homes inside your budget</h2>
                  <p className="text-sm text-slate-500">Verified, available and below {formatCurrency(recommended)} per month</p>
                </div>
                <Link to={`/explore?maxPrice=${recommended}`} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
                  View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {matches.slice(0, 4).map((p, i) => (
                  <Reveal key={p.id} delay={i * 0.07}>
                    <PropertyPreviewCard p={p} tier={tierOf(p)} compact />
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {ready && matches.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="font-semibold text-slate-800">No homes in budget yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Widen your search across all towns, or check back — new verified listings are added weekly.
              </p>
              <Link to="/explore" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                Browse everything →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* How the maths works */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">How this calculator works</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3 text-sm leading-relaxed text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">1. Your real disposable income</p>
              <p className="mt-1">We deduct your monthly commitments first, so the budget reflects money you actually have.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">2. The 30% rule</p>
              <p className="mt-1">Housing should not eat more than 30% of net income (35% for students). We round down to the nearest KES 500.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">3. A buffer, then live listings</p>
              <p className="mt-1">We recommend 90% of your ceiling to leave room for water, power and internet — then match live availability.</p>
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Indicative only — actual deposits and landlord terms vary. Always verify a property and read the
            tenancy terms before paying.
          </p>
        </div>
      </section>
    </div>
  );
}
