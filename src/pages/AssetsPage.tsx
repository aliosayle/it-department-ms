import { useMemo } from 'react'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { assetsGridPageConfig } from '@/pages/gridPageConfigs'
import type { AssetRow } from '@/mocks/types'
import { useCan } from '@/auth/AuthContext'

export function AssetsPage() {
  const perm = useCan('assets')

  const rowActions = useMemo<PortalGridRowActions<AssetRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.id} · ${r.hostname}\n${r.owner} · ${r.location} · ${r.status}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      onEdit: () => {
        notify({
          message: 'Asset editing is mock-only in this build.',
          type: 'warning',
          displayTime: 3500,
        })
      },
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return <PortalGridPage config={assetsGridPageConfig} rowActions={rowActions} />
}
