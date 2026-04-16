import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { stockOverviewGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { buildStockPositionsForStorageUnit, getStorageUnitById, useMockStore } from '@/mocks/mockStore'

export function StorageUnitDetailPage() {
  const { storageUnitId = '' } = useParams<{ storageUnitId: string }>()
  useMockStore()
  const su = getStorageUnitById(storageUnitId)
  const rows = buildStockPositionsForStorageUnit(storageUnitId)

  if (!su) {
    return (
      <p>
        Storage unit not found.{' '}
        <Link to="/stock/storage-units">
          <Button text="Back to storages" />
        </Link>
      </p>
    )
  }

  return (
    <>
      <div className="list-toolbar">
        <Link to="/stock/storage-units">
          <Button text="All storage units" />
        </Link>
      </div>
      <p className="form-page__hint" style={{ marginTop: 0 }}>
        <strong>{su.code}</strong> — {su.label} · Stock in this unit only (click a product row on the
        catalog for full product context).
      </p>
      <PortalGridPage config={stockOverviewGridConfig} dataSource={rows} />
    </>
  )
}
