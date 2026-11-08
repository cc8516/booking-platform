import { createContext } from 'react';
import type { Hotel, NewHotel } from '../types/hotel';

export interface HotelsContextValue {
  hotels: Hotel[];
  addHotel: (hotel: NewHotel) => Hotel;
}

export const HotelsContext = createContext<HotelsContextValue | undefined>(undefined);
