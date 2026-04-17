import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateSite } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function SiteEditPage() {
  const { siteId = '' } = useParams<{ siteId: string }>()
  const navigate = useNavigate()
  const { sites, companies } = useMockStore()
  const perm = useCan('sites')
  const row = sites.find((s) => s.id === siteId)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, text: c.name })),
    [companies],
  )

  useEffect(() => {
    if (!row) return
    setCompanyId(row.companyId)
    setName(row.name)
    setLocation(row.location)
  }, [row])

  const submit = async () => {
    setError(null)
    if (!perm.edit) {
      setError('You do not have permission to edit sites.')
      return
    }
    if (!companyId || !name.trim()) {
      setError('Company and site name are required.')
      return
    }
    const r = await portalUpdateSite(siteId, {
      companyId,
      name: name.trim(),
      location: location.trim(),
    })
    if (!r.ok) {
      setError(r.error)
      return
    }
    navigate('/master-data/sites')
  }

  if (!row) {
    return (
      <div className="form-page">
        <p className="form-page__error">Site not found.</p>
        <Button text="Back" onClick={() => navigate('/master-data/sites')} />
      </div>
    )
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
      <TextBox label="Location" value={location} onValueChanged={(e) => setLocation(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/sites')} />
      </div>
    </div>
  )
}
