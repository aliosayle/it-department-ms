import { useMemo } from 'react'
import notify from 'devextreme/ui/notify'
import { isLiveApi } from '@/api/config'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { serviceDeskGridPageConfig } from '@/pages/gridPageConfigs'
import type { Ticket } from '@/mocks/types'
import { useCan } from '@/auth/AuthContext'
import { useMockStore } from '@/mocks/mockStore'

export function ServiceDeskPage() {
  const { serviceDeskTickets } = useMockStore()
  const perm = useCan('serviceDesk')
  const offlineTickets = !isLiveApi()

  const rowActions = useMemo<PortalGridRowActions<Ticket>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit && offlineTickets,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.id} · ${r.title}\n${r.priority} · ${r.status} · ${r.assignee}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      getEditHref: offlineTickets
        ? (r) => `/service-desk/${encodeURIComponent(r.id)}/edit`
        : undefined,
    }),
    [perm.view, perm.edit, perm.delete, offlineTickets],
  )

  return (
    <PortalGridPage
      config={serviceDeskGridPageConfig}
      dataSource={serviceDeskTickets}
      rowActions={rowActions}
    />
  )
}
