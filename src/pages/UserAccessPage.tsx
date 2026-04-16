import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import CheckBox from 'devextreme-react/check-box'
import { ALL_PAGE_KEYS } from '@/auth/pageKeys'
import { useMockStore } from '@/mocks/mockStore'
import { portalUpdateUserAccess } from '@/api'
import type { PageCrud, PageKey } from '@/mocks/domain/types'

export function UserAccessPage() {
  const { userId = '' } = useParams()
  const snap = useMockStore() as unknown as {
    users: Array<{ id: string; displayName: string; roleIds?: string[]; permissions: Record<PageKey, PageCrud> }>
    roles?: Array<{ id: string; name: string }>
  }
  const user = snap.users.find((u) => u.id === userId)
  const roles = snap.roles ?? []
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user?.roleIds ?? [])
  const [overrides, setOverrides] = useState<Record<PageKey, PageCrud>>(user?.permissions ?? ({} as Record<PageKey, PageCrud>))
  const [msg, setMsg] = useState('')
  const actions: (keyof PageCrud)[] = useMemo(() => ['view', 'edit', 'delete', 'create'], [])

  if (!user) return <p>User not found.</p>

  const save = async () => {
    const r = await portalUpdateUserAccess({ userId, roleIds: selectedRoleIds, overrides })
    setMsg(r.ok ? 'Saved.' : r.error)
  }

  return <div className="form-page form-page--wide">
    <h2 style={{ marginTop: 0 }}>User access: {user.displayName}</h2>
    {msg ? <p className="form-page__hint">{msg}</p> : null}
    <h3>Roles</h3>
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {roles.map((r) => <CheckBox key={r.id} text={r.name} value={selectedRoleIds.includes(r.id)} onValueChanged={(e) => setSelectedRoleIds((prev) => Boolean(e.value) ? [...new Set([...prev, r.id])] : prev.filter((x) => x !== r.id))} />)}
    </div>
    <h3>User-level override matrix</h3>
    {ALL_PAGE_KEYS.map((page) => <fieldset key={page}><legend>{page}</legend><div style={{ display: 'flex', gap: 12 }}>{actions.map((a) =>
      <CheckBox key={a} text={a} value={overrides[page]?.[a]} onValueChanged={(e) => setOverrides((p) => ({ ...p, [page]: { ...(p[page] || { view:false,edit:false,delete:false,create:false }), [a]: Boolean(e.value) } }))} />)}</div></fieldset>)}
    <div style={{ marginTop: 12 }}><Button text="Save access" type="default" onClick={() => void save()} /></div>
  </div>
}
