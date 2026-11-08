import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useHotels } from '../hotels/useHotels';

export function HotelsPage() {
  const { hotels } = useHotels();
  const { isAdmin } = useAuth();

  return (
    <section>
      <div className="page-header">
        <h1>Hotels</h1>
        {isAdmin && <Link className="button" to="/hotels/new">+ Add hotel</Link>}
      </div>
      <ul className="cards">
        {hotels.map((hotel) => (
          <li key={hotel.id} className="card">
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
