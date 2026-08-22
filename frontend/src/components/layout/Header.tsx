import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  Menu,
  X,
  Search,
  Bell,
  User,
  ChevronDown,
  Home,
  Building2,
  BarChart3,
  Shield,
} from 'lucide-react';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NyumbaLink</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </form>

          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/properties" className="text-sm font-medium hover:text-primary">
              Find a Home
            </Link>
            <Link to="/map" className="text-sm font-medium hover:text-primary">
              Map
            </Link>
            <Link to="/hostels" className="text-sm font-medium hover:text-primary">
              Hostels
            </Link>
            <Link to="/universities" className="text-sm font-medium hover:text-primary">
              Students
            </Link>
            <Link to="/how-it-works" className="text-sm font-medium hover:text-primary">
              How It Works
            </Link>
            <Link to="/safety" className="text-sm font-medium hover:text-primary">
              Safety
            </Link>

            {isAuthenticated && user ? (
              <>
                {user.role && ['owner', 'caretaker', 'agent', 'host', 'manager'].includes(user.role) && (
                  <Link
                    to="/properties/create"
                    className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
                  >
                    List Property
                  </Link>
                )}

                {user.role && ['admin', 'superadmin', 'moderator', 'verification_officer'].includes(user.role) && (
                  <Link to="/admin" className="text-sm font-medium hover:text-primary">
                    <Shield className="h-5 w-5" />
                  </Link>
                )}

                <Link to="/dashboard" className="text-sm font-medium hover:text-primary">
                  <BarChart3 className="h-5 w-5" />
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 text-sm font-medium hover:text-primary"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="hidden lg:inline">{user.first_name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isProfileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                        <div className="p-2">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm rounded-lg hover:bg-gray-100"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            Profile
                          </Link>
                          <Link
                            to="/bookings"
                            className="block px-4 py-2 text-sm rounded-lg hover:bg-gray-100"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            My Bookings
                          </Link>
                          <Link
                            to="/dashboard"
                            className="block px-4 py-2 text-sm rounded-lg hover:bg-gray-100"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          <hr className="my-1" />
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              handleLogout();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-red-600"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium hover:text-primary"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </form>

            <Link
              to="/properties"
              className="block py-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Find a Home
            </Link>
            <Link
              to="/map"
              className="block py-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Map
            </Link>
            <Link
              to="/universities"
              className="block py-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Student Accommodation
            </Link>
            <Link
              to="/how-it-works"
              className="block py-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              to="/safety"
              className="block py-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Safety
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/properties/create"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  List Property
                </Link>
                <Link
                  to="/dashboard"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/bookings"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Bookings
                </Link>
                <Link
                  to="/profile"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left py-2 text-sm font-medium text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
