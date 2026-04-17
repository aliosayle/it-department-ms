import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { PortalGridPage } from '@/components/grid/PortalGridPage'
import type { PortalGridRowActions } from '@/components/grid/portalGridTypes'
import { movementStatementGridConfig } from '@/pages/gridPageConfigs.stockDomain'
import { buildMovementStatementRowsFromState, getProductByIdFromState } from '@/domain/inventoryView'
import type { MovementStatementRow } from '@/mocks/domain/types'
import { productCatalogLabel } from '@/mocks/mockStore'
import { useCan } from '@/auth/AuthContext'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'

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
    'assignmentRef',
    'assetRef',
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
        r.refAssignmentId ?? '',
        r.refAssetId ?? '',
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
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('products')

  const snapshot = b.snapshot
  const product = snapshot && productId ? getProductByIdFromState(snapshot, productId) : undefined
  const rows = snapshot && productId ? buildMovementStatementRowsFromState(snapshot, productId) : []

  const rowActions = useMemo<PortalGridRowActions<MovementStatementRow>>(
    () => ({
      canView: perm.view,
      canEdit: perm.edit,
      canDelete: perm.delete,
      getViewHref: (r) => {
        if (r.refPurchaseId) return `/purchases/${String(r.refPurchaseId)}`
        return `/products/${productId}/stock`
      },
      getEditHref: () => `/products/${productId}/edit`,
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
        Movement statement for <strong>{productCatalogLabel(product)}</strong> (chronological, oldest first).
      </p>
      <div className="list-toolbar">
        <Button text="Copy statement as CSV" onClick={() => void copyCsv()} />
      </div>
      <PortalGridPage config={movementStatementGridConfig} dataSource={rows} rowActions={rowActions} />
    </>
  )
}
