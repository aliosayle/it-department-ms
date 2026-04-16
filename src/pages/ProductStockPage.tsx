import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { productStockPositionsGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { ProductStockRow } from '@/mocks/mockStore'
import { buildProductStockRows, getProductById, useMockStore } from '@/mocks/mockStore'
import { useCan } from '@/auth/AuthContext'

export function ProductStockPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  useMockStore()
  const product = getProductById(productId)
  const rows = buildProductStockRows(productId)
  const perm = useCan('products')

  const rowActions = useMemo<PortalGridRowActions<ProductStockRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => `/stock/storage-units/${String(r.storageUnitId)}`,
      getEditHref: () => `/products/${productId}/storage`,
    }),
    [perm.view, perm.edit, perm.delete, productId],
  )

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
        Stock positions for <strong>{product.sku}</strong>
      </p>
      <PortalGridPage config={productStockPositionsGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
