import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, GraduationCap } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { universitiesApi } from '@/lib/api';
import EmptyState from '@/components/EmptyState';

interface Campus {
  id: string;
  name: string;
  city?: string | null;
}

interface University {
  id: string;
  name: string;
  short_name?: string | null;
  county?: string | null;
  city?: string | null;
  campuses: Campus[];
}

export default function UniversitiesPage() {
  usePageMeta(
    'Student accommodation by university',
    'Find hostels, bedsitters and rooms near your university campus in Kenya.'
  );
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await universitiesApi.list();
        setUniversities(response.data.universities ?? []);
      } catch {
        setError('Could not load universities. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = universities.filter(
    (u) =>
      !query ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.county?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium text-primary">
          <GraduationCap className="h-4 w-4" /> Student mode
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Accommodation near your campus
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
          Pick your university, choose a campus, and see hostels, bedsitters and shared rooms within walking
          distance.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-xl">
        <input
          type="search"
          aria-label="Search universities"
          placeholder="Search university or county…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border bg-background px-5 py-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon="offline" title="Something went wrong" message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No universities found"
          message="Try a different search term."
        />
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <Link
              key={u.id}
              to={`/universities/${u.id}`}
              className="rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h2 className="font-semibold group-hover:text-primary">{u.name}</h2>
              {u.short_name && <p className="text-xs font-medium text-primary">{u.short_name}</p>}
              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[u.city, u.county].filter(Boolean).join(', ') || 'Kenya'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {u.campuses?.length || 0} {(u.campuses?.length || 0) === 1 ? 'campus' : 'campuses'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
