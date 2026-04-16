import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import { Link } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import { purchasesGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { PurchaseListRow } from '@/mocks/domain/types'
import { buildPurchaseListRows, useMockStore } from '@/mocks/mockStore'

export function PurchasesListPage() {
  useMockStore()
  const navigate = useNavigate()
  const perm = useCan('purchases')
  const rows = buildPurchaseListRows()

  const onRowClick = (e: RowClickEvent<PurchaseListRow, string | number>) => {
    const id = e.data?.id
    if (id) navigate(`/purchases/${String(id)}`)
  }

  const rowActions = useMemo<PortalGridRowActions<PurchaseListRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => `/purchases/${String(r.id)}`,
      getEditHref: (r) => `/purchases/${String(r.id)}`,
    }),
    [perm.view, perm.edit, perm.delete],
  )

  return (
    <>
      <div className="list-toolbar">
        <p className="form-page__hint" style={{ margin: 0 }}>
          Each purchase has a <strong>bon</strong> (delivery note), supplier, who issued it internally, and
          lines that post into stock when received.{' '}
          <Link to="/master-data/suppliers">Suppliers</Link> ·{' '}
          <Link to="/products">Products</Link> · <Link to="/stock">Stock</Link>
        </p>
        {perm.create ? (
          <Link to="/purchases/new">
            <Button text="New purchase" type="default" stylingMode="contained" />
          </Link>
        ) : null}
      </div>
      <PortalGridPage
        config={purchasesGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
    </>
  )
}
