import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { useCan } from '@/auth/AuthContext'
import { companiesGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { useMockStore } from '@/mocks/mockStore'

export function CompaniesListPage() {
  const { companies } = useMockStore()
  const perm = useCan('companies')

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/master-data/companies/new">
            <Button text="Add company" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={companiesGridConfig} dataSource={companies} />
    </>
  )
}
