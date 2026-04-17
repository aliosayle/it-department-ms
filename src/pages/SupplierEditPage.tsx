import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateSupplier } from '@/api/mutations'
import { DefinitionList, DlRow } from '@/components/forms/DefinitionList'
import { EntityFormPage } from '@/components/forms/EntityFormPage'
import { useMockStore } from '@/mocks/mockStore'
import '@/pages/formPage.css'

export function SupplierEditPage() {
  const { supplierId = '' } = useParams<{ supplierId: string }>()
  const navigate = useNavigate()
  const { suppliers } = useMockStore()
  const perm = useCan('suppliers')
  const row = suppliers.find((s) => s.id === supplierId)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetDraft = useCallback(() => {
    if (!row) return
    setName(row.name)
    setContactName(row.contactName)
    setEmail(row.email)
    setPhone(row.phone)
    setAddress(row.address)
    setNotes(row.notes)
  }, [row])

  useEffect(() => {
    resetDraft()
  }, [resetDraft])

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
    setMode('view')
  }

  if (!row) {
    return (
      <EntityFormPage
        title="Supplier"
        subtitle="No supplier matches this link."
        wide
        toolbar={<Button text="Back to list" onClick={() => navigate('/master-data/suppliers')} />}
      >
        <p className="form-page__error">Supplier not found.</p>
      </EntityFormPage>
    )
  }

  const toolbar =
    mode === 'view' ? (
      <>
        <Button text="Back to list" onClick={() => navigate('/master-data/suppliers')} />
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
      title={mode === 'view' ? 'Supplier' : 'Edit supplier'}
      subtitle={mode === 'view' ? 'Vendor master record and contacts.' : 'Update supplier profile and notes.'}
      breadcrumbs={<Link to="/master-data/suppliers">Suppliers</Link>}
      toolbar={toolbar}
      error={error}
      wide
    >
      {mode === 'view' ? (
        <DefinitionList>
          <DlRow label="Supplier name" value={row.name} />
          <DlRow label="Contact" value={row.contactName} />
          <DlRow label="Email" value={row.email} />
          <DlRow label="Phone" value={row.phone} />
          <DlRow label="Address" value={row.address} />
          <DlRow label="Notes" value={row.notes} />
        </DefinitionList>
      ) : (
        <div className="entity-form-page__body entity-form-page__body--fields">
          <TextBox label="Supplier name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
          <TextBox label="Contact name" value={contactName} onValueChanged={(e) => setContactName(String(e.value ?? ''))} />
          <TextBox label="Email" value={email} onValueChanged={(e) => setEmail(String(e.value ?? ''))} />
          <TextBox label="Phone" value={phone} onValueChanged={(e) => setPhone(String(e.value ?? ''))} />
          <TextBox label="Address" value={address} onValueChanged={(e) => setAddress(String(e.value ?? ''))} />
          <TextArea label="Notes" value={notes} height={88} onValueChanged={(e) => setNotes(String(e.value ?? ''))} />
        </div>
      )}
    </EntityFormPage>
  )
}
