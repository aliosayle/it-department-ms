import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateSite } from '@/api/mutations'
import { DefinitionList, DlRow } from '@/components/forms/DefinitionList'
import { EntityFormPage } from '@/components/forms/EntityFormPage'
import { useMockStore } from '@/mocks/mockStore'
import '@/pages/formPage.css'

export function SiteEditPage() {
  const { siteId = '' } = useParams<{ siteId: string }>()
  const navigate = useNavigate()
  const { sites, companies } = useMockStore()
  const perm = useCan('sites')
  const row = sites.find((s) => s.id === siteId)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, text: c.name })),
    [companies],
  )

  const companyName = row ? companies.find((c) => c.id === row.companyId)?.name : undefined

  const resetDraft = useCallback(() => {
    if (!row) return
    setCompanyId(row.companyId)
    setName(row.name)
    setLocation(row.location)
  }, [row])

  useEffect(() => {
    resetDraft()
  }, [resetDraft])

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
    setMode('view')
  }

  if (!row) {
    return (
      <EntityFormPage
        title="Site"
        subtitle="No site matches this link."
        wide
        toolbar={<Button text="Back to list" onClick={() => navigate('/master-data/sites')} />}
      >
        <p className="form-page__error">Site not found.</p>
      </EntityFormPage>
    )
  }

  const toolbar =
    mode === 'view' ? (
      <>
        <Button text="Back to list" onClick={() => navigate('/master-data/sites')} />
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
      title={mode === 'view' ? 'Site' : 'Edit site'}
      subtitle={mode === 'view' ? 'Physical location under a company.' : 'Change company assignment, site name, or address line.'}
      breadcrumbs={<Link to="/master-data/sites">Sites</Link>}
      toolbar={toolbar}
      error={error}
      wide
    >
      {mode === 'view' ? (
        <DefinitionList>
          <DlRow label="Company" value={companyName} />
          <DlRow label="Site name" value={row.name} />
          <DlRow label="Location" value={row.location} />
        </DefinitionList>
      ) : (
        <div className="entity-form-page__body entity-form-page__body--fields">
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
        </div>
      )}
    </EntityFormPage>
  )
}
