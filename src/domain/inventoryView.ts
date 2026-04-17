import type {
  MovementStatementRow,
  Product,
  ProductMovement,
  ProductReportRow,
  PurchaseListRow,
  StockOverviewRow,
  StockPosition,
  StockProductSummaryRow,
  StorageUnit,
  StorageUnitStockRow,
} from '@/mocks/domain/types'
import type { StoreState } from '@/mocks/mockStore'

/** Stock positions for one product with joined labels (product stock tab). */
export type ProductStockRow = StockPosition & {
  storageCode: string
  siteName: string
  companyName: string
}

export type StorageUnitListRow = StorageUnit & {
  siteName: string
  companyName: string
  holderName?: string
}

export function getProductByIdFromState(state: StoreState, id: string): Product | undefined {
  return state.products.find((p) => p.id === id)
}

export function getStorageUnitByIdFromState(state: StoreState, id: string): StorageUnit | undefined {
  return state.storageUnits.find((u) => u.id === id)
}

export function buildStockOverviewFromState(state: StoreState): StockOverviewRow[] {
  return state.stockPositions
    .filter((pos) => pos.quantity > 0)
    .map((pos) => {
      const product = state.products.find((p) => p.id === pos.productId)
      const su = state.storageUnits.find((u) => u.id === pos.storageUnitId)
      const site = su ? state.sites.find((x) => x.id === su.siteId) : undefined
      const company = site ? state.companies.find((c) => c.id === site.companyId) : undefined
      return {
        id: pos.id,
        productId: pos.productId,
        productSku: product?.reference || product?.sku || pos.productId,
        productName: product?.name ?? '—',
        storageCode: su ? `${su.code} (${su.label})` : '—',
        siteName: site?.name ?? '—',
        companyName: company?.name ?? '—',
        quantity: pos.quantity,
        status: pos.status,
      }
    })
}

export function buildStockOverviewByProductFromState(state: StoreState): StockProductSummaryRow[] {
  const byProduct = new Map<string, number>()
  for (const pos of state.stockPositions) {
    if (pos.quantity <= 0) continue
    byProduct.set(pos.productId, (byProduct.get(pos.productId) ?? 0) + pos.quantity)
  }
  const rows: StockProductSummaryRow[] = []
  for (const [productId, totalQuantity] of byProduct) {
    const product = state.products.find((p) => p.id === productId)
    rows.push({
      id: productId,
      productId,
      productSku: product?.reference || product?.sku || productId,
      productName: product?.name ?? '—',
      totalQuantity,
    })
  }
  return rows.sort((a, b) => a.productSku.localeCompare(b.productSku))
}

export function buildStockPositionsForStorageUnitFromState(
  state: StoreState,
  storageUnitId: string,
): StorageUnitStockRow[] {
  return state.stockPositions
    .filter((pos) => pos.storageUnitId === storageUnitId && pos.quantity > 0)
    .map((pos) => {
      const product = state.products.find((p) => p.id === pos.productId)
      const su = state.storageUnits.find((u) => u.id === pos.storageUnitId)
      const site = su ? state.sites.find((x) => x.id === su.siteId) : undefined
      const company = site ? state.companies.find((c) => c.id === site.companyId) : undefined
      return {
        id: pos.id,
        productId: pos.productId,
        productSku: product?.reference || product?.sku || pos.productId,
        productName: product?.name ?? '—',
        storageCode: su ? `${su.code} (${su.label})` : '—',
        siteName: site?.name ?? '—',
        companyName: company?.name ?? '—',
        quantity: pos.quantity,
        status: pos.status,
      }
    })
}

export function buildStorageUnitListRowsFromState(state: StoreState): StorageUnitListRow[] {
  return state.storageUnits.map((u) => {
    const site = state.sites.find((s) => s.id === u.siteId)
    const company = site ? state.companies.find((c) => c.id === site.companyId) : undefined
    const holder = u.personnelId ? state.personnel.find((p) => p.id === u.personnelId)?.fullName : undefined
    return {
      ...u,
      siteName: site?.name ?? '—',
      companyName: company?.name ?? '—',
      holderName: holder,
    }
  })
}

