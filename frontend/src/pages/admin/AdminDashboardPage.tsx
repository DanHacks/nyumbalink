import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, verificationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Shield, Users, Home, AlertTriangle, CheckCircle, XCircle,
  BarChart3, Settings, Image, FileText, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'verification' | 'users' | 'properties' | 'scam' | 'settings';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
    enabled: activeTab === 'users',
  });

  const { data: verificationQueue } = useQuery({
    queryKey: ['admin-verification'],
    queryFn: () => adminApi.getVerificationQueue(),
    enabled: activeTab === 'verification',
  });

  const { data: scamReports } = useQuery({
    queryKey: ['admin-scam'],
    queryFn: () => adminApi.listScamReports(),
    enabled: activeTab === 'scam',
  });

  const approvePhotoMutation = useMutation({
    mutationFn: (photoId: string) => verificationApi.approvePhoto(photoId),
    onSuccess: () => {
      toast.success('Photo approved');
      queryClient.invalidateQueries({ queryKey: ['admin-verification'] });
    },
  });

  const rejectPhotoMutation = useMutation({
    mutationFn: ({ photoId, reason }: { photoId: string; reason: string }) =>
      verificationApi.rejectPhoto(photoId, reason),
    onSuccess: () => {
      toast.success('Photo rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-verification'] });
    },
  });

  const resolveScamMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: string }) =>
      adminApi.resolveScamReport(reportId, action),
    onSuccess: () => {
      toast.success('Report resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-scam'] });
    },
  });

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'verification', label: 'Verification', icon: Image },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'scam', label: 'Scam Reports', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const statsCards = [
    { label: 'Total Users', value: dashboard?.data?.total_users || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Properties', value: dashboard?.data?.total_properties || 0, icon: Home, color: 'bg-green-500' },
    { label: 'Pending Photos', value: dashboard?.data?.pending_verifications || 0, icon: Image, color: 'bg-yellow-500' },
    { label: 'Scam Reports', value: dashboard?.data?.pending_scam_reports || 0, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Owner Verifications', value: dashboard?.data?.pending_owner_verifications || 0, icon: FileText, color: 'bg-purple-500' },
    { label: 'Revenue', value: `KES ${(dashboard?.data?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Manage NyumbaLink platform</p>
        </div>
        <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
          <Shield className="h-4 w-4 mr-1" />
          {user?.role}
        </div>
      </div>

      <div className="flex space-x-1 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsCards.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Photo Verification Queue</h2>
          {(verificationQueue?.data?.pending_photos?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              {(verificationQueue?.data?.pending_photos ?? []).map((photo: any) => (
                <div key={photo.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Photo ID: {photo.id.slice(0, 8)}...</p>
                    <p className="text-sm text-gray-600">
                      Property: {photo.property_id.slice(0, 8)}... | Category: {photo.category}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approvePhotoMutation.mutate(photo.id)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason:');
                        if (reason) rejectPhotoMutation.mutate({ photoId: photo.id, reason });
                      }}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No pending verifications</p>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          {(users?.data?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Trust Score</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users?.data ?? []).map((u: any) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{u.first_name} {u.last_name}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4 capitalize">{u.role}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex text-xs px-2 py-1 rounded-full ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{u.trust_score}%</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={async () => {
                            try {
                              await adminApi.toggleUserActive(u.id);
                              toast.success('User status toggled');
                              queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                            } catch {
                              toast.error('Failed to toggle user status');
                            }
                          }}
                          className="text-sm text-primary hover:underline"
                        >
                          Toggle Active
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No users found</p>
          )}
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">All Properties</h2>
          <p className="text-gray-600">Property management coming soon</p>
        </div>
      )}

      {activeTab === 'scam' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Scam Reports</h2>
          {(scamReports?.data?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              {(scamReports?.data ?? []).map((report: any) => (
                <div key={report.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">Report #{report.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">Category: {report.category}</p>
                      <p className="text-sm text-gray-600">Status: {report.status}</p>
                      {report.description && (
                        <p className="text-sm mt-2">{report.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => resolveScamMutation.mutate({ reportId: report.id, action: 'warning' })}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                      >
                        Warning
                      </button>
                      <button
                        onClick={() => resolveScamMutation.mutate({ reportId: report.id, action: 'hide' })}
                        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                      >
                        Hide Listing
                      </button>
                      <button
                        onClick={() => resolveScamMutation.mutate({ reportId: report.id, action: 'suspend' })}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No scam reports</p>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Platform Settings</h2>
          <p className="text-gray-600">Settings panel coming soon</p>
        </div>
      )}
    </div>
  );
}
