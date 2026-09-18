import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi, bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import {
  Home, Eye, MousePointerClick,
  Calendar, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ['owner-analytics'],
    queryFn: () => analyticsApi.getOwnerDashboard(),
  });

  const { data: bookings } = useQuery({
    queryKey: ['property-bookings'],
    queryFn: () => bookingsApi.getMyPropertyBookings(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bookingsApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Booking updated');
      queryClient.invalidateQueries({ queryKey: ['property-bookings'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Update failed'),
  });

  const stats = [
    {
      label: 'Total Properties',
      value: analytics?.data?.total_properties || 0,
      icon: Home,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Views',
      value: analytics?.data?.total_views || 0,
      icon: Eye,
      color: 'bg-green-500',
    },
    {
      label: 'Total Clicks',
      value: analytics?.data?.total_clicks || 0,
      icon: MousePointerClick,
      color: 'bg-purple-500',
    },
    {
      label: 'Viewing Requests',
      value: bookings?.data?.length || 0,
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ];

  if (!user || !user.role || !['owner', 'caretaker', 'agent', 'host', 'manager'].includes(user.role)) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Owner Dashboard</h2>
        <p className="text-gray-600">This dashboard is for property owners and agents.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.first_name}</p>
        </div>
        <Link
          to="/properties/create"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          List Property
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-4">Your Properties</h2>

        {(analytics?.data?.properties?.length ?? 0) > 0 ? (
          <div className="space-y-4">
            {(analytics?.data?.properties ?? []).map((property: any) => (
              <div
                key={property.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <Link
                    to={`/properties/${property.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {property.name}
                  </Link>
                  <div className="text-sm text-gray-600 mt-1">
                    {property.vacant_rooms}/{property.total_rooms} vacant
                    {' | '}
                    {Math.round(property.occupancy_rate)}% occupied
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {property.total_views} views
                  </div>
                  {property.is_verified ? (
                    <span className="text-xs text-green-600">Verified</span>
                  ) : (
                    <span className="text-xs text-yellow-600">Pending Verification</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-4">List your first property to get started</p>
            <Link
              to="/properties/create"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              List Property
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Incoming viewing requests</h2>
        {(bookings?.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500">No requests yet. Share your listing to get bookings.</p>
        ) : (
          <div className="space-y-3">
            {(bookings?.data ?? []).slice(0, 10).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-3 border rounded-lg p-3 text-sm">
                <div>
                  <p className="font-semibold">{b.property_name || b.property_id?.slice(0, 8)} · {b.status}</p>
                  <p className="text-gray-500">{b.tenant_name || ''}</p>
                </div>
                <div className="flex gap-2">
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => statusMutation.mutate({ id: b.id, status: 'confirmed' })} className="px-3 py-1.5 bg-green-600 text-white rounded-lg">Confirm</button>
                      <button onClick={() => statusMutation.mutate({ id: b.id, status: 'cancelled' })} className="px-3 py-1.5 border rounded-lg">Decline</button>
                    </>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => statusMutation.mutate({ id: b.id, status: 'completed' })} className="px-3 py-1.5 bg-secondary text-white rounded-lg hover:bg-secondary/90">Complete</button>
                  )}
                </div>
              </div>
            ))}
            <Link to="/bookings" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-4">Tip: open a property to upload GPS verification photos, manage rooms (vacant/occupied), and track views.</p>
      </div>
    </div>
  );
}
