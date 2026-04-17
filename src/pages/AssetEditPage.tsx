import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { isLiveApi } from '@/api/config'
import { portalUpdateInventoryAsset } from '@/api/mutations'
import { useCan } from '@/auth/AuthContext'
import { useMockStore } from '@/mocks/mockStore'
import type { AssetRow } from '@/mocks/types'
import './formPage.css'

const statuses: AssetRow['status'][] = ['In use', 'Stock', 'Retired', 'Repair']

export function AssetEditPage() {
  const { assetId = '' } = useParams<{ assetId: string }>()
  const navigate = useNavigate()
  const { inventoryAssets } = useMockStore()
  const perm = useCan('assets')
  const row = inventoryAssets.find((a) => a.id === assetId)
  const [hostname, setHostname] = useState('')
  const [owner, setOwner] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<AssetRow['status']>('In use')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setHostname(row.hostname)
    setOwner(row.owner)
    setLocation(row.location)
    setStatus(row.status)
  }, [row])

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
    navigate('/assets')
  }

  if (!row) {
    return (
      <div className="form-page">
        <p className="form-page__error">Asset not found.</p>
        <Button text="Back" onClick={() => navigate('/assets')} />
      </div>
    )
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <TextBox label="Hostname" value={hostname} onValueChanged={(e) => setHostname(String(e.value ?? ''))} />
      <TextBox label="Owner" value={owner} onValueChanged={(e) => setOwner(String(e.value ?? ''))} />
      <TextBox label="Location" value={location} onValueChanged={(e) => setLocation(String(e.value ?? ''))} />
      <SelectBox
        label="Status"
        dataSource={statuses}
        value={status}
        onValueChanged={(e) => setStatus((e.value as AssetRow['status']) ?? 'In use')}
      />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/assets')} />
      </div>
    </div>
  )
}
