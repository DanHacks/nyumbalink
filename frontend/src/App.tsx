import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import WebLayout from '@/components/layout/WebLayout';
import MobileShell from '@/components/mobile/MobileShell';
import WebHomePage from '@/pages/web/WebHomePage';
import ExplorePage from '@/pages/web/ExplorePage';
import MobileSearchPage from '@/pages/mobile/MobileSearchPage';
import SavedPage from '@/pages/mobile/SavedPage';
import ViewingsPage from '@/pages/mobile/ViewingsPage';
import AccountPage from '@/pages/mobile/AccountPage';
import HomePage from '@/pages/HomePage';
import MapHomePage from '@/pages/MapHomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import PropertiesPage from '@/pages/properties/PropertiesPage';
import PropertyDetailPage from '@/pages/properties/PropertyDetailPage';
import CreatePropertyPage from '@/pages/properties/CreatePropertyPage';
import OwnerDashboardPage from '@/pages/dashboard/OwnerDashboardPage';
import TenantDashboardPage from '@/pages/dashboard/TenantDashboardPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import BookingsPage from '@/pages/bookings/BookingsPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import SearchPage from '@/pages/search/SearchPage';
import MessagesPage from '@/pages/messages/MessagesPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import UniversitiesPage from '@/pages/universities/UniversitiesPage';
import UniversityDetailPage from '@/pages/universities/UniversityDetailPage';
import HowItWorksPage from '@/pages/public/HowItWorksPage';
import AboutPage from '@/pages/public/AboutPage';
import SafetyPage from '@/pages/public/SafetyPage';
import HelpPage from '@/pages/public/HelpPage';
import ContactPage from '@/pages/public/ContactPage';
import PricingPage from '@/pages/public/PricingPage';
import PrivacyPage from '@/pages/public/PrivacyPage';
import TermsPage from '@/pages/public/TermsPage';
import CategoryPage from '@/pages/public/CategoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !['admin', 'superadmin', 'moderator', 'verification_officer'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const OWNER_ROLES = ['owner', 'caretaker', 'agent', 'host', 'manager'];

/** Role-aware dashboard: tenants get the tenant home, owners get property management. */
function DashboardRouter() {
  const { user } = useAuthStore();
  if (user && OWNER_ROLES.includes(user.role)) {
    return <OwnerDashboardPage />;
  }
  return <TenantDashboardPage />;
}

/** Public pages shared by desktop and mobile-browser layouts. */
function PublicRoutes() {
  return (
    <>
      <Route path="how-it-works" element={<HowItWorksPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="safety" element={<SafetyPage />} />
      <Route path="help" element={<HelpPage />} />
      <Route path="contact" element={<ContactPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="terms" element={<TermsPage />} />
      <Route path="universities" element={<UniversitiesPage />} />
      <Route path="universities/:slug" element={<UniversityDetailPage />} />
      {['hostels', 'apartments', 'houses', 'bedsitters', 'rooms', 'guest-houses', 'airbnb', 'commercial', 'land'].map(
        (slug) => <Route key={slug} path={slug} element={<CategoryPage slug={slug} />} />
      )}
    </>
  );
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isMobile = useIsMobile();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isMobile) {
    return (
      <Routes>
        {/* Public website pages are identical on every screen size */}
        <Route element={<WebLayout />}>
          <Route path="/" element={<WebHomePage />} />
          <PublicRoutes />
        </Route>

        <Route path="/map" element={<MapHomePage />} />
        <Route element={<MobileShell />}>
          <Route path="search" element={<MobileSearchPage />} />
          <Route path="explore" element={<MobileSearchPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="viewings" element={<ViewingsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="properties" element={<MobileSearchPage />} />
          <Route path="properties/:id" element={<PropertyDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/map" element={<MapHomePage />} />
      <Route path="/" element={<WebLayout />}>
        <Route index element={<WebHomePage />} />
        <PublicRoutes />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="viewings" element={<ViewingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="welcome" element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="search" element={<SearchPage />} />

        <Route
          path="properties/create"
          element={
            <ProtectedRoute>
              <CreatePropertyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/*"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}
