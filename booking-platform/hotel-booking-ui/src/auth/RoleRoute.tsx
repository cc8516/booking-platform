import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

interface RoleRouteProps {
  /** Which role may see the nested routes. Must be used inside <ProtectedRoute>. */
  role: 'admin' | 'hotelManager';
}

/**
 * UI-level guard only. The .NET API must enforce the same group check,
 * since anything in the browser can be bypassed.
 */
export function RoleRoute({ role }: RoleRouteProps) {
  const { isAdmin, isHotelManager } = useAuth();
  const allowed = role === 'admin' ? isAdmin : isHotelManager;

  if (!allowed) {
    return (
      <section>
        <h1>Access denied</h1>
        <p className="error">You don't have permission to view this page.</p>
        <Link to="/hotels">Back to hotels</Link>
      </section>
    );
  }
  return <Outlet />;
}
