import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import {
  sitesGridConfig,
  type SiteRow,
} from '@/pages/gridPageConfigs.stockDomain'
import { useMockStore } from '@/mocks/mockStore'

export function SitesListPage() {
  const { sites, companies } = useMockStore()
  const perm = useCan('sites')

  const rows: SiteRow[] = useMemo(
    () =>
      sites.map((site) => ({
        ...site,
        companyName: companies.find((c) => c.id === site.companyId)?.name ?? site.companyId,
      })),
    [sites, companies],
  )

  const rowActions = useMemo<PortalGridRowActions<SiteRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.name} · ${r.companyName}\n${r.location}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      onEdit: () => {
        notify({
          message: 'Site edit forms are not wired in this build — use Add site or the API.',
          type: 'warning',
          displayTime: 4000,
        })
      },
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/master-data/sites/new">
            <Button text="Add site" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={sitesGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
