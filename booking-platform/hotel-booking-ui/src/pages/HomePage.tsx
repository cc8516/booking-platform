import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section>
      <h1>Find your next stay</h1>
      <p>Browse hotels and manage your bookings. Sign in with Amazon Cognito to book.</p>
      <Link className="button" to="/hotels">Browse hotels</Link>
    </section>
  );
}
