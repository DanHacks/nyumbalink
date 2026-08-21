import { useState } from 'react';
import StaticPage, { Section } from './StaticPage';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in your name, email and message.');
      return;
    }
    // Support ticketing is not yet available in the backend; use email for now.
    window.location.href = `mailto:support@hytechsolution.co.ke?subject=${encodeURIComponent(
      `[NyumbaLink] ${form.subject || 'Support request'}`
    )}&body=${encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`)}`;
    setSent(true);
  };

  return (
    <StaticPage
      title="Contact us"
      description="Questions, feedback or a scam to report? We read everything."
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <Section title="Direct contacts">
          <ul className="space-y-2 text-sm">
            <li><strong className="text-foreground">General support:</strong> support@hytechsolution.co.ke</li>
            <li><strong className="text-foreground">Safety and scams:</strong> safety@hytechsolution.co.ke</li>
            <li><strong className="text-foreground">Partnerships:</strong> partners@hytechsolution.co.ke</li>
            <li><strong className="text-foreground">Hours:</strong> Mon–Sat, 8am–6pm EAT</li>
          </ul>
        </Section>

        <Section title="Send a message">
          {sent ? (
            <p className="rounded-lg bg-muted p-4 text-sm">
              Your email app should have opened with the message. If not, write to us directly at
              support@hytechsolution.co.ke.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Your email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              <textarea
                className="min-h-[110px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="How can we help?"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Send message
              </button>
            </form>
          )}
        </Section>
      </div>
    </StaticPage>
  );
}
