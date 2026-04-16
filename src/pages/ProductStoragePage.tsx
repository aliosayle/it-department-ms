import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { storageUnitsForProductGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { getProductById, getStorageUnitsForProduct } from '@/mocks/mockStore'

export function ProductStoragePage() {
  const { productId = '' } = useParams<{ productId: string }>()
  const product = getProductById(productId)
  const rows = getStorageUnitsForProduct(productId)

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
        Storage units that hold <strong>{product.sku}</strong> (from stock positions)
      </p>
      <PortalGridPage config={storageUnitsForProductGridConfig} dataSource={rows} />
    </>
  )
}
