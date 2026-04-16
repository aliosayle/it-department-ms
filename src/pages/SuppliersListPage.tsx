import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { useCan } from '@/auth/AuthContext'
import { suppliersGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { useMockStore } from '@/mocks/mockStore'

export function SuppliersListPage() {
  const { suppliers } = useMockStore()
  const perm = useCan('suppliers')

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Vendors used on purchases (bon / GRN).{' '}
          <Link to="/purchases">Purchases</Link>
        </p>
        {perm.create ? (
          <Link to="/master-data/suppliers/new">
            <Button text="Add supplier" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={suppliersGridConfig} dataSource={suppliers} />
    </>
  )
}
