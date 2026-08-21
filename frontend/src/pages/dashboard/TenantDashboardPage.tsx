import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, Heart, MapPin, Search, Bell, MessageSquare, Compass, Home,
} from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuthStore } from '@/store/authStore';
import { bookingsApi, favoritesApi, searchApi, type Booking } from '@/lib/api';
import PropertyCard, { type SearchRoom, formatKes } from '@/components/PropertyCard';
import EmptyState from '@/components/EmptyState';

const QUICK_ACTIONS = [
  { label: 'Find a home', to: '/search', icon: Search },
  { label: 'Open map', to: '/map', icon: MapPin },
  { label: 'My bookings', to: '/bookings', icon: CalendarCheck },
  { label: 'Saved homes', to: '/saved', icon: Heart },
];

export default function TenantDashboardPage() {
  const { user } = useAuthStore();
  usePageMeta('Dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [recommended, setRecommended] = useState<SearchRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    (async () => {
      try {
        const [bookingsRes, favsRes, recRes] = await Promise.allSettled([
          bookingsApi.getMyBookings({ page_size: 5 }),
          favoritesApi.list(),
          searchApi.smart({ page_size: 6 }),
        ]);
        if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data ?? []);
        if (favsRes.status === 'fulfilled') setSavedCount(favsRes.value.data?.total ?? favsRes.value.data?.favorites?.length ?? 0);
        if (recRes.status === 'fulfilled') setRecommended(recRes.value.data.results ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcoming = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status));

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.first_name || 'there'} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Here is what is happening with your home search.</p>
        </div>
        <Link
          to="/search"
          className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Find a home
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm font-semibold transition hover:border-primary/50 hover:shadow-sm"
          >
            <Icon className="h-4 w-4 text-primary" /> {label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarCheck className="h-4 w-4 text-primary" /> Upcoming viewings & bookings
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing scheduled yet.{' '}
                <Link to="/properties" className="font-medium text-primary hover:underline">
                  Browse properties →
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcoming.map((b) => (
                  <li key={b.id} className="rounded-lg border p-3">
                    <p className="font-semibold">{b.property_name || 'Property'}</p>
                    <p className="text-xs capitalize text-primary">{b.status}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(b.scheduled_time_start).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                      {b.house_type ? ` · ${b.house_type.replace(/_/g, ' ')}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-4 text-center">
              <Heart className="mx-auto h-5 w-5 text-destructive" />
              <p className="mt-2 text-2xl font-extrabold">{savedCount}</p>
              <p className="text-xs text-muted-foreground">Saved homes</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <CalendarCheck className="mx-auto h-5 w-5 text-teal-700" />
              <p className="mt-2 text-2xl font-extrabold">{bookings.length}</p>
              <p className="text-xs text-muted-foreground">Total bookings</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-bold">Quick links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/messages" className="flex items-center gap-2 hover:text-primary"><MessageSquare className="h-4 w-4" /> Messages</Link></li>
              <li><Link to="/notifications" className="flex items-center gap-2 hover:text-primary"><Bell className="h-4 w-4" /> Notifications</Link></li>
              <li><Link to="/universities" className="flex items-center gap-2 hover:text-primary"><Compass className="h-4 w-4" /> Student accommodation</Link></li>
              <li><Link to="/map" className="flex items-center gap-2 hover:text-primary"><Home className="h-4 w-4" /> Explore the map</Link></li>
            </ul>
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-xl font-bold">Recommended for you</h2>
          {loading ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <EmptyState
              title="No properties available yet"
              message="Verified listings will appear here as owners publish them."
              action={
                <Link to="/map" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">
                  Open the map
                </Link>
              }
            />
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {recommended.map((room) => (
                <PropertyCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
