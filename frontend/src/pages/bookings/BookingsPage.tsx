import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  checked_in: { label: 'Checked In', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function BookingsPage() {
  const { user } = useAuthStore();
  const isOwner = ['owner', 'caretaker', 'agent', 'host', 'manager'].includes(user?.role || '');

  const { data: myBookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingsApi.getMyBookings(),
    enabled: !isOwner,
  });

  const { data: propertyBookings } = useQuery({
    queryKey: ['property-bookings'],
    queryFn: () => bookingsApi.getMyPropertyBookings(),
    enabled: isOwner,
  });

  const bookings = isOwner ? propertyBookings?.data || [] : myBookings?.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {isOwner ? 'Property Viewing Requests' : 'My Bookings'}
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
          <p className="text-gray-600">
            {isOwner
              ? 'Tenants will request viewings for your properties'
              : 'Book a viewing to see a property in person'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const config = statusConfig[booking.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div key={booking.id} className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      <span
                        className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">Property ID: {booking.property_id}</p>

                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(booking.scheduled_date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {new Date(booking.scheduled_time_start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(booking.scheduled_time_end).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    Booked {formatTimeAgo(booking.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
