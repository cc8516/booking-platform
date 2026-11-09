import { mockApiUrl } from '../config/env';

/**
 * Sends the hotel photo to the API Gateway mock as multipart/form-data.
 * Do not set Content-Type manually: the browser adds the multipart boundary.
 * Resolves with the HTTP status.
 */
export async function uploadHotelPhoto(photo: Blob, fileName: string): Promise<number> {
  const form = new FormData();
  form.append('photo', photo, fileName);

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
