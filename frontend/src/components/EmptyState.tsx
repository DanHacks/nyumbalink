import { LucideIcon, Home, SearchX, CloudOff, Heart } from 'lucide-react';

interface Props {
  icon?: 'home' | 'search' | 'offline' | 'heart';
  title: string;
  message?: string;
  action?: React.ReactNode;
}

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  search: SearchX,
  offline: CloudOff,
  heart: Heart,
};

export default function EmptyState({ icon = 'home', title, message, action }: Props) {
  const Icon = ICONS[icon] || Home;
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
