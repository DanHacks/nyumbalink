import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { searchApi } from '@/lib/api';
import PropertyCard, { type SearchRoom } from '@/components/PropertyCard';
import EmptyState from '@/components/EmptyState';
import SkeletonCard from '@/components/SkeletonCard';

export interface CategoryConfig {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  houseType?: string;
  propertyType?: string;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'hostels',
    title: 'Hostels',
    tagline: 'Student hostels and shared accommodation near campus',
    description: 'Affordable hostel rooms filtered by distance to your university.',
    houseType: 'shared',
  },
  {
    slug: 'apartments',
    title: 'Apartments',
    tagline: 'Apartments for every budget',
    description: 'Studio to four-bedroom apartments in verified buildings.',
    houseType: 'one_bedroom',
  },
  {
    slug: 'houses',
    title: 'Houses',
    tagline: 'Standalone houses, maisonettes and villas',
    description: 'Family homes with space, parking and compounds.',
    houseType: 'maisonette',
  },
  {
    slug: 'bedsitters',
    title: 'Bedsitters',
    tagline: 'Compact living, easy on the wallet',
    description: 'Bedsitters and studios close to town centres and campuses.',
    houseType: 'bedsitter',
  },
  {
    slug: 'rooms',
    title: 'Rooms',
    tagline: 'Single rooms available now',
    description: 'Single rooms in shared compounds, verified by our team.',
    houseType: 'single_room',
  },
  {
    slug: 'guest-houses',
    title: 'Guest Houses',
    tagline: 'Short stays and guest houses',
    description: 'Guest houses for short visits and business travel.',
    propertyType: 'guest_house',
  },
  {
    slug: 'airbnb',
    title: 'Airbnb-style stays',
    tagline: 'Furnished short-stay homes',
    description: 'Fully furnished stays you can book for days or weeks.',
    propertyType: 'airbnb',
  },
  {
    slug: 'commercial',
    title: 'Commercial',
    tagline: 'Shops, offices and warehouses',
    description: 'Commercial spaces for your business.',
    propertyType: 'commercial',
  },
  {
    slug: 'land',
    title: 'Land & Plots',
    tagline: 'Land for sale and development',
    description: 'Plots with verified ownership documentation.',
    propertyType: 'land',
  },
];

export function getCategory(slug?: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export default function CategoryPage({ slug: slugProp }: { slug?: string }) {
  const params = useParams<{ category: string }>();
  const slug = slugProp ?? params.category;
  const config = getCategory(slug);
  usePageMeta(
    config ? `${config.title} — rent in Kenya` : 'Category not found',
    config?.description
  );

  const [rooms, setRooms] = useState<SearchRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = {};
      if (config.houseType === 'shared') params.student_friendly = true;
      if (config.houseType && config.houseType !== 'shared') params.house_type = config.houseType;
      if (config.propertyType) params.property_type = config.propertyType;
      const response = await searchApi.smart(params);
      setRooms(response.data.results ?? []);
      setTotal(response.data.total ?? 0);
    } catch {
      setError('Something went wrong while loading properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    load();
  }, [load]);

  if (!config) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <EmptyState
          icon="search"
          title="Category not found"
          message="Browse all properties instead."
        />
        <div className="text-center">
          <Link to="/properties" className="font-semibold text-primary hover:underline">
            View all properties →
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
        <span className="text-foreground">{config.title}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{config.title}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{config.tagline}</p>
      </header>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <EmptyState icon="offline" title="Something went wrong" message={error} />
          <div className="text-center">
            <button onClick={load} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
              Try again
            </button>
          </div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="home"
            title="No homes found in this category yet"
            message="New verified listings appear here as owners publish them."
          />
          <div className="text-center">
            <Link to="/properties" className="font-semibold text-primary hover:underline">
              Browse all properties →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {total} {total === 1 ? 'listing' : 'listings'} available
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <PropertyCard key={room.id} room={room} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
