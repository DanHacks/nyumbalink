import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShieldCheck, MapPin, Video, Building2, GraduationCap, Megaphone, ArrowRight,
  Calculator, UserPlus, SearchCheck, KeyRound, Home, KeyRound as DoorOpen, Hotel, School,
  ClipboardCheck, BadgeCheck, MapPinned,
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

/** Boma Yangu's audience grid, re-cut for the people who actually rent in Kenya. */
const AUDIENCES = [
  {
    Icon: GraduationCap,
    title: 'Students',
    body: 'Verify your campus and browse hostels, bedsitters and shared rooms near your university — filtered by budget, distance and gender requirements.',
    primary: { label: 'Register now', to: '/register' },
    secondary: { label: 'Learn more', to: '/universities' },
    status: 'live' as const,
  },
  {
    Icon: Home,
    title: 'Locals & families',
    body: 'From one-bedroom units to full family homes, search verified rentals by estate and town with real coordinates and live availability.',
    primary: { label: 'Register now', to: '/register' },
    secondary: { label: 'Learn more', to: '/how-it-works' },
    status: 'live' as const,
  },
  {
    Icon: Building2,
    title: 'Landlords & agents',
    body: 'Publish real availability, receive viewing and booking requests, and collect rent via M-Pesa — a verified badge that earns tenant trust.',
    primary: { label: 'Register now', to: '/register' },
    secondary: { label: 'Pricing', to: '/pricing' },
    status: 'live' as const,
  },
  {
    Icon: DoorOpen,
    title: 'Caretakers',
    body: 'Manage rooms, occupancy, viewings and check-ins on behalf of owners from one dashboard — built for estate caretakers and managers.',
    primary: { label: 'Register now', to: '/register' },
    secondary: { label: 'Learn more', to: '/how-it-works' },
    status: 'live' as const,
  },
  {
    Icon: Hotel,
    title: 'Hostels & developers',
    body: 'Onboard your hostel, estate or serviced apartments, keep availability current, and reach students before intake season starts.',
    primary: { label: 'Register now', to: '/properties/create' },
    secondary: { label: 'Contact us', to: '/contact' },
    status: 'live' as const,
  },
  {
    Icon: School,
    title: 'Universities & student groups',
    body: 'Bulk room placements for halls, SACCOS, chamas and student organisations — one agreement, many rooms, one dashboard.',
    primary: { label: 'Coming soon', to: '' },
    secondary: { label: 'Learn more', to: '/contact' },
    status: 'soon' as const,
  },
];

