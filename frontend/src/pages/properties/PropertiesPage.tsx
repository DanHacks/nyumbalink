import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertiesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Home, ChevronRight, Filter, Search, Grid3X3, List } from 'lucide-react';

export default function PropertiesPage() {
  const [filters, setFilters] = useState({
    property_type: '',
    county: '',
    min_price: '',
    max_price: '',
    verified_only: false,
    page: 1,
    page_size: 20,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['properties', filters],
    queryFn: () => propertiesApi.list(filters),
  });

  const properties = data?.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Verified Properties</h1>
          <p className="text-gray-600 mt-1">Browse verified homes across Kenya</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-6 space-y-6 sticky top-24">
            <div>
              <label className="block text-sm font-medium mb-2">Property Type</label>
              <select
                value={filters.property_type}
                onChange={(e) => setFilters((f) => ({ ...f, property_type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="hostel">Hostel</option>
                <option value="guest_house">Guest House</option>
                <option value="student_housing">Student Housing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">County</label>
              <input
                type="text"
                value={filters.county}
                onChange={(e) => setFilters((f) => ({ ...f, county: e.target.value }))}
                placeholder="e.g. Nairobi, Kisumu"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Min Rent (KES)</label>
              <input
                type="number"
                value={filters.min_price}
                onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Rent (KES)</label>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
                placeholder="100,000"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.verified_only}
                onChange={(e) => setFilters((f) => ({ ...f, verified_only: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Verified Only</span>
            </label>

            <button
              onClick={() =>
                setFilters({
                  property_type: '',
                  county: '',
                  min_price: '',
                  max_price: '',
                  verified_only: false,
                  page: 1,
                  page_size: 20,
                })
              }
              className="w-full py-2 text-sm text-gray-600 hover:text-primary border rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
              {properties.map((property: any) => (
                <Link
                  key={property.id}
                  to={`/properties/${property.id}`}
                  className={`block bg-white rounded-xl border hover:shadow-lg transition-shadow ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                >
                  <div className={`${viewMode === 'list' ? 'w-48 h-48 flex-shrink-0' : 'h-48'} bg-gray-200 rounded-t-xl ${viewMode === 'list' ? 'rounded-l-xl rounded-tr-none' : ''} relative`}>
                    {property.has_verified_photos && (
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Verified
                      </span>
                    )}
                    {property.is_featured && (
                      <span className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <Home className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-semibold text-lg mb-1">{property.property_name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.city}, {property.county}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-bold text-lg">
                        {formatCurrency(property.min_rent || 0)}
                        {property.max_rent && property.max_rent !== property.min_rent
                          ? ` - ${formatCurrency(property.max_rent)}`
                          : ''}
                        <span className="text-sm text-gray-500 font-normal">/mo</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        {property.vacant_rooms} vacant
                      </span>
                    </div>
                    {viewMode === 'list' && property.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{property.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
