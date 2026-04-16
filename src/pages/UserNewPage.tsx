import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { isLiveApi } from '@/api/config'
import { portalCreatePortalUser } from '@/api/mutations'
import { useCan } from '@/auth/AuthContext'
import './formPage.css'

export function UserNewPage() {
  const navigate = useNavigate()
  const perm = useCan('users')
  const [login, setLogin] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const live = isLiveApi()

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create users.')
      return
    }
    if (!live) {
      setError('Creating users requires the REST API (VITE_API_BASE_URL).')
      return
    }
    const l = login.trim()
    const d = displayName.trim()
    if (l.length < 2) {
      setError('Login must be at least 2 characters.')
      return
    }
    if (!d) {
      setError('Display name is required.')
      return
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await portalCreatePortalUser({ login: l, displayName: d, password })
      if (!res.ok) {
        setError(res.error)
        return
      }
      navigate(`/admin/users/${encodeURIComponent(res.user.id)}`, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form-page form-page--wide">
      <h1 style={{ marginTop: 0 }}>New portal user</h1>
      <p className="form-page__hint">
        New accounts start with <strong>no access</strong> to application areas. After saving, assign permissions on
        the next screen. Another administrator must edit your own access if needed — you cannot grant yourself rights.
      </p>
      {error ? <p className="form-page__error">{error}</p> : null}
      {!live ? (
        <p className="form-page__error">The API is not configured; user creation is unavailable in this build.</p>
      ) : null}

      <div className="form-page__section" style={{ display: 'grid', gap: 14, maxWidth: 480, marginTop: 16 }}>
        <TextBox
          label="Login"
          labelMode="outside"
          value={login}
          onValueChanged={(e) => setLogin(String(e.value ?? ''))}
        />
        <TextBox
          label="Display name"
          labelMode="outside"
          value={displayName}
          onValueChanged={(e) => setDisplayName(String(e.value ?? ''))}
        />
        <TextBox
          mode="password"
          label="Password (min 10 characters)"
          labelMode="outside"
          value={password}
          onValueChanged={(e) => setPassword(String(e.value ?? ''))}
        />
        <TextBox
          mode="password"
          label="Confirm password"
          labelMode="outside"
          value={password2}
          onValueChanged={(e) => setPassword2(String(e.value ?? ''))}
        />
      </div>

      <div className="form-page__actions" style={{ marginTop: 24 }}>
        <Button
          text={busy ? 'Creating…' : 'Create user'}
          type="default"
          stylingMode="contained"
          disabled={!perm.create || !live || busy}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/admin/users')} />
      </div>
    </div>
  )
}
