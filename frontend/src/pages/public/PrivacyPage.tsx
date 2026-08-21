import StaticPage, { Section } from './StaticPage';

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy policy"
      description="How NyumbaLink collects, uses and protects your data."
    >
      <p className="text-sm text-muted-foreground">
        Last updated: August 2026. This policy is a working document and will be reviewed by qualified Kenyan
        legal/privacy professionals before production launch.
      </p>

      <Section title="Data we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Account data:</strong> name, email, phone number, password (hashed), role, profile photo.</li>
          <li><strong className="text-foreground">Location data:</strong> your device location is used only to show nearby properties when you grant permission. Property owners submit property coordinates.</li>
          <li><strong className="text-foreground">Property data:</strong> listings, rooms, prices, amenities, media and verification documents you submit.</li>
          <li><strong className="text-foreground">Booking data:</strong> viewing requests, bookings, check-ins and related messages.</li>
          <li><strong className="text-foreground">Media:</strong> photos and videos you upload, including GPS metadata used for verification.</li>
          <li><strong className="text-foreground">Messages and reviews:</strong> content you send or post on the platform.</li>
          <li><strong className="text-foreground">Reports:</strong> scam reports and supporting evidence you provide.</li>
          <li><strong className="text-foreground">Payment information:</strong> M-Pesa transaction references. We never store raw card data.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <p>
          To operate the platform: showing properties near you, enabling bookings and viewings, verifying owners and
          properties, preventing fraud, providing support, and improving the product. Product analytics are limited to
          events such as property views and searches — we do not build advertising profiles from your location history.
        </p>
      </Section>

      <Section title="Sharing with third parties">
        <p>
          NyumbaLink does not sell personal data or provide it to unrelated parties for marketing. Limited data is
          processed by necessary service providers: cloud hosting, map providers, payment providers (e.g. M-Pesa via
          our payment partner), notification delivery, and object storage. These providers process data only as needed
          to deliver the services you request.
        </p>
      </Section>

      <Section title="Retention and security">
        <p>
          Data is retained while your account is active and as required by law. We apply encryption in transit,
          hashed passwords, access controls and audit logging of sensitive administrative actions. No system is
          perfectly secure; we encourage strong passwords and caution sharing sensitive documents.
        </p>
      </Section>

      <Section title="Your rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>Access and download your data.</li>
          <li>Correct inaccurate profile information.</li>
          <li>Delete your account (subject to legal retention requirements).</li>
          <li>Withdraw location permissions at any time from your device settings.</li>
          <li>Lodge a complaint with the Office of the Data Protection Commissioner (Kenya).</li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          The website uses essential cookies/local storage to keep you signed in and remember preferences. We do not
          use third-party advertising trackers.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          Material changes to this policy will be announced in-app. Questions? Contact{' '}
          <a href="mailto:privacy@hytechsolution.co.ke" className="font-semibold text-primary hover:underline">
            privacy@hytechsolution.co.ke
          </a>.
        </p>
      </Section>
    </StaticPage>
  );
}
