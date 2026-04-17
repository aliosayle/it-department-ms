import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateNetworkDevice } from '@/api/mutations'
import { DefinitionList, DlRow } from '@/components/forms/DefinitionList'
import { EntityFormPage } from '@/components/forms/EntityFormPage'
import { useMockStore } from '@/mocks/mockStore'
import '@/pages/formPage.css'

export function NetworkDeviceEditPage() {
  const { deviceId = '' } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const { networkDevices } = useMockStore()
  const perm = useCan('network')
  const row = networkDevices.find((d) => d.id === deviceId)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [type, setType] = useState('')
  const [details, setDetails] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetDraft = useCallback(() => {
    if (!row) return
    setType(row.type)
    setDetails(row.details)
    setBrand(row.brand)
    setModel(row.model)
    setSerialNumber(row.serialNumber)
    setLocation(row.location)
  }, [row])

  useEffect(() => {
    resetDraft()
  }, [resetDraft])

  const submit = async () => {
    setError(null)
    if (!perm.edit) {
      setError('You do not have permission to edit network devices.')
      return
    }
    const r = await portalUpdateNetworkDevice(deviceId, {
      type: type.trim(),
      details: details.trim(),
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      location: location.trim(),
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
        title="Network device"
        subtitle="No device matches this link."
        wide
        toolbar={<Button text="Back to list" onClick={() => navigate('/inventory/network')} />}
      >
        <p className="form-page__error">Device not found.</p>
      </EntityFormPage>
    )
  }

  const toolbar =
    mode === 'view' ? (
      <>
        <Button text="Back to list" onClick={() => navigate('/inventory/network')} />
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
      title={mode === 'view' ? 'Network device' : 'Edit network device'}
      subtitle={mode === 'view' ? 'Infrastructure inventory record.' : 'Update device attributes and placement.'}
      breadcrumbs={<Link to="/inventory/network">Network</Link>}
      toolbar={toolbar}
      error={error}
      wide
    >
      {mode === 'view' ? (
        <DefinitionList>
          <DlRow label="Type" value={row.type} />
          <DlRow label="Details" value={row.details} />
          <DlRow label="Brand" value={row.brand} />
          <DlRow label="Model" value={row.model} />
          <DlRow label="Serial number" value={row.serialNumber} />
          <DlRow label="Location" value={row.location} />
        </DefinitionList>
      ) : (
        <div className="entity-form-page__body entity-form-page__body--fields">
          <TextBox label="Type" value={type} onValueChanged={(e) => setType(String(e.value ?? ''))} />
          <TextBox label="Details" value={details} onValueChanged={(e) => setDetails(String(e.value ?? ''))} />
          <TextBox label="Brand" value={brand} onValueChanged={(e) => setBrand(String(e.value ?? ''))} />
          <TextBox label="Model" value={model} onValueChanged={(e) => setModel(String(e.value ?? ''))} />
          <TextBox label="Serial number" value={serialNumber} onValueChanged={(e) => setSerialNumber(String(e.value ?? ''))} />
          <TextBox label="Location" value={location} onValueChanged={(e) => setLocation(String(e.value ?? ''))} />
        </div>
      )}
    </EntityFormPage>
  )
}
