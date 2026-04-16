import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isLiveApi } from '@/api/config'
import { getAccessToken } from '@/api/session'

/** When `VITE_API_BASE_URL` is set, require a stored access token before showing the app shell. */
export function RequireAuth() {
  const location = useLocation()
  if (!isLiveApi()) return <Outlet />
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
