import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useHotels } from '../hotels/useHotels';

export function HotelsPage() {
  const { hotels, loading, error } = useHotels();
  const { isAdmin, isAuthenticated } = useAuth();

  return (
    <section>
      <div className="page-header">
        <h1>Hotels</h1>
        {isAdmin && <Link className="button" to="/hotels/new">+ Add hotel</Link>}
      </div>
      {!isAuthenticated && <p className="muted">Sign in to see hotels.</p>}
      {loading && <p className="muted">Loading hotels…</p>}
      {error && <p role="alert">Could not load hotels: {error}</p>}
      <ul className="cards">
        {hotels.map((hotel) => (
          <li key={hotel.id} className="card">
            {hotel.imageUrl && <img className="card-image" src={hotel.imageUrl} alt={hotel.name} />}
            <h2>{hotel.name}</h2>
            <p className="muted">{hotel.city}, {hotel.country} · ★ {hotel.rating}</p>
            <p>{hotel.description}</p>
            <strong>${hotel.pricePerNight} / night</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
