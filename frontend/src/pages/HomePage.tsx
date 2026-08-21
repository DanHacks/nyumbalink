import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertiesApi } from '@/lib/api';
import { formatCurrency, formatTimeAgo } from '@/lib/utils';
import MapDisplay from '@/components/map/MapDisplay';
import {
  Search, Shield, Camera, MapPin, Building2, Star,
  ChevronRight, Home, Bed, Wifi, ChevronDown,
} from 'lucide-react';

const quickSearches = [
  { label: 'Bedsitter under 8,000', icon: Bed, query: 'bedsitter under 8000' },
  { label: '1 Bedroom near CBD', icon: Home, query: 'one bedroom near cbd' },
  { label: 'With Wi-Fi & Parking', icon: Wifi, query: 'wifi parking' },
  { label: 'Student Housing', icon: Building2, query: 'student housing' },
];

const counties = [
  'Nairobi', 'Kisumu', 'Mombasa', 'Nakuru', 'Eldoret', 'Thika', 'Machakos', 'Kiambu',
];

const stats = [
  { label: 'Verified Properties', value: '10,000+' },
  { label: 'Happy Tenants', value: '25,000+' },
  { label: 'Verified Owners', value: '5,000+' },
  { label: 'Counties Covered', value: '47' },
];

const features = [
  {
    icon: Camera,
    title: 'Verified Photos',
    description: 'Every photo is taken in-app with GPS, timestamp, and AI verification.',
  },
  {
    icon: Shield,
    title: 'Anti-Scam Engine',
    description: 'AI detects fake listings, duplicate photos, and fraudulent owners.',
  },
  {
    icon: MapPin,
    title: 'Live Vacancy',
    description: 'Real-time room availability updated by owners and caretakers.',
  },
  {
    icon: Building2,
    title: 'Property History',
    description: 'Every property has a permanent ID with full history and trust score.',
  },
  {
    icon: Star,
    title: 'Trust Score',
    description: 'Owners are rated by verification level, rental history, and reviews.',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find homes by type, price, location, and proximity to amenities.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');

  const { data: featuredData } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: () => propertiesApi.list({ page_size: 6, verified_only: true }),
  });

  const featured = featuredData?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCounty) params.set('county', selectedCounty);
    navigate(`/search?${params.toString()}`);
  };

  const handleQuickSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div>
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              What are you looking for?
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-2">
              Find verified homes across Kenya. Real photos. Real locations. Real vacancies.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 'bedsitter under 8,000 near Maseno Uni'"
                  className="w-full pl-12 pr-4 py-4 text-slate-900 rounded-xl md:rounded-r-none focus:outline-none"
                />
              </div>
              <div className="relative md:w-44">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <select
                  value={selectedCounty}
                  onChange={(e) => setSelectedCounty(e.target.value)}
                  className="w-full pl-12 pr-8 py-4 text-slate-900 rounded-xl md:rounded-none border-t md:border-t-0 md:border-l border-slate-200 appearance-none bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">All Counties</option>
                  {counties.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {quickSearches.map((item) => (
              <button
                key={item.label}
                onClick={() => handleQuickSearch(item.query)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-colors border border-white/10"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-orange-500 text-white py-14">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-orange-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Verified Properties</h2>
                <p className="text-slate-600 mt-1">Recently listed and verified homes</p>
              </div>
              <Link to="/properties" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/properties/${p.id}`}
                  className="group bg-white rounded-xl border hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="h-48 bg-slate-100 relative flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-slate-300" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {p.has_verified_photos && (
                        <span className="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {p.is_featured && (
                        <span className="bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-xs px-2 py-1 rounded-md">
                      {p.vacant_rooms} room{p.vacant_rooms !== 1 ? 's' : ''} left
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 group-hover:text-orange-500 transition-colors">
                        {p.property_name}
                      </h3>
                    </div>
                    <div className="flex items-center text-sm text-slate-500 mb-3">
                      <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      {p.city}, {p.county}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(p.min_rent || 0)}
                        {p.max_rent && p.max_rent !== p.min_rent ? ` - ${formatCurrency(p.max_rent)}` : ''}
                        <span className="text-sm text-slate-500 font-normal">/mo</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.last_vacancy_update ? formatTimeAgo(p.last_vacancy_update) : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Explore on Map</h2>
              <p className="text-slate-600 mt-1">Find properties across Kenya with live map, routes, and satellite view</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {counties.map((county) => (
                <Link
                  key={county}
                  to={`/search?county=${encodeURIComponent(county)}`}
                  className="px-4 py-2 bg-white rounded-lg border hover:border-orange-500 hover:text-orange-500 text-sm transition-colors"
                >
                  {county}
                </Link>
              ))}
            </div>
          </div>
          <MapDisplay
            properties={featured.map((p: any) => ({
              id: p.id,
              name: p.property_name,
              latitude: p.latitude,
              longitude: p.longitude,
              rent: p.min_rent || 0,
              city: p.city,
              county: p.county,
              vacant: p.vacant_rooms,
              verified: p.has_verified_photos,
            }))}
            center={[-0.5, 37]}
            zoom={6}
            height="520px"
            onPropertySelect={(id) => navigate(`/properties/${id}`)}
          />
          <div className="flex md:hidden flex-wrap justify-center gap-2 mt-4">
            {counties.map((county) => (
              <Link
                key={county}
                to={`/search?county=${encodeURIComponent(county)}`}
                className="px-4 py-2 bg-white rounded-lg border hover:border-orange-500 hover:text-orange-500 text-sm transition-colors"
              >
                {county}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why NyumbaLink?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We eliminate fake listings, wrong photos, and scam owners. Every property is verified end-to-end.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border bg-white hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Home?</h2>
            <p className="text-slate-300 mb-8 text-lg">
              Join thousands of tenants who trust NyumbaLink for verified homes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/properties"
                className="inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                Browse Properties
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-slate-400 text-slate-200 rounded-xl font-semibold hover:border-white hover:text-white transition-colors"
              >
                List Your Property
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
