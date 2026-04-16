import { Link, useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import { stockProductSummaryGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { useCan } from '@/auth/AuthContext'
import { buildStockOverviewByProduct, useMockStore } from '@/mocks/mockStore'
import type { StockProductSummaryRow } from '@/mocks/domain/types'

export function StockListPage() {
  useMockStore()
  const navigate = useNavigate()
  const rows = buildStockOverviewByProduct()
  const receive = useCan('stockReceive')
  const transfer = useCan('stockTransfer')
  const storages = useCan('storageUnits')
  const purchases = useCan('purchases')
  const suppliers = useCan('suppliers')

  const onRowClick = (e: RowClickEvent<StockProductSummaryRow, string | number>) => {
    const id = e.data?.productId
    if (id) navigate(`/products/${String(id)}/stock`)
  }

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Totals across all storage units. Click a row for per-storage breakdown on the product.
        </p>
        {receive.create ? (
          <Link to="/stock/receive">
            <Button text="Receive stock" type="default" stylingMode="contained" />
          </Link>
        ) : null}
        {transfer.create ? (
          <Link to="/stock/transfer">
            <Button text="Transfer" type="default" stylingMode="contained" />
          </Link>
        ) : null}
        {storages.view ? (
          <Link to="/stock/storage-units">
            <Button text="Storage units" />
          </Link>
        ) : null}
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
      <PortalGridPage
        config={stockProductSummaryGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
      />
    </>
  )
}
