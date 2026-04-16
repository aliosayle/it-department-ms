import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h2 className="not-found__title">Page not found</h2>
      <p className="not-found__text">
        The page you requested is not available in this portal build.
      </p>
      <Button
        text="Back to dashboard"
        type="default"
        stylingMode="contained"
        onClick={() => navigate('/')}
      />
    </div>
  )
}
