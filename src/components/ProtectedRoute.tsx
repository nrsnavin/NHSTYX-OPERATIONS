import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import type { Role } from '../types';

interface ProtectedRouteProps {
  roles?: Role[];
}

/**
 * Gates child routes behind authentication and (optionally) a role allowlist.
 * The operations console is for ADMIN and AGENT users only.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const location = useLocation();
  const { accessToken, user } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
