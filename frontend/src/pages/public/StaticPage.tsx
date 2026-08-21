import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function StaticPage({ title, description, children }: Props) {
  usePageMeta(title, description);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 text-lg text-muted-foreground">{description}</p>}
      <div className="mt-10 space-y-10">{children}</div>
      <div className="mt-16 rounded-xl border bg-muted/40 p-6 text-center">
        <p className="font-semibold">Ready to find your place?</p>
        <Link to="/properties" className="mt-2 inline-block font-semibold text-primary hover:underline">
          Browse verified properties →
        </Link>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
