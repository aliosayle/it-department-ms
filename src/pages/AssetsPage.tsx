import { useMemo } from 'react'
import notify from 'devextreme/ui/notify'
import { isLiveApi } from '@/api/config'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { assetsGridPageConfig } from '@/pages/gridPageConfigs'
import type { AssetRow } from '@/mocks/types'
import { useCan } from '@/auth/AuthContext'
import { useMockStore } from '@/mocks/mockStore'

export function AssetsPage() {
  const { inventoryAssets } = useMockStore()
  const perm = useCan('assets')
  const offlineAssets = !isLiveApi()

  const rowActions = useMemo<PortalGridRowActions<AssetRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit && offlineAssets,
      canDelete: perm.delete,
      onView: (r) => {
        notify({
          message: `${r.id} · ${r.hostname}\n${r.owner} · ${r.location} · ${r.status}`,
          type: 'info',
          displayTime: 5000,
        })
      },
      getEditHref: offlineAssets ? (r) => `/assets/${encodeURIComponent(r.id)}/edit` : undefined,
    }),
    [perm.view, perm.edit, perm.delete, offlineAssets],
  )

  return <PortalGridPage config={assetsGridPageConfig} dataSource={inventoryAssets} rowActions={rowActions} />
}
