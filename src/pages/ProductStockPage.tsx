import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { productStockPositionsGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { buildProductStockRows, getProductById, useMockStore } from '@/mocks/mockStore'

export function ProductStockPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  useMockStore()
  const product = getProductById(productId)
  const rows = buildProductStockRows(productId)

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
      <PortalGridPage config={productStockPositionsGridConfig} dataSource={rows} />
    </>
  )
}
