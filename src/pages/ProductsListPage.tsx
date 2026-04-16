import { Link, useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { useCan } from '@/auth/AuthContext'
import { productsGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { Product } from '@/mocks/domain/types'
import { useMockStore } from '@/mocks/mockStore'

export function ProductsListPage() {
  const navigate = useNavigate()
  const { products } = useMockStore()
  const purchases = useCan('purchases')
  const suppliers = useCan('suppliers')

  const onRowClick = (e: RowClickEvent<Product, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/products/${String(id)}/reports`)
  }

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Click a row for product reports, history, stock positions, and storage.
        </p>
        <Link to="/stock">
          <Button text="Stock overview" />
        </Link>
        {purchases.view ? (
          <Link to="/purchases">
            <Button text="Purchases" />
          </Link>
        ) : null}
        {suppliers.view ? (
          <Link to="/master-data/suppliers">
            <Button text="Suppliers" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage config={productsGridConfig} dataSource={products} onRowClick={onRowClick} />
    </>
  )
}
