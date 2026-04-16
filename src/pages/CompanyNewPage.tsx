import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddCompany } from '@/api/mutations'
import './formPage.css'

export function CompanyNewPage() {
  const navigate = useNavigate()
  const perm = useCan('companies')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!perm.create) return
    if (!name.trim()) return
    try {
      await portalAddCompany(name, notes)
      navigate('/master-data/companies')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save company.')
    }
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
          disabled={!perm.create}
          onClick={submit}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/companies')} />
      </div>
    </div>
  )
}
