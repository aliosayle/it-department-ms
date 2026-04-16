import { Link, useLocation } from 'react-router-dom'
import Button from 'devextreme-react/button'

type AccessDeniedLocationState = { reason?: 'api' }

export function AccessDeniedPage() {
  const location = useLocation()
  const fromApi = (location.state as AccessDeniedLocationState | null)?.reason === 'api'

  return (
    <div className="form-page" style={{ maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>Access denied</h2>
      <p>
        {fromApi
          ? 'The server refused this action because your account does not have the required permission.'
          : 'You do not have permission to view this page.'}
      </p>
      <Link to="/">
        <Button text="Back to dashboard" type="default" stylingMode="contained" />
      </Link>
    </div>
  )
}
