import { useMemo, useState } from 'react'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import CheckBox from 'devextreme-react/check-box'
import { ALL_PAGE_KEYS } from '@/auth/pageKeys'
import { useMockStore } from '@/mocks/mockStore'
import { portalUpsertRole } from '@/api'
import type { PageCrud, PageKey } from '@/mocks/domain/types'

function emptyPerms(): Record<PageKey, PageCrud> {
  const out = {} as Record<PageKey, PageCrud>
  for (const k of ALL_PAGE_KEYS) out[k] = { view: false, edit: false, delete: false, create: false }
  return out
}

export function RolesPage() {
  const snap = useMockStore()
  const roles = snap.roles
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [perms, setPerms] = useState<Record<PageKey, PageCrud>>(emptyPerms)
  const [msg, setMsg] = useState('')

  const actions: (keyof PageCrud)[] = useMemo(() => ['view', 'edit', 'delete', 'create'], [])
  const setFlag = (page: PageKey, action: keyof PageCrud, v: boolean) => setPerms((p) => ({ ...p, [page]: { ...p[page], [action]: v } }))

  const save = async () => {
    const r = await portalUpsertRole({ name, description, permissions: perms })
    setMsg(r.ok ? 'Role saved.' : r.error)
  }

  return <div className="form-page form-page--wide">
    <h2 style={{ marginTop: 0 }}>Roles</h2>
    <p className="form-page__hint">Create or update role templates used for user access.</p>
    {msg ? <p className="form-page__hint">{msg}</p> : null}
    <div style={{ display:'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
      <TextBox label="Role name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
      <TextBox label="Description" value={description} onValueChanged={(e) => setDescription(String(e.value ?? ''))} />
    </div>
    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
      {ALL_PAGE_KEYS.map((page) => <fieldset key={page}><legend>{page}</legend><div style={{ display:'flex', gap: 12 }}>{actions.map((a) =>
        <CheckBox key={a} text={a} value={perms[page][a]} onValueChanged={(e) => setFlag(page, a, Boolean(e.value))} />)}</div></fieldset>)}
    </div>
    <div style={{ marginTop: 12 }}><Button text="Save role" type="default" onClick={() => void save()} /></div>
    <h3>Existing roles</h3>
    <ul>{roles.map((r) => <li key={r.id}>{r.name} — {r.description}</li>)}</ul>
  </div>
}
