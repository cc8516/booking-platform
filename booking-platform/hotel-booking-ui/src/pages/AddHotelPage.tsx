import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHotels } from '../hotels/useHotels';

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

  const update = (field: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const price = Number(form.pricePerNight);
    const rating = Number(form.rating);

    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) {
      return setError('Name, city and country are required.');
    }
    if (!(price > 0)) return setError('Price per night must be greater than 0.');
    if (!(rating >= 0 && rating <= 5)) return setError('Rating must be between 0 and 5.');

    addHotel({
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      pricePerNight: price,
      rating,
      description: form.description.trim(),
    });
    navigate('/hotels');
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
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit">Save hotel</button>
          <Link to="/hotels">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
