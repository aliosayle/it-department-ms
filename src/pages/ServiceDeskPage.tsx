import { useMemo } from 'react'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { serviceDeskGridPageConfig } from '@/pages/gridPageConfigs'
import type { Ticket } from '@/mocks/types'
import { useCan } from '@/auth/AuthContext'

export function ServiceDeskPage() {
  const perm = useCan('serviceDesk')

  const rowActions = useMemo<PortalGridRowActions<Ticket>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.id} · ${r.title}\n${r.priority} · ${r.status} · ${r.assignee}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      onEdit: () => {
        notify({
          message: 'Ticket editing is mock-only in this build.',
          type: 'warning',
          displayTime: 3500,
        })
      },
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return <PortalGridPage config={serviceDeskGridPageConfig} rowActions={rowActions} />
}
