import { createContext } from 'react';
import type { Hotel, NewHotel } from '../types/hotel';

export interface HotelsContextValue {
  hotels: Hotel[];
  loading: boolean;
  error: string | null;
  addHotel: (hotel: NewHotel) => Hotel;
  refresh: () => void;
}

export const HotelsContext = createContext<HotelsContextValue | undefined>(undefined);