/** The Boma Yangu "3 simple steps" journey, re-cut for renting. */
const STEPS = [
  {
    n: 1,
    Icon: UserPlus,
    title: 'Register',
    body: 'Registration is free and takes minutes. Tenants verify with their ID, students verify with a student ID, and owners verify ownership before anything is published.',
    bullets: ['Free forever — no agent fees', 'ID and student verification', 'Works on any phone'],
    cta: { label: 'Register now', to: '/register' },
  },
  {
    n: 2,
    Icon: SearchCheck,
    title: 'Search & verify',
    body: 'Tell us your budget, campus or estate. Every listing shows real coordinates, on-site photos, walkthrough video and a public trust score — so you know the house is real before you travel.',
    bullets: ['Rent affordability calculator', 'GPS-verified locations', 'Verified media & trust scores'],
    cta: { label: 'Explore homes', to: '/explore' },
  },
  {
    n: 3,
    Icon: KeyRound,
    title: 'Book & move in',
    body: 'Request a viewing, get directions, and confirm your booking with M-Pesa. Move in on a documented agreement, then leave a verified-stay review for the next tenant.',
    bullets: ['Viewings with directions', 'M-Pesa payments', 'Verified-stay reviews'],
    cta: { label: 'See how it works', to: '/how-it-works' },
  },
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
          Explore more <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
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
  const [kind, setKind] = useState('');
  const [budget, setBudget] = useState('');
  const [rooms, setRooms] = useState('');
  const { data, isLoading } = useAllProperties();
  const all = useMemo(() => (data?.items ?? []).filter((p) => p.safety !== 'blacklisted'), [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);

  const verified = all.filter((p) => p.verification === 'gold' || p.verification === 'platinum');
  const students = all.filter((p) => p.kind === 'hostel');
  const affordable = [...all].sort((a, b) => a.price - b.price);
  const stays = all.filter((p) => p.kind === 'airbnb' || p.kind === 'guest_house');
  const loved = [...all].filter((p) => p.rating > 0).sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  const liveUnits = all.reduce((s, p) => s + p.availableUnits, 0);
  const towns = new Set(all.map((p) => p.town).filter(Boolean)).size;

  // Hero visual: real listings from the live feed.
  const photos = all.map((p) => p.photo).filter(Boolean).slice(0, 3);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetToken =
      budget === 'u5000' ? 'under 5000'
      : budget === '5-10k' ? 'from 5000 under 10000'
      : budget === '10-20k' ? 'from 10000 under 20000'
      : budget === '20k+' ? 'from 20000'
      : '';
    const full = [q.trim(), budgetToken, rooms].filter(Boolean).join(' ').trim();
    const params = new URLSearchParams();
    if (full) params.set('q', full);
    if (kind) params.set('kind', kind);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <>
      {/* ── Hero: welcome + register/login + calculator + search, live map ── */}
      <section className="relative overflow-hidden bg-secondary text-white">
        <div className="animate-blob pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="animate-blob-alt pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="animate-blob pointer-events-none absolute top-1/3 left-1/2 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <HeroIn delay={0}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Welcome to NyumbaLink</p>
            </HeroIn>
            <HeroIn delay={0.08}>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
                Find a real home you can afford.
              </h1>
            </HeroIn>
            <HeroIn delay={0.16}>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                NyumbaLink is the gateway to verified rental homes in Kenya — built for students heading to
                campus and locals looking for a safe place to settle. Search real GPS locations, verify before
                you pay, and move in with confidence.
              </p>
            </HeroIn>

            <HeroIn delay={0.24}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="btn-sheen rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 active:scale-[0.98]"
                >
                  Register — it's free
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link
                  to="/calculator"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-3 text-sm font-semibold text-orange-400 transition hover:text-orange-300"
                >
                  <Calculator className="h-4 w-4" aria-hidden /> Rent calculator
                </Link>
              </div>
            </HeroIn>

            <HeroIn delay={0.32}>
              <form
                onSubmit={submitSearch}
                className="mt-8 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Search className="h-4 w-4 text-slate-400" aria-hidden />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Where do you want to live? e.g. Kisumu, JKUAT, Westlands"
                    aria-label="Search location"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Property type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <option value="">Any type</option>
                    <option value="rental">Rental</option>
                    <option value="apartment">Apartment</option>
                    <option value="hostel">Hostel</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="guest_house">Guest house</option>
                  </select>
                  <select value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <option value="">Any budget</option>
                    <option value="u5000">Under KES 5,000</option>
                    <option value="5-10k">KES 5,000 – 10,000</option>
                    <option value="10-20k">KES 10,000 – 20,000</option>
                    <option value="20k+">KES 20,000+</option>
                  </select>
                  <select value={rooms} onChange={(e) => setRooms(e.target.value)} aria-label="Rooms" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <option value="">Any rooms</option>
                    <option value="bedsitter">Bedsitter</option>
                    <option value="1 bedroom">1 Bedroom</option>
                    <option value="2 bedroom">2 Bedroom</option>
                    <option value="3 bedroom">3+ Bedroom</option>
                  </select>
                  <button type="submit" className="btn-sheen rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 active:scale-[0.98]">
                    Search
                  </button>
                </div>
              </form>
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

      {/* ── Story: the human need, Boma Yangu's "Housing is a fundamental human need" ── */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <Reveal>
          <div className="relative">
            <div className="h-80 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-secondary to-slate-800 shadow-xl sm:h-96">
              {photos[0] ? (
                <img src={photos[0]} alt="A verified Kenyan home on NyumbaLink" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Home className="h-16 w-16 text-orange-400/60" aria-hidden />
                </div>
              )}
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:left-8">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100">
                <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Verified on site</p>
                <p className="text-xs text-slate-500">GPS captured · media approved</p>
              </div>
            </div>
            <div className="absolute -top-4 right-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100">
                <MapPinned className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Real location</p>
                <p className="text-xs text-slate-500">Never a typed-in address</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why we exist</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
            A safe, affordable home is a fundamental human need.
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Whether you are a first-year student looking for a hostel near campus, a young professional renting
            a bedsitter in town, or a family moving into a new estate — finding a place you can trust should not
            be a gamble. Every month, Kenyan tenants lose savings to fake photos, wrong locations and landlords
            who never existed.
          </p>
          <p className="mt-3 leading-relaxed text-slate-600">
            NyumbaLink fixes that. Every home is pinned with real GPS coordinates, photographed on site, and
            backed by a public trust record you can check <strong className="text-slate-900">before</strong> you
            pay a coin — so students and locals move in with confidence, not hope.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/explore" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
              Explore homes
            </Link>
            <Link to="/how-it-works" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary">
              How verification works
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Live platform stats (Boma Yangu's numbers band) ── */}
      <section className="bg-secondary text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Verified listings', value: verified.length, Icon: BadgeCheck },
            { label: 'Rooms available now', value: liveUnits, Icon: DoorOpen },
            { label: 'Towns covered', value: towns, Icon: MapPinned },
            { label: 'Hostels & student rooms', value: students.length, Icon: GraduationCap },
          ].map(({ label, value, Icon }, i) => (
            <Reveal key={label} delay={i * 0.08}>
              <div className="border-l-2 border-primary/70 pl-5">
                <Icon className="h-5 w-5 text-orange-400" aria-hidden />
                <p className="mt-3 text-4xl font-extrabold tracking-tight text-white">
                  <CountUp value={value} />
                </p>
                <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-400">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 3 simple steps (Boma Yangu's journey section) ── */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
              Start your journey home in 3 simple steps
            </h2>
            <p className="mt-3 text-slate-600">Registration is free. No agent fees, no guesswork, no surprises.</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {STEPS.map(({ n, Icon, title, body, bullets, cta }, i) => (
              <Reveal key={n} delay={i * 0.1}>
                <div className="card-lift flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative bg-gradient-to-br from-secondary to-slate-800 px-6 py-7">
                    <span className="text-6xl font-extrabold leading-none text-white/10">{String(n).padStart(2, '0')}</span>
                    <span className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-2xl bg-primary">
                      <Icon className="h-5 w-5 text-white" aria-hidden />
                    </span>
                    <p className="mt-1 text-lg font-bold text-white">Step {n}</p>
                    <p className="font-semibold text-orange-400">{title}</p>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-sm leading-relaxed text-slate-600">{body}</p>
                    <ul className="mt-4 space-y-2">
                      {bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={cta.to}
                      className="group mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
                    >
                      {cta.label}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who we serve (Boma Yangu's audience grid) ── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Who we serve</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
            Built for the people who actually rent in Kenya
          </h2>
          <p className="mt-3 text-slate-600">
            From campus hostels to family homes — NyumbaLink connects tenants, owners and caretakers on one
            trusted platform.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map(({ Icon, title, body, primary, secondary, status }, i) => (
            <Reveal key={title} delay={i * 0.07}>
              <div className="card-lift flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-orange-100">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{body}</p>
                <div className="mt-5 flex items-center gap-4">
                  {status === 'live' ? (
                    <Link to={primary.to} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90">
                      {primary.label}
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
                      {primary.label}
                    </span>
                  )}
                  <Link to={secondary.to} className="text-sm font-semibold text-slate-600 transition hover:text-primary">
                    {secondary.label}
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {isLoading && (
        <div className="mx-auto grid max-w-7xl gap-4 px-6 pb-10 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      )}

      <Section title="Homes tenants love most" subtitle="Highest-rated houses, hostels and stays on NyumbaLink" items={loved} tierOf={tierOf} />
      <Section title="Verified properties" subtitle="Gold and platinum verification with on-site media" items={verified} tierOf={tierOf} />
      <Section title="Affordable rentals" subtitle="Lowest rent currently available in your market" items={affordable} tierOf={tierOf} />
      <Section title="Student housing" subtitle="Hostels and rooms near campuses" items={students} tierOf={tierOf} />
      <Section title="Airbnb and guest houses" subtitle="Short stays with verified walkthrough video" items={stays} tierOf={tierOf} />

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-14 md:grid-cols-3">
        {[
          { Icon: Building2, title: 'List your property', body: 'Register, verify your identity and publish real availability.', to: '/properties/create' },
          { Icon: GraduationCap, title: 'Student housing', body: 'Verify your student status and match hostels by campus and budget.', to: '/universities' },
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

      {/* ── Pre-footer call to action (Boma Yangu calculator band) ── */}
      <section className="bg-gradient-to-r from-primary to-orange-600 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
              Not sure what you can afford?
            </h2>
            <p className="mt-2 max-w-xl text-white/90">
              Our rent affordability calculator tells you your real budget, the deposit you need, and how long
              it takes to save — then shows homes that match.
            </p>
          </div>
          <Link
            to="/calculator"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-lg transition hover:bg-orange-50 active:scale-[0.98]"
          >
            <Calculator className="h-4 w-4" aria-hidden /> Open the calculator
          </Link>
        </div>
      </section>

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
    </>
  );
}
