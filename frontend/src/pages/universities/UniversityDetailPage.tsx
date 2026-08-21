import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { universitiesApi, type MapRoom } from '@/lib/api';
import PropertyCard from '@/components/PropertyCard';
import EmptyState from '@/components/EmptyState';
import SkeletonCard from '@/components/SkeletonCard';

interface Campus {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
}

interface UniversityDetail {
  id: string;
  name: string;
  short_name?: string | null;
  county?: string | null;
  city?: string | null;
  campuses: Campus[];
}

const DISTANCES = [
  { value: 1, label: '< 1 km' },
  { value: 3, label: '< 3 km' },
  { value: 5, label: '< 5 km' },
];

export default function UniversityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [university, setUniversity] = useState<UniversityDetail | null>(null);
  const [campusId, setCampusId] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState(3);
  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [loadingUni, setLoadingUni] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState('');

  usePageMeta(university ? `${university.name} student accommodation` : 'University', undefined);

  useEffect(() => {
    (async () => {
      setLoadingUni(true);
      try {
        const response = await universitiesApi.get(slug as string);
        const uni = response.data;
        setUniversity(uni);
        if (uni.campuses?.length) setCampusId(uni.campuses[0].id);
      } catch {
        setError('Could not load this university.');
      } finally {
        setLoadingUni(false);
      }
    })();
  }, [slug]);

  const loadRooms = useCallback(async () => {
    if (!campusId) return;
    setLoadingRooms(true);
    try {
      const response = await universitiesApi.nearbyAccommodation(campusId, { radius_km: radiusKm });
      setRooms(response.data.results ?? []);
    } catch {
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [campusId, radiusKm]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  if (loadingUni) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !university) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <EmptyState icon="search" title="University not found" message={error || 'Please try again.'} />
        <div className="text-center">
          <Link to="/universities" className="font-semibold text-primary hover:underline">
            Back to all universities →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/universities" className="hover:text-foreground">Universities</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{university.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">{university.name}</h1>
        <p className="mt-2 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {[university.city, university.county].filter(Boolean).join(', ') || 'Kenya'}
        </p>
      </header>

      {university.campuses.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Campus:</span>
          {university.campuses.map((c) => (
            <button
              key={c.id}
              onClick={() => setCampusId(c.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                campusId === c.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {c.name}
            </button>
          ))}
          <span className="ml-4 text-sm font-medium">Distance:</span>
          {DISTANCES.map((d) => (
            <button
              key={d.value}
              onClick={() => setRadiusKm(d.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                radiusKm === d.value
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'hover:bg-muted'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Nearby accommodation</h2>
        {loadingRooms ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon="home"
            title="No homes found near this campus yet"
            message="Try a wider distance or check back soon — new listings are verified daily."
          />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <PropertyCard key={room.id} room={room as never} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
