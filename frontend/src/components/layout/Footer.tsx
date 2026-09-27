import { Link } from 'react-router-dom';
import { Quote, Mail } from 'lucide-react';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'For tenants',
    links: [
      { label: 'Browse homes', to: '/explore' },
      { label: 'Student housing', to: '/universities' },
      { label: 'Rent calculator', to: '/calculator' },
      { label: 'Saved homes', to: '/saved' },
      { label: 'My viewings', to: '/viewings' },
    ],
  },
  {
    title: 'For owners',
    links: [
      { label: 'List a property', to: '/properties/create' },
      { label: 'Owner dashboard', to: '/dashboard' },
      { label: 'Pricing plans', to: '/pricing' },
      { label: 'Get verified', to: '/register' },
      { label: 'Advertise with us', to: '/contact' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Hostels', to: '/explore?kind=hostel' },
      { label: 'Apartments', to: '/explore?kind=apartment' },
      { label: 'Help centre', to: '/help' },
      { label: 'Help & safety', to: '/safety' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Terms of service', to: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-secondary text-slate-200">
      {/* Mission band — the closing statement, Boma Yangu style */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <Quote className="h-6 w-6 text-primary" aria-hidden />
              <p className="mt-3 text-lg font-medium leading-relaxed text-white">
                A safe, affordable home is the first step to studying well, working well and living well.
                NyumbaLink exists so that every student and every local can find one — verified, on the map,
                and within budget.
              </p>
            </div>
            <p className="shrink-0 text-sm text-slate-400">
              For enquiries, visit our{' '}
              <Link to="/contact" className="font-semibold text-orange-400 hover:underline">
                contact page
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <img src="/logo.png" alt="NyumbaLink" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
              <h3 className="text-lg font-bold text-white">
                Nyumba<span className="text-orange-400">Link</span>
              </h3>
            </Link>
            <p className="text-sm text-slate-300">Find verified homes. Move with confidence.</p>
            <p className="mt-2 text-sm text-slate-400">
              Verified rental homes, hostels and short stays across Kenya — built for students and locals.
            </p>
            <a
              href="mailto:hello@nyumbalink.co.ke"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 transition hover:border-orange-400 hover:text-orange-400"
            >
              <Mail className="h-4 w-4" aria-hidden /> hello@nyumbalink.co.ke
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="transition hover:text-orange-400">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-sm text-slate-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} NyumbaLink. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="transition hover:text-orange-400">
              Terms &amp; Conditions
            </Link>
            <Link to="/privacy" className="transition hover:text-orange-400">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
