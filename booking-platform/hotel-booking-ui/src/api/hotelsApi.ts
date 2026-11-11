import { hotelImagesBaseUrl, hotelsApiUrl } from '../config/env';
import type { AuthTokens } from '../auth/types';
import type { Hotel } from '../types/hotel';

/** Raw item from the .NET list endpoint (property casing varies, so keys are matched case-insensitively). */
type RawHotel = Record<string, unknown>;

function pick(raw: RawHotel, key: string): unknown {
  const match = Object.keys(raw).find((k) => k.toLowerCase() === key.toLowerCase());
  return match === undefined ? undefined : raw[match];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function imageUrlFor(fileName: string): string | undefined {
  if (!fileName || !hotelImagesBaseUrl) return undefined;
  return `${hotelImagesBaseUrl}/${encodeURIComponent(fileName)}`;
}

function toHotel(raw: RawHotel): Hotel {
  const fileName = str(pick(raw, 'fileName'));
  return {
    id: str(pick(raw, 'id')),
    name: str(pick(raw, 'name')),
    city: str(pick(raw, 'city')),
    country: str(pick(raw, 'country')),
    description: str(pick(raw, 'description')),
    rating: num(pick(raw, 'rating')),
    pricePerNight: num(pick(raw, 'price')),
    imageUrl: str(pick(raw, 'imageUrl')) || imageUrlFor(fileName),
  };
}

/** GET the signed-in user's hotels (the backend reads the user from the id token's `sub`). */
export async function fetchHotels(tokens: AuthTokens): Promise<Hotel[]> {
  const url = new URL(hotelsApiUrl);
  url.searchParams.set('token', tokens.idToken);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Blocked by browser (likely CORS on the hotels API)');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Unexpected response from hotels API');
  return data.filter((x): x is RawHotel => typeof x === 'object' && x !== null).map(toHotel);
}
