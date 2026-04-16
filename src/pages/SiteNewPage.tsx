import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddSite } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function SiteNewPage() {
  const navigate = useNavigate()
  const { companies } = useMockStore()
  const perm = useCan('sites')
  const [companyId, setCompanyId] = useState<string | null>(companies[0]?.id ?? null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, text: c.name })),
    [companies],
  )

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to add sites.')
      return
    }
    if (!companyId || !name.trim()) {
      setError('Company and site name are required.')
      return
    }
    const result = await portalAddSite(companyId, name, location)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/master-data/sites')
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <SelectBox
        label="Company"
        dataSource={companyOptions}
        displayExpr="text"
        valueExpr="value"
        value={companyId}
        onValueChanged={(e) => setCompanyId(e.value as string | null)}
      />
      <TextBox label="Site name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
      <TextBox
        label="Location"
        value={location}
        onValueChanged={(e) => setLocation(String(e.value ?? ''))}
      />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.create}
          onClick={submit}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/sites')} />
      </div>
    </div>
  )
}
