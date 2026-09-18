import { useAuthStore } from '@/store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Phone, User as UserIcon, Star, Award, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` || 'N';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/60 h-32" />
        <div className="px-6 pb-6">
          <div className="flex items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-full bg-white p-1">
              <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {initials}
                </span>
              </div>
            </div>
            <div className="ml-4 mb-2">
              <h1 className="text-2xl font-bold">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-gray-600 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            {user.verification_badge && (
              <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                <Shield className="h-3 w-3 mr-1" />
                Verified Owner
              </span>
            )}
            {user.is_premium && (
              <span className="inline-flex items-center text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                <Award className="h-3 w-3 mr-1" />
                Premium
              </span>
            )}
            <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              <Star className="h-3 w-3 mr-1" />
              Trust Score: {user.trust_score}%
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-3 text-gray-400" />
              {user.email}
              {user.is_email_verified && (
                <span className="ml-2 text-xs text-green-600">Verified</span>
              )}
            </div>
            {user.phone && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-3 text-gray-400" />
                {user.phone}
                {user.is_phone_verified && (
                  <span className="ml-2 text-xs text-green-600">Verified</span>
                )}
              </div>
            )}
            <div className="flex items-center text-sm">
              <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
              Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {!user.is_premium && (
              <Link to="/pricing" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">
                Go Premium
              </Link>
            )}
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="inline-flex items-center px-4 py-2 border rounded-lg text-sm font-semibold text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
