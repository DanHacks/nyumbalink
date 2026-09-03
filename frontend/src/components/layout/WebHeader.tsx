import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ShieldCheck, Bell, User, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const PRIMARY = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/map', label: 'Map' },
  { to: '/saved', label: 'Saved' },
  { to: '/viewings', label: 'Viewings' },
];

const CATEGORIES = [
  { to: '/explore?kind=rental', label: 'Rentals' },
  { to: '/explore?kind=hostel', label: 'Student Housing' },
  { to: '/explore?kind=hostel', label: 'Hostels' },
  { to: '/explore?kind=airbnb', label: 'Airbnb' },
  { to: '/explore?kind=guest_house', label: 'Guest Houses' },
  { to: '/explore?kind=apartment', label: 'Apartments' },
];

export default function WebHeader() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="NyumbaLink" className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-slate-900">NyumbaLink</span>
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
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900',
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

          <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            Owner Portal
          </Link>
          <Link to="/trust" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Help &amp; Safety
          </Link>
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 xl:flex">
          <button aria-label="Notifications" className="rounded-md p-2 text-slate-500 hover:bg-slate-50">
            <Bell className="h-[18px] w-[18px]" aria-hidden />
          </button>
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
                Sign in
              </Link>
              <Link to="/register" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Get started
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
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
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
              {isAuthenticated ? (
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
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-medium">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white">
                    Get started
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