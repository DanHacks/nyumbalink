import { Link, useNavigate } from 'react-router-dom';
import {
  User, ShieldCheck, Heart, Search, CalendarCheck, MessageSquare, Flag, Star,
  Bell, GraduationCap, Lock, Globe, LogOut, ChevronRight, Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const GROUPS: { title: string; items: { label: string; to: string; Icon: typeof User }[] }[] = [
  {
    title: 'Activity',
    items: [
      { label: 'Saved properties', to: '/saved', Icon: Heart },
      { label: 'Saved searches', to: '/search', Icon: Search },
      { label: 'Viewings', to: '/viewings', Icon: CalendarCheck },
      { label: 'Messages', to: '/messages', Icon: MessageSquare },
    ],
  },
  {
    title: 'Trust',
    items: [
      { label: 'Identity verification', to: '/profile', Icon: ShieldCheck },
      { label: 'My reviews', to: '/profile', Icon: Star },
      { label: 'My reports', to: '/profile', Icon: Flag },
      { label: 'Student profile', to: '/student', Icon: GraduationCap },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Notifications', to: '/notifications', Icon: Bell },
      { label: 'Privacy', to: '/profile', Icon: Lock },
      { label: 'Language', to: '/profile', Icon: Globe },
      { label: 'Owner portal', to: '/dashboard', Icon: Building2 },
    ],
  },
];

export default function AccountPage() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-8">
      <header className="bg-white px-4 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-bold text-white shadow-sm">
            {isAuthenticated && user ? (user.first_name?.[0] ?? 'N') : <User className="h-5 w-5" aria-hidden />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">
              {isAuthenticated && user ? `${user.first_name} ${user.last_name}` : 'Guest'}
            </p>
            <p className="truncate text-sm text-slate-500">
              {isAuthenticated && user ? user.email : 'Register to save, book viewings and report listings'}
            </p>
          </div>
        </div>
        {!isAuthenticated && (
          <div className="mt-4 flex gap-2">
            <Link to="/login" className="flex-1 rounded-xl bg-secondary py-2.5 text-center text-sm font-semibold text-white hover:bg-secondary/90">
              Sign in
            </Link>
            <Link to="/register" className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-800">
              Create account
            </Link>
          </div>
        )}
      </header>

      {GROUPS.map((g) => (
        <section key={g.title} className="mt-4">
          <h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{g.title}</h2>
          <div className="divide-y divide-slate-100 bg-white">
            {g.items.map(({ label, to, Icon }) => (
              <Link key={label} to={to} className="flex items-center gap-3 px-4 py-3.5">
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-slate-500" aria-hidden />
                <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ))}

      {isAuthenticated && (
        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="mt-6 flex w-full items-center gap-3 bg-white px-4 py-3.5 text-sm font-semibold text-rose-600"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden /> Log out
        </button>
      )}

      <p className="px-4 pt-6 text-[11px] leading-relaxed text-slate-500">
        NyumbaLink never asks for deposits inside the app. Verify the property physically and meet the authorised
        owner or caretaker before any payment.
      </p>
    </div>
  );
}