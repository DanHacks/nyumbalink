import { Link } from 'react-router-dom';
import { MapPin, Star, Wifi, Droplets, ShieldCheck, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchRoom {
  id: string;
  room_number?: string;
  house_type?: string;
  rent_amount: number;
  currency?: string;
  property_id?: string;
  property_name?: string;
  city?: string | null;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  student_friendly?: boolean;
  internet_available?: boolean;
  water_available?: boolean;
}

const HOUSE_LABELS: Record<string, string> = {
  bedsitter: 'Bedsitter',
  one_bedroom: '1 Bedroom',
  two_bedroom: '2 Bedroom',
  three_bedroom: '3 Bedroom',
  four_bedroom: '4 Bedroom',
  studio: 'Studio',
  shared: 'Shared',
  duplex: 'Duplex',
  single_room: 'Single Room',
  maisonette: 'Maisonette',
  villa: 'Villa',
  townhouse: 'Townhouse',
};

export function formatKes(amount?: number | null, currency = 'KES') {
  if (amount == null) return 'Price on request';
  return `${currency} ${Number(amount).toLocaleString('en-KE')}`;
}

export default function PropertyCard({
  room,
  className,
}: {
  room: SearchRoom;
  className?: string;
}) {
  const href = `/properties/${room.property_id || room.id}`;
  return (
    <Link
      to={href}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className="flex h-44 items-center justify-center bg-muted">
        <span className="text-sm text-muted-foreground">Photos verified by owner</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold group-hover:text-primary">
            {room.property_name || HOUSE_LABELS[room.house_type || ''] || 'Property'}
          </h3>
          <p className="shrink-0 font-bold text-primary">{formatKes(room.rent_amount, room.currency)}</p>
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {[room.city, room.county].filter(Boolean).join(', ') || 'Location on map'}
          {room.distance_km != null && (
            <span className="ml-auto text-xs">· {room.distance_km < 1 ? `${Math.round(room.distance_km * 1000)} m` : `${room.distance_km.toFixed(1)} km`}</span>
          )}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {room.house_type && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {HOUSE_LABELS[room.house_type] || room.house_type}
            </span>
          )}
          {room.internet_available && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-teal-700">
              <Wifi className="h-3 w-3" /> WiFi
            </span>
          )}
          {room.water_available && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-teal-700">
              <Droplets className="h-3 w-3" /> Water
            </span>
          )}
          {room.student_friendly && (
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-primary">
              <GraduationCap className="h-3 w-3" /> Student
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Verified
          </span>
        </div>
      </div>
    </Link>
  );
}
