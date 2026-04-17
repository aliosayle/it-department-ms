import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateSupplier } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function SupplierEditPage() {
  const { supplierId = '' } = useParams<{ supplierId: string }>()
  const navigate = useNavigate()
  const { suppliers } = useMockStore()
  const perm = useCan('suppliers')
  const row = suppliers.find((s) => s.id === supplierId)
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setName(row.name)
    setContactName(row.contactName)
    setEmail(row.email)
    setPhone(row.phone)
    setAddress(row.address)
    setNotes(row.notes)
  }, [row])

  const submit = async () => {
    setError(null)
    if (!perm.edit) {
      setError('You do not have permission to edit suppliers.')
      return
    }
    if (!name.trim()) {
      setError('Supplier name is required.')
      return
    }
    const r = await portalUpdateSupplier(supplierId, {
      name: name.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
    })
    if (!r.ok) {
      setError(r.error)
      return
    }
    navigate('/master-data/suppliers')
  }

  if (!row) {
    return (
      <div className="form-page">
        <p className="form-page__error">Supplier not found.</p>
        <Button text="Back" onClick={() => navigate('/master-data/suppliers')} />
      </div>
    )
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        <Link to="/master-data/suppliers">Suppliers</Link>
      </p>
      <TextBox label="Supplier name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
      <TextBox label="Contact name" value={contactName} onValueChanged={(e) => setContactName(String(e.value ?? ''))} />
      <TextBox label="Email" value={email} onValueChanged={(e) => setEmail(String(e.value ?? ''))} />
      <TextBox label="Phone" value={phone} onValueChanged={(e) => setPhone(String(e.value ?? ''))} />
      <TextBox label="Address" value={address} onValueChanged={(e) => setAddress(String(e.value ?? ''))} />
      <TextArea label="Notes" value={notes} height={72} onValueChanged={(e) => setNotes(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/suppliers')} />
      </div>
    </div>
  )
}
