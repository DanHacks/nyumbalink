import { NavLink } from 'react-router-dom';
import { Map, Search, Heart, CalendarCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/explore?view=map', label: 'Explore', Icon: Map, end: false },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/saved', label: 'Saved', Icon: Heart },
  { to: '/viewings', label: 'Viewings', Icon: CalendarCheck },
  { to: '/account', label: 'Account', Icon: User },
];

export default function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="z-[1100] flex h-16 shrink-0 items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
              isActive ? 'text-primary' : 'text-slate-500',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} aria-hidden />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}