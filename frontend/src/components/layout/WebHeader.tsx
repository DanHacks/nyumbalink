import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Bell, User, Menu, X, Calculator } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const PRIMARY = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/universities', label: 'Student Housing' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const CATEGORIES = [
  { to: '/explore?kind=rental', label: 'Rentals' },
  { to: '/explore?kind=hostel', label: 'Hostels' },
  { to: '/explore?kind=apartment', label: 'Apartments' },
  { to: '/explore?kind=airbnb', label: 'Airbnb' },
  { to: '/explore?kind=guest_house', label: 'Guest Houses' },
  { to: '/properties/create', label: 'List your property' },
];

export default function WebHeader() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="NyumbaLink" className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-secondary">Nyumba<span className="text-primary">Link</span></span>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
          }}
          className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 lg:flex"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Where do you want to live?"
            aria-label="Search NyumbaLink"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </form>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
          {PRIMARY.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}

          <div className="relative" onMouseLeave={() => setCatOpen(false)}>
            <button
              onMouseEnter={() => setCatOpen(true)}
              onClick={() => setCatOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Categories <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
            {catOpen && (
              <div className="absolute right-0 top-full w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
                {CATEGORIES.map((c) => (
                  <Link key={c.label} to={c.to} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && (
            <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              Owner Portal
            </Link>
          )}
          {/* Boma Yangu-style highlighted action in the nav bar */}
          <Link
            to="/calculator"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Calculator className="h-4 w-4" aria-hidden /> Rent Calculator
          </Link>
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 xl:flex">
          {isAuthenticated && user && (
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-50"
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden />
            </Link>
          )}
          {isAuthenticated && user ? (
            <>
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800">
                <User className="h-4 w-4" aria-hidden /> {user.first_name}
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900">
                Log in
              </Link>
              <Link to="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
                Register
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 xl:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white xl:hidden">
          <nav className="mx-auto max-w-7xl space-y-1 px-6 py-4" aria-label="Mobile">
            {PRIMARY.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                end={l.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="border-t border-slate-100 pt-3">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
              {CATEGORIES.map((c) => (
                <Link key={c.label} to={c.to} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  {c.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3">
              <Link
                to="/calculator"
                onClick={() => setMobileOpen(false)}
                className="mb-2 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
              >
                <Calculator className="h-4 w-4" aria-hidden /> Rent affordability calculator
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Owner Portal
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      setMobileOpen(false);
                      navigate('/');
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-medium">
                    Log in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-white">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}