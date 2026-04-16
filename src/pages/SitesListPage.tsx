import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
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

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/master-data/sites/new">
            <Button text="Add site" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={sitesGridConfig} dataSource={rows} />
    </>
  )
}
