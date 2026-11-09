import { apiAuthConfig, mockApiUrl } from '../config/env';
import type { AuthTokens } from '../auth/types';
import type { NewHotel } from '../types/hotel';

export interface CreateHotelRequest {
  hotel: NewHotel;
  /** Processed photo, if the admin chose one. */
  photo?: Blob;
  photoFileName?: string;
  userId: string;
  tokens: AuthTokens;
}

function authorizationHeader(tokens: AuthTokens): string {
  const token = apiAuthConfig.token === 'id' ? tokens.idToken : tokens.accessToken;
  return apiAuthConfig.scheme.toLowerCase() === 'none' ? token : `${apiAuthConfig.scheme} ${token}`;
}

/**
 * Posts a new hotel to the API Gateway mock as multipart/form-data.
 * Sends the Cognito token in the Authorization header. Do not set Content-Type manually:
 * the browser adds the multipart boundary.
 * Resolves with the HTTP status.
 */
export async function createHotel({
  hotel,
  photo,
  photoFileName = 'photo.jpg',
  userId,
  tokens,
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
  form.append('idToken', tokens.idToken);

  let response: Response;
  try {
    response = await fetch(mockApiUrl, {
      method: 'POST',
      headers: { Authorization: authorizationHeader(tokens) },
      body: form,
    });
  } catch {
    // A network-level failure here is usually CORS: the request may have reached the API,
    // but the browser hides a response that lacks Access-Control-Allow-Origin.
    throw new Error('Blocked by browser (likely CORS: enable CORS on the API Gateway resource)');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.status;
}
