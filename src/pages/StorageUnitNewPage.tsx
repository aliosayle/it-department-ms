import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddStorageUnit } from '@/api/mutations'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'
import './formPage.css'

const KIND_OPTIONS = [
  { value: 'shelf', text: 'Shelf / warehouse bin' },
  { value: 'room', text: 'Room or zone' },
  { value: 'custody', text: 'Custody (one person at this site)' },
] as const

export function StorageUnitNewPage() {
  const navigate = useNavigate()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('storageUnits')

  const snapshot = b.snapshot
  const sites = snapshot?.sites ?? []
  const personnel = snapshot?.personnel ?? []

  const [siteId, setSiteId] = useState<string | null>(null)
  useEffect(() => {
    setSiteId((prev) => prev ?? sites[0]?.id ?? null)
  }, [sites])
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<string>('shelf')
  const [personnelId, setPersonnelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const siteOptions = useMemo(
    () => sites.map((s) => ({ value: s.id, text: `${s.name} — ${s.location}` })),
    [sites],
  )

  const personnelOptions = useMemo(() => {
    if (!siteId) return []
    return personnel
      .filter((p) => p.siteId === siteId)
      .map((p) => ({ value: p.id, text: `${p.fullName} (${p.email})` }))
  }, [siteId, personnel])

  const masterDataReady = Boolean(snapshot) && sites.length > 0

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create storage units.')
      return
    }
    if (!siteId || !code.trim() || !label.trim()) {
      setError('Site, code, and label are required.')
      return
    }
    if (kind === 'custody' && !personnelId) {
      setError('Custody bins must have a personnel holder at the same site.')
      return
    }
    const res = await portalAddStorageUnit({
      siteId,
      code: code.trim(),
      label: label.trim(),
      kind,
      personnelId: kind === 'custody' ? personnelId : null,
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    navigate(`/stock/storage-units/${res.storageUnit.id}`)
  }

  if (gate) return gate

  return (
    <div className="form-page form-page--wide">
      <h1 style={{ marginTop: 0 }}>New storage unit</h1>
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        Code must be unique per site (for example <code>A-12</code>). Use <strong>Custody</strong> for a virtual bin
        tied to one person so assignments from stock can move items into their custody.
      </p>
      {!masterDataReady ? (
        <p className="form-page__hint form-page__hint--warn">
          No sites in master data yet. <Link to="/master-data/sites/new">New site</Link>
        </p>
      ) : null}
      <SelectBox
        label="Site"
        dataSource={siteOptions}
        displayExpr="text"
        valueExpr="value"
        value={siteId}
        searchEnabled
        disabled={!masterDataReady}
        onValueChanged={(e) => {
          setSiteId(e.value as string | null)
          setPersonnelId(null)
        }}
      />
      <TextBox label="Code" value={code} onValueChanged={(e) => setCode(String(e.value ?? ''))} />
      <TextBox label="Label" value={label} onValueChanged={(e) => setLabel(String(e.value ?? ''))} />
      <SelectBox
        label="Kind"
        dataSource={[...KIND_OPTIONS]}
        displayExpr="text"
        valueExpr="value"
        value={kind}
        onValueChanged={(e) => {
          const v = String(e.value ?? 'shelf')
          setKind(v)
          if (v !== 'custody') setPersonnelId(null)
        }}
      />
      {kind === 'custody' ? (
        <SelectBox
          label="Custody holder (personnel at this site)"
          dataSource={personnelOptions}
          displayExpr="text"
          valueExpr="value"
          value={personnelId}
          searchEnabled
          disabled={!masterDataReady}
          onValueChanged={(e) => setPersonnelId(e.value as string | null)}
        />
      ) : null}
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.create || !masterDataReady}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/stock/storage-units')} />
      </div>
    </div>
  )
}
