import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore, homeRouteFor } from '@/store/authStore';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  {
    role: 'student',
    title: 'Student',
    description: 'Find verified hostels and rooms near your campus.',
    icon: '🎓',
  },
  {
    role: 'tenant',
    title: 'Tenant',
    description: 'Search homes, apartments and rentals anywhere.',
    icon: '🔑',
  },
  {
    role: 'owner',
    title: 'Property Owner',
    description: 'List and manage your verified properties.',
    icon: '🏠',
  },
  {
    role: 'agent',
    title: 'Estate Agent',
    description: 'Manage multiple properties on behalf of owners.',
    icon: '💼',
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const goHome = () => {
    const role = useAuthStore.getState().user?.role;
    navigate(homeRouteFor(role));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register({ ...formData, role: selectedRole });
      toast.success('Account created successfully!');
      goHome();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create your NyumbaLink account</h1>
            <p className="text-gray-600 mt-2">Choose how you will use NyumbaLink</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.role}
                type="button"
                onClick={() => setSelectedRole(opt.role)}
                className="text-left p-6 border rounded-xl hover:border-primary hover:shadow-md transition-all bg-white"
              >
                <div className="text-3xl mb-3">{opt.icon}</div>
                <h3 className="text-lg font-semibold">{opt.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500">
            Caretakers are invited by property owners or agents.{' '}
            <Link to="/login" className="text-primary hover:underline">
              Already have an account?
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-gray-600 mt-2">
            You're signing up as <span className="font-semibold capitalize">{selectedRole}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="John"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+254 712 345 678"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or continue with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (res) => {
              if (!res.credential) return;
              try {
                await useAuthStore.getState().googleLogin(res.credential);
                toast.success('Welcome!');
                const role = useAuthStore.getState().user?.role;
                navigate(homeRouteFor(role));
              } catch (e: any) {
                toast.error(e.response?.data?.detail || 'Google sign-in failed');
              }
            }}
            onError={() => toast.error('Google sign-in failed')}
            useOneTap={false}
          />
        </div>

        <p className="text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={() => setSelectedRole(null)}
            className="text-primary font-medium hover:underline"
          >
            ← Choose a different account type
          </button>
        </p>
      </div>
    </div>
  );
}