export function buildMovementStatementRowsFromState(
  state: StoreState,
  productId: string,
): MovementStatementRow[] {
  return state.productMovements
    .filter((m) => m.productId === productId)
    .slice()
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
    .map((m) => ({
      id: m.id,
      at: m.at,
      fromLabel: m.fromStorageLabel ?? '—',
      toLabel: m.toStorageLabel ?? '—',
      delta: m.delta,
      reason: m.reason,
      note: m.note,
      refAssignmentId: m.refAssignmentId,
      refAssetId: m.refAssetId,
      refStockPositionId: m.refStockPositionId,
      refPurchaseId: m.refPurchaseId ?? null,
      correlationId: m.correlationId,
    }))
}

export function buildPurchaseListRowsFromState(state: StoreState): PurchaseListRow[] {
  return state.purchases.map((p) => {
    const sup = state.suppliers.find((s) => s.id === p.supplierId)
    const per = state.personnel.find((x) => x.id === p.issuedByPersonnelId)
    const site = state.sites.find((s) => s.id === p.siteId)
    const company = site ? state.companies.find((c) => c.id === site.companyId) : undefined
    const lineCount = state.purchaseLines.filter((l) => l.purchaseId === p.id).length
    return {
      ...p,
      supplierName: sup?.name ?? '—',
      issuedByName: per?.fullName ?? '—',
      siteName: site?.name ?? '—',
      companyName: company?.name ?? '—',
      lineCount,
    }
  })
}

export function buildPurchasesForProductFromState(state: StoreState, productId: string): PurchaseListRow[] {
  const purchaseIds = new Set(
    state.purchaseLines.filter((l) => l.productId === productId).map((l) => l.purchaseId),
  )
  return buildPurchaseListRowsFromState(state).filter((r) => purchaseIds.has(r.id))
}

export function getMovementsForProductFromState(state: StoreState, productId: string): ProductMovement[] {
  return state.productMovements
    .filter((m) => m.productId === productId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function getStockPositionsForProductFromState(state: StoreState, productId: string): StockPosition[] {
  return state.stockPositions.filter((p) => p.productId === productId && p.quantity > 0)
}

export function buildProductStockRowsFromState(state: StoreState, productId: string): ProductStockRow[] {
  return getStockPositionsForProductFromState(state, productId).map((pos) => {
    const su = state.storageUnits.find((u) => u.id === pos.storageUnitId)
    const site = su ? state.sites.find((s) => s.id === su.siteId) : undefined
    const company = site ? state.companies.find((c) => c.id === site.companyId) : undefined
    const storageCode = su ? `${su.code} (${su.label})` : pos.storageUnitId
    return {
      ...pos,
      storageCode,
      siteName: site?.name ?? '—',
      companyName: company?.name ?? '—',
    }
  })
}

export function getReportsForProductFromState(state: StoreState, productId: string): ProductReportRow[] {
  return state.productReports.filter((r) => r.productId === productId)
}

export function getStorageUnitsForProductFromState(state: StoreState, productId: string) {
  const posIds = new Set(
    state.stockPositions.filter((p) => p.productId === productId).map((p) => p.storageUnitId),
  )
  return state.storageUnits
    .filter((u) => posIds.has(u.id))
    .map((u) => {
      const site = state.sites.find((s) => s.id === u.siteId)
      const company = site ? state.companies.find((c) => c.id === site.companyId) : undefined
      return {
        id: u.id,
        code: u.code,
        label: u.label,
        kind: u.kind,
        siteName: site?.name ?? '—',
        companyName: company?.name ?? '—',
      }
    })
}

/** Product dropdown label: reference first, then SKU/name (matches productCatalogLabel spirit). */
export function productOptionText(p: Pick<Product, 'reference' | 'sku' | 'name'>): string {
  const ref = (p.reference || '').trim() || '—'
  const sku = (p.sku || '').trim()
  const name = (p.name || '').trim()
  if (sku) return `${ref} · ${sku} — ${name || ref}`
  return `${ref} — ${name || ref}`
}
