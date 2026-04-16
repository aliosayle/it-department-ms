import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAccessToken } from '@/api/session'

/** Require a stored access token for all routes under this outlet. */
export function RequireAuth() {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
