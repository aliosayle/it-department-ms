import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { movementStatementGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { buildMovementStatementRows, getProductById, useMockStore } from '@/mocks/mockStore'
import type { MovementStatementRow } from '@/mocks/domain/types'
import { useCan } from '@/auth/AuthContext'

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildStatementCsv(rows: MovementStatementRow[]): string {
  const header = [
    'when',
    'from',
    'to',
    'delta',
    'reason',
    'note',
    'deliveryRef',
    'purchaseRef',
    'transferGroup',
  ]
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        r.at,
        r.fromLabel,
        r.toLabel,
        String(r.delta),
        r.reason,
        r.note,
        r.refDeliveryId ?? '',
        r.refPurchaseId ?? '',
        r.correlationId ?? '',
      ]
        .map((c) => csvEscape(String(c)))
        .join(','),
    ),
  ]
  return lines.join('\n')
}

export function ProductHistoryPage() {
  const { productId = '' } = useParams<{ productId: string }>()
  useMockStore()
  const product = getProductById(productId)
  const rows = buildMovementStatementRows(productId)
  const perm = useCan('products')

  const rowActions = useMemo<PortalGridRowActions<MovementStatementRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => {
        if (r.refPurchaseId) return `/purchases/${String(r.refPurchaseId)}`
        return `/products/${productId}/stock`
      },
      getEditHref: () => `/products/${productId}/stock`,
    }),
    [perm.view, perm.edit, perm.delete, productId],
  )

  const csv = useMemo(() => buildStatementCsv(rows), [rows])

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(csv)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = csv
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
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
        Movement statement for <strong>{product.sku}</strong> (chronological, oldest first).
      </p>
      <div className="list-toolbar">
        <Button text="Copy statement as CSV" onClick={() => void copyCsv()} />
      </div>
      <PortalGridPage config={movementStatementGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
