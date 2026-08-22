import { useAuthStore } from '@/store/authStore';

export default function StudentDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome{user?.first_name ? `, ${user.first_name}` : ''} 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Student home — discover accommodation near your campus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Institution-aware search</h2>
            <p className="text-sm text-gray-600">
              Once your institution and campus are set in your profile, NyumbaLink
              prioritizes hostels and rooms near your campus, with a 1 km fallback
              to nearby rentals when institution accommodation is full.
            </p>
            <a
              href="/explore?kind=hostel"
              className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              Browse student housing
            </a>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Complete your profile</h2>
            <p className="text-sm text-gray-600">
              Add your institution, campus and verification details to unlock
              student-only listings.
            </p>
            <a
              href="/profile"
              className="inline-block mt-4 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5"
            >
              Go to profile
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
