import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function Header() {
  const { isAuthenticated, session, signIn, signOut } = useAuth();

  return (
    <header className="header">
      <Link to="/" className="brand">🏨 StayBook</Link>
      <nav className="nav">
        <NavLink to="/hotels">Hotels</NavLink>
        <NavLink to="/bookings">My Bookings</NavLink>
      </nav>
      <div className="user">
        {isAuthenticated ? (
          <>
            <span>{session?.user.email ?? session?.user.username}</span>
            <button onClick={signOut}>Sign out</button>
          </>
        ) : (
          <button onClick={() => signIn()}>Sign in</button>
        )}
      </div>
    </header>
  );
}
