import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddSupplier } from '@/api/mutations'
import './formPage.css'

export function SupplierNewPage() {
  const navigate = useNavigate()
  const perm = useCan('suppliers')
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create suppliers.')
      return
    }
    if (!name.trim()) {
      setError('Supplier name is required.')
      return
    }
    try {
      await portalAddSupplier(name, contactName, email, phone, address, notes)
      navigate('/master-data/suppliers')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save supplier.')
    }
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        <Link to="/master-data/suppliers">Suppliers</Link> ·{' '}
        <Link to="/purchases">Purchases</Link>
      </p>
      <TextBox label="Supplier name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
      <TextBox
        label="Contact name"
        value={contactName}
        onValueChanged={(e) => setContactName(String(e.value ?? ''))}
      />
      <TextBox label="Email" value={email} onValueChanged={(e) => setEmail(String(e.value ?? ''))} />
      <TextBox label="Phone" value={phone} onValueChanged={(e) => setPhone(String(e.value ?? ''))} />
      <TextBox label="Address" value={address} onValueChanged={(e) => setAddress(String(e.value ?? ''))} />
      <TextArea label="Notes" value={notes} height={72} onValueChanged={(e) => setNotes(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.create}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/suppliers')} />
      </div>
    </div>
  )
}
