import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { productReportGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { ProductReportRow } from '@/mocks/domain/types'
import { getProductById, getReportsForProduct, productCatalogLabel, useMockStore } from '@/mocks/mockStore'
import { useCan } from '@/auth/AuthContext'

export function ProductReportsPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  useMockStore()
  const product = getProductById(productId)
  const rows = getReportsForProduct(productId)
  const perm = useCan('products')

  const rowActions = useMemo<PortalGridRowActions<ProductReportRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: () => `/products/${productId}/history`,
      getEditHref: () => `/products/${productId}/stock`,
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
        Summary metrics for <strong>{productCatalogLabel(product)}</strong> — {product.name}
      </p>
      <PortalGridPage config={productReportGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
