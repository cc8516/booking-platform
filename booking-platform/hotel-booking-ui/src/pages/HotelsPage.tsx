import { hotels } from '../data/hotels';

export function HotelsPage() {
  return (
    <section>
      <h1>Hotels</h1>
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
