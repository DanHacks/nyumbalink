import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  checked_in: { label: 'Checked In', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function gps(): Promise<{ lat: number; lon: number; acc?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('No GPS'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export default function BookingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const isOwner = ['owner', 'caretaker', 'agent', 'host', 'manager'].includes(user?.role || '');

  const { data: myBookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingsApi.getMyBookings(),
    enabled: !isOwner,
  });

  const { data: propertyBookings, isLoading: ownerLoading } = useQuery({
    queryKey: ['property-bookings'],
    queryFn: () => bookingsApi.getMyPropertyBookings(),
    enabled: isOwner,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['property-bookings'] });
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => bookingsApi.cancel(id, reason),
    onSuccess: () => {
      toast.success('Booking cancelled');
      setCancellingId(null);
      setCancelReason('');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Cancel failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      bookingsApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Booking updated');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Update failed'),
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => {
      const pos = await gps();
      return bookingsApi.checkIn(id, {
        booking_id: id,
        gps_latitude: pos.lat,
        gps_longitude: pos.lon,
        gps_accuracy: pos.acc,
      });
    },
    onSuccess: () => {
      toast.success('Checked in!');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Check-in failed (you must be at the property)'),
  });

  const bookings = isOwner ? propertyBookings?.data || [] : myBookings?.data || [];
  const loading = isOwner ? ownerLoading : isLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {isOwner ? 'Property Viewing Requests' : 'My Bookings'}
      </h1>

      {loading ? (
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
            const terminal = ['cancelled', 'completed', 'checked_in'].includes(booking.status);

            return (
              <div key={booking.id} className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      <span
                        className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    <p className="font-medium">{booking.property_name || `Property ${booking.property_id?.slice(0, 8)}`}</p>
                    {booking.house_type && (
                      <p className="text-sm text-gray-600 capitalize">{booking.house_type.replace(/_/g, ' ')}</p>
                    )}

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
                    {booking.tenant_name && isOwner && (
                      <p className="text-sm text-gray-600">Tenant: {booking.tenant_name}</p>
                    )}
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    Booked {formatTimeAgo(booking.created_at)}
                  </div>
                </div>

                {!terminal && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isOwner ? (
                      <>
                        {booking.status === 'pending' && (
                          <>
                            <button onClick={() => statusMutation.mutate({ id: booking.id, status: 'confirmed' })} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg">Confirm</button>
                            <button onClick={() => setCancellingId(booking.id)} className="px-3 py-1.5 text-sm border rounded-lg">Decline</button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button onClick={() => statusMutation.mutate({ id: booking.id, status: 'completed' })} className="px-3 py-1.5 text-sm bg-secondary text-white rounded-lg hover:bg-secondary/90">Mark completed</button>
                        )}
                      </>
                    ) : (
                      <>
                        {booking.status === 'confirmed' && (
                          <button onClick={() => checkInMutation.mutate(booking.id)} disabled={checkInMutation.isPending} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                            {checkInMutation.isPending ? 'Checking in...' : 'Check in (at property)'}
                          </button>
                        )}
                        <button onClick={() => setCancellingId(booking.id)} className="px-3 py-1.5 text-sm border rounded-lg text-red-600">Cancel</button>
                      </>
                    )}
                  </div>
                )}

                {cancellingId === booking.id && (
                  <div className="mt-3 flex gap-2">
                    <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <button onClick={() => cancelMutation.mutate({ id: booking.id, reason: cancelReason })} disabled={cancelMutation.isPending} className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50">Confirm cancel</button>
                    <button onClick={() => { setCancellingId(null); setCancelReason(''); }} className="px-3 py-2 text-sm border rounded-lg">Back</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
