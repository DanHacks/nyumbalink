import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Search, MapPin, Home, Filter, SlidersHorizontal } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [filters, setFilters] = useState({
    min_price: '',
    max_price: '',
    house_type: '',
    pet_friendly: false,
    student_friendly: false,
    parking: false,
    internet: false,
    water: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () =>
      searchApi.smart({
        q: query,
        ...filters,
        min_price: filters.min_price ? parseFloat(filters.min_price) : undefined,
        max_price: filters.max_price ? parseFloat(filters.max_price) : undefined,
      }),
    enabled: query.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchInput });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search "bedsitter under 8000 near Maseno University"'
            className="w-full pl-12 pr-4 py-4 text-lg border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>
      </div>

      {query && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-6 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">House Type</label>
                  <select
                    value={filters.house_type}
                    onChange={(e) => setFilters((f) => ({ ...f, house_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="bedsitter">Bedsitter</option>
                    <option value="one_bedroom">One Bedroom</option>
                    <option value="two_bedroom">Two Bedroom</option>
                    <option value="single_room">Single Room</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Min Rent</label>
                    <input
                      type="number"
                      value={filters.min_price}
                      onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Max Rent</label>
                    <input
                      type="number"
                      value={filters.max_price}
                      onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
                      placeholder="Any"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.pet_friendly}
                      onChange={(e) => setFilters((f) => ({ ...f, pet_friendly: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Pet Friendly</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.student_friendly}
                      onChange={(e) => setFilters((f) => ({ ...f, student_friendly: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Student Housing</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.parking}
                      onChange={(e) => setFilters((f) => ({ ...f, parking: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Parking</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.internet}
                      onChange={(e) => setFilters((f) => ({ ...f, internet: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Wi-Fi</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.water}
                      onChange={(e) => setFilters((f) => ({ ...f, water: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Water</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (data?.data?.results?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Found {data?.data?.total ?? 0} results for "{query}"
                </p>
                {(data?.data?.results ?? []).map((room: any) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {room.property_name} - {room.room_number}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">{room.house_type.replace(/_/g, ' ')}</p>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {room.city}, {room.county}
                          {room.building_name && ` - ${room.building_name}`}
                          {room.floor_number && `, Floor ${room.floor_number}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(room.rent_amount)}
                          <span className="text-sm text-gray-500 font-normal">/mo</span>
                        </div>
                        <Link
                          to={`/properties/${room.property_rel?.id || '#'}`}
                          className="text-sm text-primary hover:underline mt-1 inline-block"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                      {room.pet_friendly && <span>Pet Friendly</span>}
                      {room.parking_available && <span>Parking</span>}
                      {room.internet_available && <span>Wi-Fi</span>}
                      {room.water_available && <span>Water</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className="text-center py-20">
                <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-gray-600">Try different keywords or filters</p>
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search for a home</h3>
                <p className="text-gray-600">
                  Try "bedsitter under 8000 near Maseno University"
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
