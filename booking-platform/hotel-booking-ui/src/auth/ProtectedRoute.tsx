import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/** Redirects unauthenticated users to the Cognito Hosted UI. */
export function ProtectedRoute() {
  const { isAuthenticated, signIn } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) signIn(location.pathname + location.search);
  }, [isAuthenticated, signIn, location.pathname, location.search]);

  if (!isAuthenticated) return <p className="status">Redirecting to sign in…</p>;
  return <Outlet />;
}
