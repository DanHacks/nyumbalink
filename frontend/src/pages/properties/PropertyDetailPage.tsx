import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { propertiesApi, bookingsApi, analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatTimeAgo } from '@/lib/utils';
import {
  MapPin, Home, Bed, Bath, Wifi, Car, Droplets,
  Shield, Star, Clock, Users, ChevronLeft,
  Calendar, Share2, Bookmark, Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
  });

  const bookingMutation = useMutation({
    mutationFn: (data: any) => bookingsApi.create(data),
    onSuccess: () => {
      toast.success('Booking request sent!');
      setShowBookingForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Booking failed');
    },
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to book a viewing');
      return;
    }

    bookingMutation.mutate({
      property_id: id,
      scheduled_date: bookingDate,
      scheduled_time_start: `${bookingDate}T${bookingTime}:00`,
      scheduled_time_end: `${bookingDate}T${bookingTime.split(':')[0]}:00`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const prop = property?.data;

  if (!prop) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Property not found</h2>
        <Link to="/properties" className="text-primary hover:underline">
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/properties"
        className="inline-flex items-center text-sm text-gray-600 hover:text-primary mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to properties
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-200 rounded-xl h-80 flex items-center justify-center">
            <Home className="h-16 w-16 text-gray-400" />
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{prop.property_name}</h1>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  {prop.address_line1}, {prop.city}, {prop.county}
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 rounded-lg border hover:bg-gray-50">
                  <Share2 className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-lg border hover:bg-gray-50">
                  <Bookmark className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-lg border hover:bg-gray-50 text-red-500">
                  <Flag className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              {prop.has_verified_photos && (
                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3 mr-1" />
                  Photos Verified
                </span>
              )}
              {prop.status === 'verified' && (
                <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 mr-1" />
                  Verified Property
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{prop.total_rooms}</div>
              <div className="text-xs text-gray-600">Total Rooms</div>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{prop.vacant_rooms}</div>
              <div className="text-xs text-gray-600">Vacant Rooms</div>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{Math.round(prop.occupancy_rate)}%</div>
              <div className="text-xs text-gray-600">Occupancy</div>
            </div>
            <div className="text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{prop.total_views}</div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
          </div>

          {prop.description && (
            <div>
              <h2 className="text-xl font-semibold mb-3">About This Property</h2>
              <p className="text-gray-600 leading-relaxed">{prop.description}</p>
            </div>
          )}

          {prop.buildings && prop.buildings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Buildings & Rooms</h2>
              <div className="space-y-4">
                {prop.buildings.map((building: any) => (
                  <div key={building.id} className="border rounded-xl p-4">
                    <h3 className="font-semibold">{building.building_name}</h3>
                    <p className="text-sm text-gray-600">
                      {building.total_rooms} rooms, {building.vacant_rooms} vacant
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prop.nearby_places && prop.nearby_places.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Nearby Places</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {prop.nearby_places.map((place: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{place.place_name} ({place.distance_km}km)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 sticky top-24">
            <div className="text-3xl font-bold text-primary mb-1">
              {formatCurrency(prop.min_rent || 0)}
              {prop.max_rent && prop.max_rent !== prop.min_rent
                ? ` - ${formatCurrency(prop.max_rent)}`
                : ''}
              <span className="text-sm text-gray-500 font-normal">/month</span>
            </div>

            {prop.last_vacancy_update && (
              <p className="text-xs text-gray-500 mb-4">
                Updated {formatTimeAgo(prop.last_vacancy_update)}
              </p>
            )}

            {isAuthenticated ? (
              showBookingForm ? (
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Time</label>
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={bookingMutation.isPending}
                      className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      {bookingMutation.isPending ? 'Sending...' : 'Confirm Booking'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      className="px-4 py-3 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                >
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Book Viewing
                </button>
              )
            ) : (
              <Link
                to="/login"
                className="block w-full py-3 bg-primary text-white text-center rounded-lg font-semibold hover:bg-primary/90"
              >
                Login to Book Viewing
              </Link>
            )}

            <div className="mt-4 text-xs text-gray-500 text-center">
              Book a viewing to see the property in person
            </div>

            {prop.owner && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Listed by</h4>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {prop.owner.first_name?.[0]}{prop.owner.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{prop.owner.first_name} {prop.owner.last_name}</p>
                    {prop.owner.verification_badge && (
                      <span className="text-xs text-green-600">Verified Owner</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
