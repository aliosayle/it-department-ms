import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import CheckBox from 'devextreme-react/check-box'
import { ALL_PAGE_KEYS } from '@/auth/pageKeys'
import { useCan } from '@/auth/AuthContext'
import { portalUpdatePortalUser } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import type { PageCrud, PageKey } from '@/mocks/domain/types'
import './formPage.css'

function clonePerms(p: Record<PageKey, PageCrud>): Record<PageKey, PageCrud> {
  const out = {} as Record<PageKey, PageCrud>
  for (const k of ALL_PAGE_KEYS) {
    out[k] = { ...p[k] }
  }
  return out
}

export function UserPermissionsPage() {
  const { userId = '' } = useParams<{ userId: string }>()
  const snap = useMockStore()
  const navigate = useNavigate()
  const usersPerm = useCan('users')
  const target = useMemo(() => snap.users.find((u) => u.id === userId), [snap.users, userId])
  const [perms, setPerms] = useState<Record<PageKey, PageCrud> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!target) return
    queueMicrotask(() => {
      setPerms(clonePerms(target.permissions))
      setSaved(false)
    })
  }, [target])

  const actions: (keyof PageCrud)[] = useMemo(() => ['view', 'edit', 'delete', 'create'], [])

  const setFlag = (page: PageKey, action: keyof PageCrud, value: boolean) => {
    setPerms((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [page]: { ...prev[page], [action]: value },
      }
    })
    setSaved(false)
  }

  const save = async () => {
    setError(null)
    setSaved(false)
    if (!perms || !usersPerm.edit) return
    const result = await portalUpdatePortalUser(userId, perms)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
  }

  if (!target || !perms) {
    return (
      <p>
        User not found.{' '}
        <Link to="/admin/users">
          <Button text="Back" />
        </Link>
      </p>
    )
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      {saved ? <p className="form-page__hint">Saved.</p> : null}
      <h2 style={{ marginTop: 0 }}>{target.displayName}</h2>
      <p className="form-page__hint">Login: {target.login}</p>
      {!usersPerm.edit ? (
        <p className="form-page__hint">You can view this matrix but not change it.</p>
      ) : null}

      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Application areas
      </p>
      <div
        style={{
          display: 'grid',
          gap: 12,
          marginTop: 8,
          maxHeight: '60vh',
          overflow: 'auto',
        }}
      >
        {ALL_PAGE_KEYS.map((page) => (
          <fieldset
            key={page}
            style={{ border: '1px solid var(--border-subtle, #ccc)', padding: 12, margin: 0 }}
          >
            <legend style={{ padding: '0 8px' }}>{page}</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {actions.map((action) => (
                <CheckBox
                  key={`${page}-${action}`}
                  text={action}
                  readOnly={!usersPerm.edit}
                  value={perms[page][action]}
                  onValueChanged={(e) => {
                    if (!usersPerm.edit) return
                    setFlag(page, action, Boolean(e.value))
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="form-page__actions" style={{ marginTop: 20 }}>
        {usersPerm.edit ? (
          <Button text="Save" type="default" stylingMode="contained" onClick={save} />
        ) : null}
        <Button text="Back" onClick={() => navigate('/admin/users')} />
      </div>
    </div>
  )
}
