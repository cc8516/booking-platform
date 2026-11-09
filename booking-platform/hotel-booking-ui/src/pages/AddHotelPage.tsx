import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createHotel } from '../api/mockApi';
import { useAuth } from '../auth/useAuth';
import { useHotels } from '../hotels/useHotels';
import { ACCEPTED_IMAGE_TYPES, processImage } from '../utils/image';

interface FormState {
  name: string;
  city: string;
  country: string;
  pricePerNight: string;
  rating: string;
  description: string;
}

const emptyForm: FormState = {
  name: '', city: '', country: '', pricePerNight: '', rating: '', description: '',
};

export function AddHotelPage() {
  const { addHotel } = useHotels();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageLoading, setImageLoading] = useState(false);
  const [photoName, setPhotoName] = useState('photo.jpg');
  const [saving, setSaving] = useState(false);
  const { session } = useAuth();

  const update = (field: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setError(null);
    setImageLoading(true);
    try {
      setImageUrl(await processImage(file));
      setPhotoName(file.name.replace(/\.[^.]+$/, '') + '.jpg');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const price = Number(form.pricePerNight);
    const rating = Number(form.rating);

    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) {
      return setError('Name, city and country are required.');
    }
    if (!(price > 0)) return setError('Price per night must be greater than 0.');
    if (!(rating >= 0 && rating <= 5)) return setError('Rating must be between 0 and 5.');

    if (!session) return setError('You must be signed in to save a hotel.');

    const hotel = {
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      pricePerNight: price,
      rating,
      description: form.description.trim(),
      imageUrl,
    };

    setError(null);
    setSaving(true);
    try {
      const photo = imageUrl ? await (await fetch(imageUrl)).blob() : undefined;
      await createHotel({
        hotel,
        photo,
        photoFileName: photoName,
        userId: session.user.sub,
        tokens: session.tokens,
      });
      addHotel(hotel); // keep the local list in sync until the list is loaded from the API
      navigate('/hotels');
    } catch (err) {
      setError(`Saving to the API failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>Add hotel</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>Name<input value={form.name} onChange={update('name')} required /></label>
        <label>City<input value={form.city} onChange={update('city')} required /></label>
        <label>Country<input value={form.country} onChange={update('country')} required /></label>
        <label>Price per night ($)
          <input type="number" min="0" step="0.01" value={form.pricePerNight} onChange={update('pricePerNight')} required />
        </label>
        <label>Rating (0–5)
          <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={update('rating')} required />
        </label>
        <label>Description
          <textarea rows={3} value={form.description} onChange={update('description')} />
        </label>
        <label>Photo
          <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={handleImageChange} />
        </label>
        {imageLoading && <p className="muted">Processing image…</p>}
        {imageUrl && (
          <div className="photo-preview">
            <img src={imageUrl} alt="Hotel preview" />
            <button type="button" className="secondary" onClick={() => setImageUrl(undefined)}>
              Remove photo
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={imageLoading || saving}>{saving ? 'Saving…' : 'Save hotel'}</button>
          <Link to="/hotels">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
