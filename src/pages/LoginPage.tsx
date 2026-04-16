import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { isLiveApi } from '@/api/config'
import { loginWithPassword, getAccessToken, setSessionTokens } from '@/api/session'
import { queryClient } from '@/lib/queryClient'
import './formPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isLiveApi()) return
    if (getAccessToken()) navigate(from, { replace: true })
  }, [from, navigate])

  if (!isLiveApi()) {
    return <Navigate to="/" replace />
  }

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await loginWithPassword(login.trim(), password)
      setSessionTokens(res.accessToken, res.refreshToken)
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      void queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
      navigate(from === '/login' ? '/' : from, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form-page" style={{ maxWidth: 420, margin: '8vh auto' }}>
      <h1 style={{ marginTop: 0 }}>IT Portal</h1>
      <p className="form-page__hint">Sign in with your portal account.</p>
      {error ? <p className="form-page__error">{error}</p> : null}
      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <TextBox
          label="Login"
          labelMode="outside"
          value={login}
          onValueChanged={(e) => setLogin(String(e.value ?? ''))}
        />
        <TextBox
          mode="password"
          label="Password"
          labelMode="outside"
          value={password}
          onValueChanged={(e) => setPassword(String(e.value ?? ''))}
        />
        <Button
          text={busy ? 'Signing in…' : 'Sign in'}
          type="default"
          stylingMode="contained"
          disabled={busy}
          onClick={() => void submit()}
        />
      </div>
    </div>
  )
}
