import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateCompany } from '@/api/mutations'
import { DefinitionList, DlRow } from '@/components/forms/DefinitionList'
import { EntityFormPage } from '@/components/forms/EntityFormPage'
import { useMockStore } from '@/mocks/mockStore'
import '@/pages/formPage.css'

export function CompanyEditPage() {
  const { companyId = '' } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const { companies } = useMockStore()
  const perm = useCan('companies')
  const row = companies.find((c) => c.id === companyId)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetDraft = useCallback(() => {
    if (!row) return
    setName(row.name)
    setNotes(row.notes ?? '')
  }, [row])

  useEffect(() => {
    resetDraft()
  }, [resetDraft])

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
    setMode('view')
  }

  if (!row) {
    return (
      <EntityFormPage
        title="Company"
        subtitle="No company matches this link."
        toolbar={<Button text="Back to list" onClick={() => navigate('/master-data/companies')} />}
      >
        <p className="form-page__error">Company not found.</p>
      </EntityFormPage>
    )
  }

  const toolbar =
    mode === 'view' ? (
      <>
        <Button text="Back to list" onClick={() => navigate('/master-data/companies')} />
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
      title={mode === 'view' ? 'Company' : 'Edit company'}
      subtitle={mode === 'view' ? 'Master data record.' : 'Update the legal entity name and internal notes.'}
      breadcrumbs={<Link to="/master-data/companies">Companies</Link>}
      toolbar={toolbar}
      error={error}
    >
      {mode === 'view' ? (
        <DefinitionList>
          <DlRow label="Name" value={row.name} />
          <DlRow label="Notes" value={row.notes} />
        </DefinitionList>
      ) : (
        <div className="entity-form-page__body entity-form-page__body--fields">
          <TextBox label="Name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
          <TextBox label="Notes" value={notes} onValueChanged={(e) => setNotes(String(e.value ?? ''))} />
        </div>
      )}
    </EntityFormPage>
  )
}
