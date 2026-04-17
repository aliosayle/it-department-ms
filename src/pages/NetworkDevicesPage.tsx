import { useMemo } from 'react'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { networkDevicesGridConfig } from '@/pages/gridPageConfigs.iter1'
import type { NetworkDevice } from '@/mocks/domain/types'
import { useCan } from '@/auth/AuthContext'
import { useMockStore } from '@/mocks/mockStore'

export function NetworkDevicesPage() {
  const { networkDevices } = useMockStore()
  const perm = useCan('network')

  const rowActions = useMemo<PortalGridRowActions<NetworkDevice>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.type} · ${r.brand} ${r.model}\n${r.location}\nS/N: ${r.serialNumber}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      getEditHref: (r) => `/inventory/network/${encodeURIComponent(r.id)}/edit`,
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return <PortalGridPage config={networkDevicesGridConfig} dataSource={networkDevices} rowActions={rowActions} />
}
