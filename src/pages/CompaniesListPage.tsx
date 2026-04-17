import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import { companiesGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { Company } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'

export function CompaniesListPage() {
  const { companies } = useMockStore()
  const perm = useCan('companies')

  const rowActions = useMemo<PortalGridRowActions<Company>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        const body = `${String(r.name)}\n${String(r.notes ?? '')}`.trim()
        notify({ message: body || String(r.name), type: 'info', displayTime: 5000 })
      },
      getEditHref: (r) => `/master-data/companies/${encodeURIComponent(r.id)}/edit`,
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/master-data/companies/new">
            <Button text="Add company" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={companiesGridConfig} dataSource={companies} rowActions={rowActions} />
    </>
  )
}
