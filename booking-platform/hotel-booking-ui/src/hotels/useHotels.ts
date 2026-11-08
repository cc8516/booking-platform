import { useContext } from 'react';
import { HotelsContext, type HotelsContextValue } from './hotelsContext';

export function useHotels(): HotelsContextValue {
  const ctx = useContext(HotelsContext);
  if (!ctx) throw new Error('useHotels must be used within <HotelsProvider>');
  return ctx;
}
