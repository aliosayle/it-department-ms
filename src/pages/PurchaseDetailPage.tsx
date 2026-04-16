import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { RowClickEvent } from 'devextreme/ui/data_grid'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { useCan } from '@/auth/AuthContext'
import { purchaseLinesDetailGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import type { PurchaseLineDetailRow } from '@/mocks/domain/types'
import {
  buildPurchaseLineDetailRows,
  getPurchaseById,
  getSupplierById,
  useMockStore,
} from '@/mocks/mockStore'
import { portalReceivePurchase } from '@/api/mutations'
import './formPage.css'

export function PurchaseDetailPage() {
  const { purchaseId = '' } = useParams<{ purchaseId: string }>()
  useMockStore()
  const navigate = useNavigate()
  const perm = useCan('purchases')
  const purchase = getPurchaseById(purchaseId)
  const supplier = purchase ? getSupplierById(purchase.supplierId) : undefined
  const rows = buildPurchaseLineDetailRows(purchaseId)
  const [error, setError] = useState<string | null>(null)

  const canReceive = purchase && (purchase.status === 'ordered' || purchase.status === 'draft')

  const onRowClick = (e: RowClickEvent<PurchaseLineDetailRow, string | number>) => {
    const pid = e.data?.productId
    if (pid) navigate(`/products/${String(pid)}/stock`)
  }

  const rowActions = useMemo<PortalGridRowActions<PurchaseLineDetailRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => `/products/${String(r.productId)}/stock`,
      getEditHref: (r) => `/products/${String(r.productId)}/storage`,
    }),
    [perm.view, perm.edit, perm.delete],
  )

  const onReceive = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to receive purchases into stock.')
      return
    }
    const res = await portalReceivePurchase(purchaseId)
    if (!res.ok) {
      setError(res.error)
      return
    }
    navigate(`/purchases/${purchaseId}`, { replace: true })
  }

  if (!purchase) {
    return (
      <p>
        Purchase not found.{' '}
        <Link to="/purchases">
          <Button text="Back to purchases" />
        </Link>
      </p>
    )
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <div className="list-toolbar">
        <Link to="/purchases">
          <Button text="All purchases" />
        </Link>
        {supplier ? (
          <Link to="/master-data/suppliers">
            <Button text={`Supplier: ${supplier.name}`} />
          </Link>
        ) : null}
        <Link to="/stock/receive">
          <Button text="Manual receive" />
        </Link>
      </div>

      <p className="form-page__hint" style={{ marginTop: 0 }}>
        <strong>Bon:</strong> {purchase.bonNumber} · <strong>Status:</strong> {purchase.status} ·{' '}
        <strong>Ordered:</strong> {purchase.orderedAt}
        {purchase.expectedAt ? ` · Expected: ${purchase.expectedAt}` : ''}
        {purchase.receivedAt ? ` · Received: ${purchase.receivedAt}` : ''}
      </p>
      <p className="form-page__hint">
        Supplier ref: {purchase.supplierInvoiceRef || '—'} · Site id: {purchase.siteId} · Notes:{' '}
        {purchase.notes || '—'}
      </p>

      <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Lines — click a row to open product stock</h3>
      <PortalGridPage
        config={purchaseLinesDetailGridConfig}
        dataSource={rows}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />

      {canReceive ? (
        <div className="form-page__actions" style={{ marginTop: 16 }}>
          <Button
            text="Receive into stock (all lines)"
            type="default"
            stylingMode="contained"
            disabled={!perm.create}
            onClick={onReceive}
          />
          <p className="form-page__hint" style={{ margin: 0 }}>
            Each line is posted to stock using the same workflow as{' '}
            <Link to="/stock/receive">Receive stock</Link>, with ledger entries linked to this
            purchase for audit.
          </p>
        </div>
      ) : null}
    </div>
  )
}
