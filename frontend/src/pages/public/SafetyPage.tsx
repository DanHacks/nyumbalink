import StaticPage, { Section } from './StaticPage';

const TIPS = [
  {
    title: 'Never send rent before viewing',
    body: 'No legitimate owner on NyumbaLink will ask for full rent or deposit via M-Pesa before you have seen the property or had a verified video walkthrough.',
  },
  {
    title: 'Check the verification badges',
    body: 'Verified Owner and Verified Property badges mean our team reviewed identity documents and property media. Unverified listings are not necessarily scams — but treat them with extra care.',
  },
  {
    title: 'Watch the walkthrough video',
    body: 'Real owners upload real videos. If photos look too polished or prices are far below market, compare with the video and the map location.',
  },
  {
    title: 'Meet in public, go during the day',
    body: 'Schedule viewings during daylight. Share your viewing details with a friend — bookings include date, time and caretaker contact.',
  },
  {
    title: 'Keep communication in the app',
    body: 'In-app messages create a record that protects both sides if something goes wrong.',
  },
  {
    title: 'Report suspicious listings',
    body: 'Use the Report button on any property. Reports from distinct users trigger fraud investigations by our team.',
  },
];

export default function SafetyPage() {
  return (
    <StaticPage
      title="Safety center"
      description="How to avoid rental scams, how verification works, and what to do when something feels wrong."
    >
      <Section title="How verification works">
        <p>
          Owners submit their national ID or passport plus ownership or management authorization documents. Our
          verification team reviews submissions before an owner earns the Verified Owner badge. Properties additionally
          need GPS-stamped photos and, where available, walkthrough videos before earning Verified Property status.
        </p>
        <p>Media on NyumbaLink is classified as Verified, Under Review, Unverified or Rejected — you can always see the difference.</p>
      </Section>

      <Section title="Six rules for safe house-hunting">
        <div className="grid gap-4 sm:grid-cols-2">
          {TIPS.map((t) => (
            <div key={t.title} className="rounded-xl border p-4">
              <h3 className="font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1 text-sm">{t.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Safe payments">
        <p>
          Payments made through NyumbaLink (M-Pesa) are tracked with transaction IDs and receipts. Never pay outside
          the platform for a booking you made inside it. If someone pressures you to pay "reservation fees" directly,
          report the listing.
        </p>
      </Section>

      <Section title="Report a scam">
        <p>
          Open the property page and tap <strong className="text-foreground">Report</strong>, or email{' '}
          <a href="mailto:safety@hytechsolution.co.ke" className="font-semibold text-primary hover:underline">
            safety@hytechsolution.co.ke
          </a>
          . Serious reports are investigated; fraudulent accounts are suspended and blacklisted.
        </p>
      </Section>
    </StaticPage>
  );
}
