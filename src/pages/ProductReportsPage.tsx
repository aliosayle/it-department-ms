import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { productReportGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { getProductById, getReportsForProduct, useMockStore } from '@/mocks/mockStore'

export function ProductReportsPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  useMockStore()
  const product = getProductById(productId)
  const rows = getReportsForProduct(productId)

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
        Summary metrics for <strong>{product.sku}</strong> — {product.name}
      </p>
      <PortalGridPage config={productReportGridConfig} dataSource={rows} />
    </>
  )
}
