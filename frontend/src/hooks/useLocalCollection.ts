import { useCallback, useEffect, useState } from 'react';

/**
 * Local-first collection (favourites, saved searches, viewing requests).
 * Mirrors the shape of the future API resources (/favorites, /saved-searches,
 * /viewings) so swapping the persistence layer touches only this hook.
 */
export function useLocalCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupt cache */
    }
  }, [key]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full or unavailable */
      }
    },
    [key],
  );

  const add = useCallback((item: T) => persist([...items.filter((i) => i.id !== item.id), item]), [items, persist]);
  const remove = useCallback((id: string) => persist(items.filter((i) => i.id !== id)), [items, persist]);
  const toggle = useCallback(
    (item: T) => (items.some((i) => i.id === item.id) ? remove(item.id) : add(item)),
    [items, add, remove],
  );
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);
  const clear = useCallback(() => persist([]), [persist]);

  return { items, add, remove, toggle, has, clear };
}