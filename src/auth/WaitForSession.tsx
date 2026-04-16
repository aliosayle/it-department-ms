import { Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

/** When using the live API, blocks the shell until `GET /me` succeeds so RBAC is accurate. */
export function WaitForSession() {
  const { sessionReady } = useAuth()
  if (!sessionReady) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: 480, margin: '10vh auto' }}>
        <p style={{ margin: 0 }}>Signing in…</p>
      </div>
    )
  }
  return <Outlet />
}
