import { mockApiUrl } from '../config/env';
import type { NewHotel } from '../types/hotel';

export interface CreateHotelRequest {
  hotel: NewHotel;
  /** Processed photo, if the admin chose one. */
  photo?: Blob;
  photoFileName?: string;
  userId: string;
  idToken: string;
}

/**
 * Posts a new hotel to the API Gateway mock as multipart/form-data.
 * Do not set Content-Type manually: the browser adds the multipart boundary.
 * Resolves with the HTTP status.
 */
export async function createHotel({
  hotel,
  photo,
  photoFileName = 'photo.jpg',
  userId,
  idToken,
}: CreateHotelRequest): Promise<number> {
  const form = new FormData();
  form.append('hotelName', hotel.name);
  form.append('hotelRating', String(hotel.rating));
  form.append('hotelCity', hotel.city);
  form.append('hotelCountry', hotel.country);
  form.append('hotelPrice', String(hotel.pricePerNight));
  form.append('hotelDescription', hotel.description);
  if (photo) form.append('photo', photo, photoFileName);
  form.append('userId', userId);
  form.append('idToken', idToken);

  let response: Response;
  try {
    response = await fetch(mockApiUrl, { method: 'POST', body: form });
  } catch {
    // A network-level failure here is usually CORS: the request may have reached the API,
    // but the browser hides a response that lacks Access-Control-Allow-Origin.
    throw new Error('Blocked by browser (likely CORS: enable CORS on the API Gateway resource)');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.status;
}
