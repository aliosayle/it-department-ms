import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { stockOverviewGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { StockOverviewRow } from '@/mocks/domain/types'
import { buildStockPositionsForStorageUnitFromState, getStorageUnitByIdFromState } from '@/domain/inventoryView'
import { useCan } from '@/auth/AuthContext'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'

export function StorageUnitDetailPage() {
  const { storageUnitId = '' } = useParams<{ storageUnitId: string }>()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('storageUnits')
  const products = useCan('products')

  const snapshot = b.snapshot
  const su = snapshot && storageUnitId ? getStorageUnitByIdFromState(snapshot, storageUnitId) : undefined
  const rows = snapshot && storageUnitId ? buildStockPositionsForStorageUnitFromState(snapshot, storageUnitId) : []

  const rowActions = useMemo<PortalGridRowActions<StockOverviewRow>>(
    () => ({
      canView: perm.view && products.view,
      canEdit: perm.edit && products.edit,
      canDelete: perm.delete && products.delete,
      getViewHref: (r) => `/products/${String(r.productId)}/stock`,
      getEditHref: (r) => `/products/${String(r.productId)}/edit`,
    }),
    [perm.view, perm.edit, perm.delete, products.view, products.edit, products.delete],
  )

  if (gate) return gate

  if (!snapshot) return null

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
        <strong>{su.code}</strong> — {su.label} · Stock in this unit only (click a product row on the catalog for full
        product context).
      </p>
      <PortalGridPage config={stockOverviewGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
