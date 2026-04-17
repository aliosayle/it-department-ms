import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateNetworkDevice } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function NetworkDeviceEditPage() {
  const { deviceId = '' } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const { networkDevices } = useMockStore()
  const perm = useCan('network')
  const row = networkDevices.find((d) => d.id === deviceId)
  const [type, setType] = useState('')
  const [details, setDetails] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setType(row.type)
    setDetails(row.details)
    setBrand(row.brand)
    setModel(row.model)
    setSerialNumber(row.serialNumber)
    setLocation(row.location)
  }, [row])

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
    navigate('/inventory/network')
  }

  if (!row) {
    return (
      <div className="form-page">
        <p className="form-page__error">Device not found.</p>
        <Button text="Back" onClick={() => navigate('/inventory/network')} />
      </div>
    )
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <TextBox label="Type" value={type} onValueChanged={(e) => setType(String(e.value ?? ''))} />
      <TextBox label="Details" value={details} onValueChanged={(e) => setDetails(String(e.value ?? ''))} />
      <TextBox label="Brand" value={brand} onValueChanged={(e) => setBrand(String(e.value ?? ''))} />
      <TextBox label="Model" value={model} onValueChanged={(e) => setModel(String(e.value ?? ''))} />
      <TextBox label="Serial number" value={serialNumber} onValueChanged={(e) => setSerialNumber(String(e.value ?? ''))} />
      <TextBox label="Location" value={location} onValueChanged={(e) => setLocation(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/inventory/network')} />
      </div>
    </div>
  )
}
