import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { hotels as seedHotels } from '../data/hotels';
import type { Hotel, NewHotel } from '../types/hotel';
import { HotelsContext, type HotelsContextValue } from './hotelsContext';

const STORAGE_KEY = 'hotels';

function loadHotels(): Hotel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Hotel[];
  } catch {
    /* fall through to seed data */
  }
  return seedHotels;
}

/**
 * Temporary store: hotels persist in localStorage until the .NET API exists.
 * Replace addHotel with an API call (POST /hotels) when the backend is ready.
 */
export function HotelsProvider({ children }: { children: ReactNode }) {
  const [hotels, setHotels] = useState<Hotel[]>(loadHotels);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hotels));
    } catch {
      /* storage unavailable; keep in-memory only */
    }
  }, [hotels]);

  const addHotel = useCallback((input: NewHotel): Hotel => {
    const hotel: Hotel = { ...input, id: crypto.randomUUID() };
    setHotels((prev) => [...prev, hotel]);
    return hotel;
  }, []);

  const value = useMemo<HotelsContextValue>(() => ({ hotels, addHotel }), [hotels, addHotel]);
  return <HotelsContext.Provider value={value}>{children}</HotelsContext.Provider>;
}
