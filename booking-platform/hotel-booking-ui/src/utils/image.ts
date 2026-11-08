export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1024;

/**
 * Validates an image file, downsizes it to at most 1024px on the longest side,
 * and returns a JPEG data URL. Downsizing keeps it small enough for localStorage.
 * Throws an Error with a user-friendly message on failure.
 */
export async function processImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG or WebP image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not read that image file.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not supported in this browser.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.8);
}
