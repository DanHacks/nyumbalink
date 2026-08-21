import StaticPage, { Section } from './StaticPage';

export default function AboutPage() {
  return (
    <StaticPage
      title="About NyumbaLink"
      description="Find your place. Live your way. We are building the trusted way to find housing in Kenya."
    >
      <Section title="Our mission">
        <p>
          Finding a home in Kenya is hard: scattered listings, fake photos, wrong locations and middlemen you cannot
          trust. NyumbaLink combines real map locations, verified media and community reporting so that what you see
          is what you get.
        </p>
        <p>
          We believe house-hunting should feel as smooth as hailing a ride: open the map, see what is near you, check
          the details, book a viewing, and navigate there with confidence.
        </p>
      </Section>

      <Section title="What makes us different">
        <ul className="list-disc space-y-2 pl-5">
          <li>Location-first discovery built on real GPS coordinates from property owners.</li>
          <li>A verification pipeline for owners, properties, photos and walkthrough videos.</li>
          <li>Anti-scam tooling: report suspicious listings, fraud investigations and blacklisting.</li>
          <li>One platform for tenants, students, owners, caretakers and administrators.</li>
          <li>Built for Kenya first — M-Pesa payments, KES pricing and local counties and campuses.</li>
        </ul>
      </Section>

      <Section title="Where we operate">
        <p>
          NyumbaLink launches across Kenyan cities and campus towns — Nairobi, Kisumu, Nakuru, Mombasa, Eldoret,
          Thika, Machakos and more — expanding estate by estate.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, partnerships or press? Reach us at{' '}
          <a href="mailto:support@hytechsolution.co.ke" className="font-semibold text-primary hover:underline">
            support@hytechsolution.co.ke
          </a>{' '}
          or through the <a href="/contact" className="font-semibold text-primary hover:underline">contact page</a>.
        </p>
      </Section>
    </StaticPage>
  );
}
