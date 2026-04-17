import type { ReactNode } from 'react'
import Button from 'devextreme-react/button'
import { Link } from 'react-router-dom'
import type { PortalBootstrapResult } from '@/api/usePortalBootstrap'
import '@/pages/formPage.css'

/** Shown on product/stock routes when `VITE_API_BASE_URL` is not set (offline build). */
export function ApiRequiredNotice() {
  return (
    <div className="form-page form-page--wide" style={{ maxWidth: 640 }}>
      <p className="form-page__hint form-page__hint--warn">
        Product and stock views need a live API. Set <code>VITE_API_BASE_URL</code> to your portal API (for example{' '}
        <code>http://your-server:4000/api/v1</code>), rebuild the SPA, and sign in.
      </p>
      <p className="form-page__hint">
        <Link to="/">Dashboard</Link>
      </p>
    </div>
  )
}

export function BootstrapSignInNotice() {
  return (
    <div className="form-page form-page--wide" style={{ maxWidth: 640 }}>
      <p className="form-page__hint form-page__hint--warn">Sign in to load catalog and inventory data.</p>
      <p className="form-page__hint">
        <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

export function BootstrapLoadingPanel() {
  return (
    <div className="form-page form-page--wide" aria-busy="true">
      <p className="form-page__hint" style={{ marginTop: '1rem' }}>
        Loading inventory…
      </p>
    </div>
  )
}

export function BootstrapErrorPanel({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="form-page form-page--wide" style={{ maxWidth: 640 }}>
      <p className="form-page__error">{error.message}</p>
      <Button text="Retry" type="default" stylingMode="contained" onClick={onRetry} />
    </div>
  )
}

/** Standard gates for product/stock pages using `usePortalBootstrap`. */
export function renderBootstrapGate(b: PortalBootstrapResult): ReactNode {
  if (!b.isLive) return <ApiRequiredNotice />
  if (b.isIdleAuth) return <BootstrapSignInNotice />
  if (b.isPending) return <BootstrapLoadingPanel />
  if (b.isError && b.error) return <BootstrapErrorPanel error={b.error} onRetry={b.refetch} />
  return null
}
