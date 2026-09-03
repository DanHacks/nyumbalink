import { useEffect, useState } from 'react';
import api from '@/lib/api';

export function useGoogleMapsKey() {
  const [key, setKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/maps/config')
      .then((res) => {
        if (cancelled) return;
        const k = res.data?.google_maps_api_key;
        if (k) setKey(k);
        else setError('No Maps key configured');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load Maps config');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { key, loading, error };
}
