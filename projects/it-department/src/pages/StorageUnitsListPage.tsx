import { useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { storageUnitListGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { buildStorageUnitListRows, useMockStore } from '@/mocks/mockStore'
import type { StorageUnitListRow } from '@/mocks/mockStore'

export function StorageUnitsListPage() {
  useMockStore()
  const navigate = useNavigate()
  const rows = buildStorageUnitListRows()

  const onRowClick = (e: RowClickEvent<StorageUnitListRow, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/stock/storage-units/${String(id)}`)
  }

  return <PortalGridPage config={storageUnitListGridConfig} dataSource={rows} onRowClick={onRowClick} />
}
