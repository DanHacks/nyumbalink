import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, homeRouteFor } from '@/store/authStore';
import toast from 'react-hot-toast';

const ROLE_CARDS = [
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

export default function ChooseRolePage() {
  const navigate = useNavigate();
  const selectRole = useAuthStore((state) => state.selectRole);
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelect = async (role: string) => {
    setIsLoading(role);
    try {
      await selectRole(role);
      toast.success('Welcome to NyumbaLink!');
      navigate(homeRouteFor(role));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Could not set account type');
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">How will you use NyumbaLink?</h1>
          <p className="text-gray-600 mt-2">
            {user?.first_name
              ? `Hi ${user.first_name}, choose your account type to continue.`
              : 'Choose how you will use NyumbaLink to continue.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROLE_CARDS.map((card) => (
            <button
              key={card.role}
              type="button"
              onClick={() => handleSelect(card.role)}
              disabled={isLoading !== null}
              className="text-left p-6 border rounded-xl hover:border-primary hover:shadow-md transition-all disabled:opacity-60 bg-white"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{card.description}</p>
              {isLoading === card.role && (
                <p className="text-sm text-primary mt-3">Setting up…</p>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500">
          Caretakers are invited by property owners or agents and cannot sign up here.{' '}
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
