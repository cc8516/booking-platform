import { useAuth } from '../auth/useAuth';

export function BookingsPage() {
  const { session } = useAuth();
  const user = session?.user;

  return (
    <section>
      <h1>My Bookings</h1>
      <p>Signed in as <strong>{user?.email ?? user?.username}</strong>.</p>
      <p className="muted">Bookings will load from the .NET API once it is connected.</p>
    </section>
  );
}
