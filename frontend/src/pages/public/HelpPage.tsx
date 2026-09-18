import { Link } from 'react-router-dom';
import StaticPage, { Section } from './StaticPage';

const CATEGORIES = [
  {
    title: 'Finding a home',
    links: [
      { label: 'Search and filters', to: '/search' },
      { label: 'Map view', to: '/explore?view=map' },
      { label: 'Saved properties', to: '/saved' },
    ],
  },
  {
    title: 'Booking and viewings',
    links: [
      { label: 'Request a viewing', to: '/how-it-works' },
      { label: 'Your bookings', to: '/bookings' },
      { label: 'Cancellation rules', to: '/terms' },
    ],
  },
  {
    title: 'Owners',
    links: [
      { label: 'List a property', to: '/properties/create' },
      { label: 'Owner dashboard', to: '/dashboard' },
      { label: 'Verification process', to: '/safety' },
    ],
  },
  {
    title: 'Students',
    links: [
      { label: 'University directory', to: '/universities' },
      { label: 'Hostels', to: '/hostels' },
      { label: 'Bedsitters', to: '/bedsitters' },
    ],
  },
  {
    title: 'Trust and safety',
    links: [
      { label: 'Safety center', to: '/safety' },
      { label: 'Report a scam', to: '/contact' },
      { label: 'Privacy policy', to: '/privacy' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Create an account', to: '/register' },
      { label: 'Sign in', to: '/login' },
      { label: 'Profile settings', to: '/profile' },
    ],
  },
];

export default function HelpPage() {
  return (
    <StaticPage
      title="Help center"
      description="Guides for finding, booking, listing and staying safe on NyumbaLink."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className="rounded-xl border p-5">
            <h2 className="font-bold">{cat.title}</h2>
            <ul className="mt-3 space-y-2">
              {cat.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm font-medium text-primary hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Section title="Still stuck?">
        <p>
          Reach our support team via the{' '}
          <Link to="/contact" className="font-semibold text-primary hover:underline">
            contact page
          </Link>{' '}
          — include your account email and, where relevant, the property name.
        </p>
      </Section>
    </StaticPage>
  );
}
