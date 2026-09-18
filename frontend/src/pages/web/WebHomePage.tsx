import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShieldCheck, MapPin, Video, Building2, GraduationCap, Megaphone, ArrowRight,
} from 'lucide-react';
import { useAllProperties } from '@/features/map/useAllProperties';
import { buildTierIndex } from '@/features/map/logic';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import MapCanvas from '@/features/map/MapCanvas';
import { HeroIn, Reveal, CountUp } from '@/components/motion';
import type { MapProperty } from '@/features/map/types';

const PILLARS = [
  { Icon: MapPin, title: 'Real locations', body: 'Every property is pinned with GPS captured on site, not typed into a form.' },
  { Icon: Video, title: 'Verified media', body: 'Photos and walkthrough videos come from the NyumbaLink capture workflow.' },
  { Icon: ShieldCheck, title: 'Fraud protection', body: 'Reports, investigations and blacklists are visible before you commit money.' },
];

function Section({ title, subtitle, items, tierOf }: { title: string; subtitle: string; items: MapProperty[]; tierOf: (p: MapProperty) => any }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <Link to="/explore" className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
          View all <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((p, i) => (
          <Reveal key={p.id} delay={i * 0.07}>
            <PropertyPreviewCard p={p} tier={tierOf(p)} compact />
            </Reveal>
        ))}
      </div>
    </section>
  );
}

export default function WebHomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, isLoading } = useAllProperties();
  const all = useMemo(() => (data?.items ?? []).filter((p) => p.safety !== 'blacklisted'), [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);

  const verified = all.filter((p) => p.verification === 'gold' || p.verification === 'platinum');
  const students = all.filter((p) => p.kind === 'hostel');
  const affordable = [...all].sort((a, b) => a.price - b.price);
  const stays = all.filter((p) => p.kind === 'airbnb' || p.kind === 'guest_house');

  return (
    <>
      <section className="relative overflow-hidden bg-secondary text-white">
        <div className="animate-blob pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="animate-blob-alt pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="animate-blob pointer-events-none absolute top-1/3 left-1/2 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <HeroIn delay={0}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Verified homes. Real locations.</p>
            </HeroIn>
            <HeroIn delay={0.08}>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
                Find a real place. See the real location. Verify before you pay.
              </h1>
            </HeroIn>
            <HeroIn delay={0.16}>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                NyumbaLink is a property verification platform, not a classifieds board. Every listing carries a permanent
                property ID, verification history, live availability and a public trust record.
              </p>
            </HeroIn>

            <HeroIn delay={0.24}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
              }}
              className="mt-8 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Search className="h-4 w-4 text-slate-400" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Where do you want to live?"
                  aria-label="Search location"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <select aria-label="Property type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <option>Any type</option>
                  <option>Rental</option>
                  <option>Apartment</option>
                  <option>Hostel</option>
                  <option>Airbnb</option>
                  <option>Guest house</option>
                </select>
                <select aria-label="Budget" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <option>Any budget</option>
                  <option>Under KES 5,000</option>
                  <option>KES 5,000 – 10,000</option>
                  <option>KES 10,000 – 20,000</option>
                  <option>KES 20,000+</option>
                </select>
                <select aria-label="Rooms" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <option>Any rooms</option>
                  <option>Bedsitter</option>
                  <option>1 Bedroom</option>
                  <option>2 Bedroom</option>
                  <option>3+ Bedroom</option>
                </select>
                <button type="submit" className="btn-sheen rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 active:scale-[0.98]">
                  Search
                </button>
              </div>
            </form>
            </HeroIn>

            <HeroIn delay={0.32}>
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {[
                ['Verified listings', verified.length],
                ['Live availability', all.reduce((s, p) => s + p.availableUnits, 0)],
                ['Towns covered', new Set(all.map((p) => p.town)).size],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</dt>
                  <dd className="mt-1 text-2xl font-bold text-white"><CountUp value={value as number} /></dd>
                </div>
              ))}
            </dl>
            </HeroIn>
          </div>

          <div className="h-[420px] overflow-hidden rounded-2xl border border-white/20 shadow-2xl lg:h-auto">
            <MapCanvas
              properties={all}
              selectedId={null}
              onSelect={(p) => p && navigate(`/properties/${p.id}`)}
              onViewportChange={() => {}}
              userLocation={null}
              flyTarget={null}
              satellite={false}
              center={[-0.6, 36.8]}
              route={null}
              onRouteResult={() => {}}
              onMapReady={() => {}}
              onBearingChange={() => {}}
            />
          </div>
        </div>
      </section>

      <div className="marquee-mask overflow-hidden border-b border-slate-200 bg-white py-3" aria-hidden>
        <div className="animate-marquee flex w-max items-center gap-8 pr-8">
          {[...new Set(all.map((p) => p.town).filter(Boolean)), ...new Set(all.map((p) => p.town).filter(Boolean))].map((town, i) => (
            <span key={`${town}-${i}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {town}
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-3">
        {PILLARS.map(({ Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 0.08}>
          <div className="card-lift h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-orange-100 transition-transform duration-300 hover:rotate-6 hover:scale-110">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
            </span>
            <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
          </Reveal>
        ))}
      </section>

      {isLoading && (
        <div className="mx-auto grid max-w-7xl gap-4 px-6 pb-10 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      )}

      <Section title="Verified properties" subtitle="Gold and platinum verification with on-site media" items={verified} tierOf={tierOf} />
      <Section title="Affordable rentals" subtitle="Lowest rent currently available in your market" items={affordable} tierOf={tierOf} />
      <Section title="Student housing" subtitle="Hostels and rooms near campuses" items={students} tierOf={tierOf} />
      <Section title="Airbnb and guest houses" subtitle="Short stays with verified walkthrough video" items={stays} tierOf={tierOf} />

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-14 md:grid-cols-3">
        {[
          { Icon: Building2, title: 'List your property', body: 'Register, verify your identity and publish real availability.', to: '/register' },
          { Icon: GraduationCap, title: 'Student housing', body: 'Verify your student status and match hostels by campus and budget.', to: '/explore' },
          { Icon: Megaphone, title: 'Advertise with NyumbaLink', body: 'Reach movers with clearly labelled sponsored placements.', to: '/contact' },
        ].map(({ Icon, title, body, to }, i) => (
          <Reveal key={title} delay={i * 0.08}>
          <Link to={to} className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md card-lift">
            <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-secondary">
              <Icon className="h-5 w-5 text-white" aria-hidden />
            </span>
            <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 group-hover:text-primary/80 transition-all">
              Continue <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
          </Reveal>
        ))}
      </section>
    </>
  );
}