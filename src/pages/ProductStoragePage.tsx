import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import {
  storageUnitsForProductGridConfig,
  type StorageUnitDistinctRow,
} from '@/pages/gridPageConfigs.stockDomain'
import { getProductByIdFromState, getStorageUnitsForProductFromState } from '@/domain/inventoryView'
import { productCatalogLabel } from '@/mocks/mockStore'
import { useCan } from '@/auth/AuthContext'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'

export function ProductStoragePage() {
  const { productId = '' } = useParams<{ productId: string }>()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('products')

  const snapshot = b.snapshot
  const product = snapshot && productId ? getProductByIdFromState(snapshot, productId) : undefined
  const rows = snapshot && productId ? getStorageUnitsForProductFromState(snapshot, productId) : []

  const rowActions = useMemo<PortalGridRowActions<StorageUnitDistinctRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => `/stock/storage-units/${String(r.id)}`,
      getEditHref: () => `/products/${productId}/edit`,
    }),
    [perm.view, perm.edit, perm.delete, productId],
  )

  if (gate) return gate

  if (!snapshot) return null

  if (!product) {
    return (
      <p>
        Product not found.{' '}
        <Link to="/products">
          <Button text="Back to products" />
        </Link>
      </p>
    )
  }

  return (
    <>
      <p className="form-page__hint" style={{ marginTop: 0 }}>
        Storage units that hold <strong>{productCatalogLabel(product)}</strong> (from stock positions)
      </p>
      <PortalGridPage config={storageUnitsForProductGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
