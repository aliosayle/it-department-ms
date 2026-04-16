import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
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

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/master-data/personnel/new">
            <Button text="Add personnel" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={personnelGridConfig} dataSource={rows} />
    </>
  )
}
