import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchHotels } from '../api/hotelsApi';
import { useAuth } from '../auth/useAuth';
import type { Hotel, NewHotel } from '../types/hotel';
import { HotelsContext, type HotelsContextValue } from './hotelsContext';

/** Loads hotels (with image URLs) from the API for the signed-in user. */
export function HotelsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const tokens = session?.tokens ?? null;
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!tokens) {
      setHotels([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHotels(tokens)
      .then((list) => {
        if (!cancelled) setHotels(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load hotels');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tokens, reloadKey]);

  const addHotel = useCallback((input: NewHotel): Hotel => {
    const hotel: Hotel = { ...input, id: crypto.randomUUID() };
    setHotels((prev) => [...prev, hotel]);
    return hotel;
  }, []);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo<HotelsContextValue>(
    () => ({ hotels, loading, error, addHotel, refresh }),
    [hotels, loading, error, addHotel, refresh],
  );
  return <HotelsContext.Provider value={value}>{children}</HotelsContext.Provider>;
}
