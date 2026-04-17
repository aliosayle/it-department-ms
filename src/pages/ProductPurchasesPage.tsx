import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { purchasesGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { PurchaseListRow } from '@/mocks/domain/types'
import { buildPurchasesForProductFromState, getProductByIdFromState } from '@/domain/inventoryView'
import { productCatalogLabel } from '@/mocks/mockStore'
import { useCan } from '@/auth/AuthContext'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'

export function ProductPurchasesPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const navigate = useNavigate()
  const perm = useCan('purchases')

  const snapshot = b.snapshot
  const product = snapshot && productId ? getProductByIdFromState(snapshot, productId) : undefined
  const rows = snapshot && productId ? buildPurchasesForProductFromState(snapshot, productId) : []

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
        Purchases whose lines include <strong>{productCatalogLabel(product)}</strong>. Open a row for bon, supplier, and
        receive-into-stock.
      </p>
      <PortalGridPage
        config={purchasesGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
    </>
  )
}
