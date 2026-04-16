import { useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { purchasesGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { PurchaseListRow } from '@/mocks/domain/types'
import { buildPurchasesForProduct, getProductById, useMockStore } from '@/mocks/mockStore'

export function ProductPurchasesPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  useMockStore()
  const navigate = useNavigate()
  const product = getProductById(productId)
  const rows = buildPurchasesForProduct(productId)

  const onRowClick = (e: RowClickEvent<PurchaseListRow, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/purchases/${String(id)}`)
  }

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
        Purchases whose lines include <strong>{product.sku}</strong>. Open a row for bon, supplier, and
        receive-into-stock.
      </p>
      <PortalGridPage config={purchasesGridConfig} dataSource={rows} onRowClick={onRowClick} />
    </>
  )
}
