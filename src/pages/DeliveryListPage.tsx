import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import { deliveriesGridConfigV2 } from '@/pages/gridPageConfigs.stockDomain'
import type { Delivery } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'

export function DeliveryListPage() {
  const { deliveries } = useMockStore()
  const perm = useCan('delivery')

  const rowActions = useMemo<PortalGridRowActions<Delivery>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `Delivery ${r.id}\n${r.description || r.itemDescription || '—'}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      getEditHref: () => '/delivery/new',
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        {perm.create ? (
          <Link to="/delivery/new">
            <Button text="New delivery" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={deliveriesGridConfigV2} dataSource={deliveries} rowActions={rowActions} />
    </>
  )
}
