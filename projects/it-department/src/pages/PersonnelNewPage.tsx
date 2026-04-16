import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddPersonnel } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function PersonnelNewPage() {
  const navigate = useNavigate()
  const { companies, sites } = useMockStore()
  const perm = useCan('personnel')
  const [companyId, setCompanyId] = useState<string | null>(companies[0]?.id ?? null)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const siteOptions = useMemo(() => {
    if (!companyId) return []
    return sites
      .filter((s) => s.companyId === companyId)
      .map((s) => ({ value: s.id, text: `${s.name} — ${s.location}` }))
  }, [companyId, sites])

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, text: c.name })),
    [companies],
  )

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to add personnel.')
      return
    }
    if (!companyId || !siteId || !fullName.trim()) {
      setError('Company, site, and name are required.')
      return
    }
    const result = await portalAddPersonnel(fullName, email, companyId, siteId)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/master-data/personnel')
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
        onValueChanged={(e) => {
          setCompanyId(e.value as string | null)
          setSiteId(null)
        }}
      />
      <SelectBox
        label="Site"
        dataSource={siteOptions}
        displayExpr="text"
        valueExpr="value"
        value={siteId}
        searchEnabled
        onValueChanged={(e) => setSiteId(e.value as string | null)}
      />
      <TextBox
        label="Full name"
        value={fullName}
        onValueChanged={(e) => setFullName(String(e.value ?? ''))}
      />
      <TextBox label="Email" value={email} onValueChanged={(e) => setEmail(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.create}
          onClick={submit}
        />
        <Button text="Cancel" onClick={() => navigate('/master-data/personnel')} />
      </div>
    </div>
  )
}
