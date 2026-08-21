import { Link } from 'react-router-dom';
import StaticPage, { Section } from './StaticPage';

const PLANS = [
  {
    name: 'Tenant',
    price: 'Free',
    tagline: 'For house-hunters',
    features: [
      'Unlimited search and map access',
      'Save and compare properties',
      'Request viewings',
      'Book rooms with tracked payments',
      'In-app messaging with owners',
      'Scam reporting',
    ],
    cta: { label: 'Create free account', to: '/register' },
    highlight: false,
  },
  {
    name: 'Owner',
    price: 'Free + optional boosts',
    tagline: 'For landlords and caretakers',
    features: [
      'List unlimited properties and rooms',
      'Verification workflow (Verified Owner badge)',
      'Booking and viewing management',
      'Occupancy analytics dashboard',
      'Respond to reviews',
      'Optional: Featured listing promotion',
    ],
    cta: { label: 'Start listing', to: '/properties/create' },
    highlight: true,
  },
  {
    name: 'Premium',
    price: 'From KES 300/mo',
    tagline: 'Visibility boosters',
    features: [
      'Featured placement in search results',
      'Priority verification queue',
      'Advanced analytics for owners',
      'Ad-free browsing for tenants',
      'Supports platform operations',
    ],
    cta: { label: 'Upgrade in dashboard', to: '/dashboard' },
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <StaticPage
      title="Pricing"
      description="Searching is always free. Owners list for free. Optional paid tools boost visibility."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl border p-6 ${p.highlight ? 'border-primary shadow-md' : ''}`}
          >
            <h2 className="text-lg font-bold">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.tagline}</p>
            <p className="mt-4 text-3xl font-extrabold">{p.price}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              to={p.cta.to}
              className={`mt-6 block rounded-lg px-4 py-2.5 text-center font-semibold ${
                p.highlight
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border hover:bg-muted'
              }`}
            >
              {p.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <Section title="Payments">
        <p>
          Paid features are billed in KES via M-Pesa. Every transaction gets an ID and receipt in your payment
          history. Cancel anytime — no hidden charges.
        </p>
      </Section>
    </StaticPage>
  );
}
