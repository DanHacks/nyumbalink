import { Link } from 'react-router-dom';
import StaticPage, { Section } from './StaticPage';

const STEPS = [
  {
    n: 1,
    title: 'Search where you want to live',
    body: 'Search by city, estate, university or landmark. Every listing shows real coordinates on the map — never invented ones.',
  },
  {
    n: 2,
    title: 'Explore verified properties',
    body: 'Photos, walkthrough videos and locations go through verification before a property earns its badge.',
  },
  {
    n: 3,
    title: 'Request a viewing or book',
    body: 'Pick a date and time. The owner or caretaker confirms, and you get directions right from the app.',
  },
  {
    n: 4,
    title: 'Visit with confidence',
    body: 'Navigate to the property, notify the caretaker that you are on your way, and check in safely.',
  },
  {
    n: 5,
    title: 'Move in and review',
    body: 'Complete your booking, then leave a verified-stay review to help the next tenant.',
  },
];

export default function HowItWorksPage() {
  return (
    <StaticPage
      title="How NyumbaLink works"
      description="From search to move-in: a trusted, location-first way to find houses, hostels and rooms across Kenya."
    >
      <Section title="The journey">
        <ol className="space-y-6">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                {s.n}
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Why verification matters">
        <p>
          Rental scams thrive on fake photos and wrong locations. NyumbaLink fights this with GPS-stamped media,
          owner identity checks, property verification by our team, and community scam reports. Only properties that
          pass review earn the <strong className="text-foreground">Verified Property</strong> badge.
        </p>
      </Section>

      <Section title="For property owners">
        <p>
          Register your property, add rooms and real photos, set availability, and receive booking and viewing
          requests from verified tenants. Start on the{' '}
          <Link to="/properties/create" className="font-semibold text-primary hover:underline">
            list property
          </Link>{' '}
          page.
        </p>
      </Section>

      <Section title="For students">
        <p>
          Pick your university and campus to see hostels, bedsitters and shared rooms nearby, filtered by price,
          distance and gender requirements. Visit the{' '}
          <Link to="/universities" className="font-semibold text-primary hover:underline">
            university directory
          </Link>
          .
        </p>
      </Section>
    </StaticPage>
  );
}
