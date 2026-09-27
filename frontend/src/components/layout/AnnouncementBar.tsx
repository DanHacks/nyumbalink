import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Megaphone, X } from 'lucide-react';

/** Rotating top strip modelled on the Boma Yangu announcement bar. */
const NOTICES = [
  {
    text: 'Rent affordability calculator is live — know what you can afford before you pay a deposit.',
    cta: 'Calculate now',
    to: '/calculator',
  },
  {
    text: 'Intake season: verified hostels near JKUAT, Kenyatta University and Egerton are filling fast.',
    cta: 'Browse hostels',
    to: '/universities',
  },
  {
    text: 'Every home is GPS-verified with on-site photos — never pay for a house you have not seen on the map.',
    cta: 'See how it works',
    to: '/how-it-works',
  },
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % NOTICES.length), 6000);
    return () => window.clearInterval(timer);
  }, [dismissed]);

  if (dismissed) return null;
  const notice = NOTICES[index];

  return (
    <div className="bg-gradient-to-r from-primary via-orange-500 to-primary text-white">
      <div className="mx-auto flex min-h-10 max-w-7xl items-center gap-3 px-6 py-1.5 text-xs sm:text-sm">
        <Megaphone className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
        <div className="min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="truncate font-medium"
            >
              {notice.text}{' '}
              <Link
                to={notice.to}
                className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:text-orange-100"
              >
                {notice.cta} <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex" role="tablist" aria-label="Announcements">
          {NOTICES.map((n, i) => (
            <button
              key={n.to}
              role="tab"
              aria-selected={i === index}
              aria-label={`Announcement ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition ${i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded p-1 hover:bg-white/20"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
