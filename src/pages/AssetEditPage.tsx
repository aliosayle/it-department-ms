import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { isLiveApi } from '@/api/config'
import { portalUpdateInventoryAsset } from '@/api/mutations'
import { useCan } from '@/auth/AuthContext'
import { DefinitionList, DlRow } from '@/components/forms/DefinitionList'
import { EntityFormPage } from '@/components/forms/EntityFormPage'
import { useMockStore } from '@/mocks/mockStore'
import type { AssetRow } from '@/mocks/types'
import '@/pages/formPage.css'

const statuses: AssetRow['status'][] = ['In use', 'Stock', 'Retired', 'Repair']

export function AssetEditPage() {
  const { assetId = '' } = useParams<{ assetId: string }>()
  const navigate = useNavigate()
  const { inventoryAssets } = useMockStore()
  const perm = useCan('assets')
  const row = inventoryAssets.find((a) => a.id === assetId)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [hostname, setHostname] = useState('')
  const [owner, setOwner] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<AssetRow['status']>('In use')
  const [error, setError] = useState<string | null>(null)

  const resetDraft = useCallback(() => {
    if (!row) return
    setHostname(row.hostname)
    setOwner(row.owner)
    setLocation(row.location)
    setStatus(row.status)
  }, [row])

  useEffect(() => {
    resetDraft()
  }, [resetDraft])

  const submit = async () => {
    setError(null)
    if (isLiveApi()) {
      setError('Asset edits are available only without API mode (client-side store).')
      return
    }
    if (!perm.edit) {
      setError('You do not have permission to edit assets.')
      return
    }
    if (!hostname.trim()) {
      setError('Hostname is required.')
      return
    }
    const r = await portalUpdateInventoryAsset(assetId, {
      hostname: hostname.trim(),
      owner: owner.trim(),
      location: location.trim(),
      status,
    })
    if (!r.ok) {
      setError(r.error)
      return
    }
    setMode('view')
  }

  if (!row) {
    return (
      <EntityFormPage
        title="Asset"
        subtitle="No asset matches this link."
        wide
        toolbar={<Button text="Back to register" onClick={() => navigate('/assets')} />}
      >
        <p className="form-page__error">Asset not found.</p>
      </EntityFormPage>
    )
  }

  const toolbar =
    mode === 'view' ? (
      <>
        <Button text="Back to register" onClick={() => navigate('/assets')} />
        {perm.edit ? (
          <Button
            text="Edit"
            type="default"
            stylingMode="contained"
            onClick={() => {
              setError(null)
              resetDraft()
              setMode('edit')
            }}
          />
        ) : null}
      </>
    ) : (
      <>
        <Button
          text="Cancel"
          onClick={() => {
            setError(null)
            resetDraft()
            setMode('view')
          }}
        />
        <Button text="Save" type="default" stylingMode="contained" disabled={!perm.edit} onClick={() => void submit()} />
      </>
    )

  return (
    <EntityFormPage
      title={mode === 'view' ? 'Asset' : 'Edit asset'}
      subtitle={
        mode === 'view'
          ? 'Configuration item in the asset register.'
          : 'Update hostname, ownership, location, and lifecycle status.'
      }
      breadcrumbs={<Link to="/assets">Assets</Link>}
      toolbar={toolbar}
      error={error}
      wide
    >
      {mode === 'view' ? (
        <DefinitionList>
          <DlRow label="Hostname" value={row.hostname} />
          <DlRow label="Owner" value={row.owner} />
          <DlRow label="Location" value={row.location} />
          <DlRow label="Status" value={row.status} />
        </DefinitionList>
      ) : (
        <div className="entity-form-page__body entity-form-page__body--fields">
          <TextBox label="Hostname" value={hostname} onValueChanged={(e) => setHostname(String(e.value ?? ''))} />
          <TextBox label="Owner" value={owner} onValueChanged={(e) => setOwner(String(e.value ?? ''))} />
          <TextBox label="Location" value={location} onValueChanged={(e) => setLocation(String(e.value ?? ''))} />
          <SelectBox
            label="Status"
            dataSource={statuses}
            value={status}
            onValueChanged={(e) => setStatus((e.value as AssetRow['status']) ?? 'In use')}
          />
        </div>
      )}
    </EntityFormPage>
  )
}
