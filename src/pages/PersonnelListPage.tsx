import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import {
  personnelGridConfig,
  type PersonnelRow,
} from '@/pages/gridPageConfigs.stockDomain'
import { useMockStore } from '@/mocks/mockStore'

export function PersonnelListPage() {
  const { personnel, companies, sites } = useMockStore()
  const perm = useCan('personnel')

  const rows: PersonnelRow[] = useMemo(
    () =>
      personnel.map((p) => ({
        ...p,
        companyName: companies.find((c) => c.id === p.companyId)?.name ?? p.companyId,
        siteName: sites.find((s) => s.id === p.siteId)?.name ?? p.siteId,
      })),
    [personnel, companies, sites],
  )

  const rowActions = useMemo<PortalGridRowActions<PersonnelRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.fullName}\n${r.email}\n${r.companyName} · ${r.siteName}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      onEdit: (r) => {
        window.location.href = `mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent('IT portal — ' + r.fullName)}`
      },
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/master-data/personnel/new">
            <Button text="Add personnel" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={personnelGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
