import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { useCan } from '@/auth/AuthContext'
import { deliveriesGridConfigV2 } from '@/pages/gridPageConfigs.stockDomain'
import { useMockStore } from '@/mocks/mockStore'

export function DeliveryListPage() {
  const { deliveries } = useMockStore()
  const perm = useCan('delivery')

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/delivery/new">
            <Button text="New delivery" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={deliveriesGridConfigV2} dataSource={deliveries} />
    </>
  )
}
