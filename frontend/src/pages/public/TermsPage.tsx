import StaticPage, { Section } from './StaticPage';

export default function TermsPage() {
  return (
    <StaticPage
      title="Terms of service"
      description="The rules that keep NyumbaLink trustworthy for everyone."
    >
      <p className="text-sm text-muted-foreground">
        Last updated: August 2026. By creating an account you agree to these terms.
      </p>

      <Section title="User responsibilities">
        <p>
          Provide accurate information, keep your credentials secure, and use the platform lawfully. One person may
          maintain a single account; roles (tenant, owner, caretaker, admin) are managed by the platform.
        </p>
      </Section>

      <Section title="Owner responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>Submit truthful property information: real photos, real videos, real locations and prices.</li>
          <li>Provide ownership or management authorization documents when requested.</li>
          <li>Keep availability and pricing up to date.</li>
          <li>Respond to viewing requests and bookings in good time.</li>
        </ul>
        <p>
          Knowingly submitting false location or media information triggers verification review and may lead to
          suspension and blacklisting.
        </p>
      </Section>

      <Section title="Tenant and student responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>Attend confirmed viewings or cancel in advance.</li>
          <li>Use the platform's booking flow rather than side arrangements that forfeit platform protections.</li>
          <li>Leave honest reviews based on genuine interactions only.</li>
        </ul>
      </Section>

      <Section title="Bookings, viewings and cancellation">
        <p>
          Bookings follow the states shown on your dashboard (pending → confirmed → checked-in → completed). You can
          cancel free of charge before a viewing starts; repeated no-shows may limit future booking privileges.
          Cancellation consequences and refund rules are displayed before you confirm any cancellation — bookings are
          never silently cancelled.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Payments are processed in KES via supported providers (M-Pesa first). Transaction records include IDs,
          amounts and timestamps. Refunds follow the policy shown at booking time and applicable Kenyan law.
        </p>
      </Section>

      <Section title="Reviews, reports and fraud">
        <p>
          Reviews must reflect genuine experiences; fake reviews, spam and abuse are removed. Scam reports are
          investigated by our team. A property is not presumed fraudulent merely because it was reported —
          investigations weigh report quality, distinct reporters and verified positive experiences. Outcomes range
          from cleared to monitored, restricted, suspended or blacklisted.
        </p>
      </Section>

      <Section title="Verification and account suspension">
        <p>
          Verification badges are earned through document and media review. We may suspend accounts or listings that
          violate these terms, pending investigation, and will communicate the reason where legally permitted.
        </p>
      </Section>

      <Section title="Disputes and third-party services">
        <p>
          Tenancy agreements are between owners and tenants; NyumbaLink provides discovery, verification, booking
          tooling and records. Map, payment, hosting and notification providers process data as described in our{' '}
          <a href="/privacy" className="font-semibold text-primary hover:underline">privacy policy</a>.
        </p>
      </Section>
    </StaticPage>
  );
}
