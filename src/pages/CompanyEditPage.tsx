import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateCompany } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function CompanyEditPage() {
  const { companyId = '' } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const { companies } = useMockStore()
  const perm = useCan('companies')
  const row = companies.find((c) => c.id === companyId)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setName(row.name)
    setNotes(row.notes ?? '')
  }, [row])

  const submit = async () => {
    setError(null)
    if (!perm.edit) {
      setError('You do not have permission to edit companies.')
      return
    }
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    const r = await portalUpdateCompany(companyId, { name: name.trim(), notes: notes.trim() })
    if (!r.ok) {
      setError(r.error)
      return
    }
    navigate('/master-data/companies')
  }

  if (!row) {
    return (
      <div className="form-page">
        <p className="form-page__error">Company not found.</p>
        <Button text="Back" onClick={() => navigate('/master-data/companies')} />
      </div>
    )
  }

  return (
    <div className="form-page">
      {error ? <p className="form-page__error">{error}</p> : null}
      <TextBox label="Name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
      <TextBox label="Notes" value={notes} onValueChanged={(e) => setNotes(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/companies')} />
      </div>
    </div>
  )
}
