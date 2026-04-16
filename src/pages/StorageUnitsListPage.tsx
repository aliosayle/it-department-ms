import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import notify from 'devextreme/ui/notify'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { storageUnitListGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { useCan } from '@/auth/AuthContext'
import { buildStorageUnitListRows, useMockStore } from '@/mocks/mockStore'
import type { StorageUnitListRow } from '@/mocks/mockStore'

export function StorageUnitsListPage() {
  useMockStore()
  const navigate = useNavigate()
  const perm = useCan('storageUnits')
  const rows = buildStorageUnitListRows()

  const onRowClick = (e: RowClickEvent<StorageUnitListRow, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/stock/storage-units/${String(id)}`)
  }

  const rowActions = useMemo<PortalGridRowActions<StorageUnitListRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => `/stock/storage-units/${String(r.id)}`,
      onEdit: () => {
        notify({
          message: 'Storage unit edits use the detail page fields when available, or the API.',
          type: 'info',
          displayTime: 4000,
        })
      },
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <PortalGridPage
      config={storageUnitListGridConfig}
      dataSource={rows}
      onRowClick={onRowClick}
      rowActions={rowActions}
    />
  )
}
