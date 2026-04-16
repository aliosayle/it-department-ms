import type {
  Company,
  CreateDeliveryInput,
  CreatePurchaseInput,
  Delivery,
  MovementStatementRow,
  NetworkDevice,
  PageCrud,
  PageKey,
  Personnel,
  PortalUser,
  Product,
  ProductMovement,
  ProductReportRow,
  Purchase,
  PurchaseLine,
  PurchaseLineDetailRow,
  PurchaseListRow,
  ReceiveStockInput,
  Site,
  StockOverviewRow,
  StockPosition,
  StockProductSummaryRow,
  StorageUnit,
  StorageUnitStockRow,
  Supplier,
  TransferStockInput,
  UserEquipment,
} from '@/mocks/domain/types'

export type StoreState = {
  companies: Company[]
  sites: Site[]
  personnel: Personnel[]
  storageUnits: StorageUnit[]
  products: Product[]
  stockPositions: StockPosition[]
  productMovements: ProductMovement[]
  productReports: ProductReportRow[]
  deliveries: Delivery[]
  userEquipment: UserEquipment[]
  networkDevices: NetworkDevice[]
  users: PortalUser[]
  suppliers: Supplier[]
  purchases: Purchase[]
  purchaseLines: PurchaseLine[]
}

export function formatStorageUnitLabel(u: StorageUnit | undefined): string {
  if (!u) return '—'
  return `${u.code} (${u.label})`
}

function stripZeroStockPositions(rows: StockPosition[]): StockPosition[] {
  return rows.filter((p) => p.quantity > 0)
}

/** Empty in-memory store; signed-in API bootstrap supplies real data. */
function emptyStore(): StoreState {
  return {
    companies: [],
    sites: [],
    personnel: [],
    storageUnits: [],
    products: [],
    stockPositions: [],
    productMovements: [],
    productReports: [],
    deliveries: [],
    userEquipment: [],
    networkDevices: [],
    users: [],
    suppliers: [],
    purchases: [],
    purchaseLines: [],
  }
}

let memState: StoreState = emptyStore()
/** When API mode loads bootstrap JSON, reads use this snapshot until the next refetch. */
let liveSnapshot: StoreState | null = null

export function setLiveSnapshot(s: StoreState | null) {
  liveSnapshot = s
  emit()
}

function active(): StoreState {
  return liveSnapshot ?? memState
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function setState(updater: (s: StoreState) => void) {
  updater(memState)
  emit()
}

export function subscribeMockStore(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getMockStoreSnapshot(): StoreState {
  return active()
}

let idCounter = 1
function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`
}

function siteBelongsToCompany(siteId: string, companyId: string): boolean {
  const site = active().sites.find((s) => s.id === siteId)
  return site?.companyId === companyId
}

export function addCompany(name: string, notes = ''): Company {
  const row: Company = { id: nextId('co'), name: name.trim(), notes: notes.trim() }
  setState((s) => {
    s.companies = [...s.companies, row]
  })
  return row
}

export function addSite(companyId: string, name: string, location: string): { ok: true; site: Site } | { ok: false; error: string } {
  if (!active().companies.some((c) => c.id === companyId)) {
    return { ok: false, error: 'Company not found.' }
  }
  const site: Site = {
    id: nextId('site'),
    companyId,
    name: name.trim(),
    location: location.trim(),
  }
  setState((s) => {
    s.sites = [...s.sites, site]
  })
  return { ok: true, site }
}

export function addPersonnel(
  fullName: string,
  email: string,
  companyId: string,
  siteId: string,
): { ok: true; personnel: Personnel } | { ok: false; error: string } {
  if (!active().companies.some((c) => c.id === companyId)) {
    return { ok: false, error: 'Company not found.' }
  }
  const site = active().sites.find((x) => x.id === siteId)
  if (!site) return { ok: false, error: 'Site not found.' }
  if (site.companyId !== companyId) {
    return { ok: false, error: 'Site does not belong to the selected company.' }
  }
  const row: Personnel = {
    id: nextId('per'),
    fullName: fullName.trim(),
    email: email.trim(),
    companyId,
    siteId,
  }
  setState((s) => {
    s.personnel = [...s.personnel, row]
  })
  return { ok: true, personnel: row }
}

function resolveDeliveryLabels(personnelId: string, siteId: string): { deliveredTo: string; site: string } {
  const per = active().personnel.find((p) => p.id === personnelId)
  const site = active().sites.find((x) => x.id === siteId)
  return {
    deliveredTo: per ? `${per.fullName}${per.email ? ` <${per.email}>` : ''}` : '',
    site: site ? `${site.name} — ${site.location}` : '',
  }
}

export function receiveStock(input: ReceiveStockInput): { ok: true } | { ok: false; error: string } {
  const q = Math.floor(input.quantity)
  if (q < 1) return { ok: false, error: 'Quantity must be at least 1.' }
  if (!active().products.some((p) => p.id === input.productId)) return { ok: false, error: 'Product not found.' }
  if (!active().storageUnits.some((u) => u.id === input.storageUnitId)) {
    return { ok: false, error: 'Storage unit not found.' }
  }

  const status = input.status.trim() || 'Available'
  const note = input.note.trim()

  setState((s) => {
    const su = s.storageUnits.find((u) => u.id === input.storageUnitId)
    const toLabel = formatStorageUnitLabel(su)
    const existing = s.stockPositions.find(
      (p) => p.productId === input.productId && p.storageUnitId === input.storageUnitId,
    )
    let positionId: string
    if (existing) {
      positionId = existing.id
      s.stockPositions = s.stockPositions.map((p) =>
        p.id === existing.id ? { ...p, quantity: p.quantity + q, status } : p,
      )
    } else {
      positionId = nextId('pos')
      s.stockPositions = [
        ...s.stockPositions,
        {
          id: positionId,
          productId: input.productId,
          storageUnitId: input.storageUnitId,
          quantity: q,
          status,
        },
      ]
    }
    s.productMovements = [
      {
        id: nextId('mov'),
        productId: input.productId,
        at: new Date().toISOString(),
        delta: q,
        reason: `receive:${input.reason}`,
        refDeliveryId: null,
        refStockPositionId: positionId,
        refPurchaseId: input.purchaseId ?? null,
        note: note || 'Inbound receive',
        fromStorageLabel: '—',
        toStorageLabel: toLabel,
      },
      ...s.productMovements,
    ]
  })

  return { ok: true }
}

export type CreateDeliveryResult =
  | { ok: true; delivery: Delivery }
  | { ok: false; error: string }

export function createDelivery(input: CreateDeliveryInput): CreateDeliveryResult {
  if (!input.companyId || !input.siteId || !input.personnelId) {
    return { ok: false, error: 'Company, site, and recipient are required.' }
  }
  const per = active().personnel.find((p) => p.id === input.personnelId)
  if (!per) return { ok: false, error: 'Personnel not found.' }
  if (per.companyId !== input.companyId) return { ok: false, error: 'Personnel does not belong to the selected company.' }
  if (!siteBelongsToCompany(input.siteId, input.companyId)) {
    return { ok: false, error: 'Site does not belong to the selected company.' }
  }
  if (per.siteId !== input.siteId) {
    return { ok: false, error: 'Recipient is not assigned to the selected site.' }
  }

  if (input.source === 'stock') {
    if (!input.stockPositionId) {
      return { ok: false, error: 'Select a stock position.' }
    }
    const idx = active().stockPositions.findIndex((x) => x.id === input.stockPositionId)
    if (idx < 0) return { ok: false, error: 'Stock position not found.' }
    if (input.quantity < 1) return { ok: false, error: 'Quantity must be at least 1.' }
    if (input.quantity > active().stockPositions[idx].quantity) {
      return {
        ok: false,
        error: `Insufficient quantity (available: ${active().stockPositions[idx].quantity}).`,
      }
    }
    const fromStorage = active().storageUnits.find(
      (u) => u.id === active().stockPositions[idx].storageUnitId,
    )
    if (fromStorage && fromStorage.siteId !== input.siteId) {
      return {
        ok: false,
        error: 'Stock position must be in a storage unit at the selected delivery site.',
      }
    }
    const custodySu = active().storageUnits.find(
      (u) => u.personnelId === input.personnelId && u.kind === 'custody',
    )
    if (!custodySu) {
      return {
        ok: false,
        error: 'Recipient has no custody storage unit. Add a custody bin for this person in storage units.',
      }
    }
  }

  const { deliveredTo, site: siteLabel } = resolveDeliveryLabels(input.personnelId, input.siteId)

  const delivery: Delivery = {
    id: nextId('del'),
    source: input.source,
    stockPositionId: input.source === 'stock' ? input.stockPositionId : null,
    quantity: input.quantity,
    itemReceivedDate: input.source === 'stock' ? null : input.itemReceivedDate,
    itemDescription: input.itemDescription,
    deliveredTo: input.deliveredTo.trim() || deliveredTo,
    site: input.site.trim() || siteLabel,
    dateDelivered: input.dateDelivered,
    description: input.description,
    companyId: input.companyId,
    siteId: input.siteId,
    personnelId: input.personnelId,
  }

  setState((s) => {
    s.deliveries = [delivery, ...s.deliveries]
    if (input.source === 'stock' && input.stockPositionId) {
      const pos = s.stockPositions.find((x) => x.id === input.stockPositionId)
      if (!pos) {
        return
      }
      const custodySu = s.storageUnits.find(
        (u) => u.personnelId === input.personnelId && u.kind === 'custody',
      )
      if (!custodySu) return
      const productId = pos.productId
      const fromSu = s.storageUnits.find((u) => u.id === pos.storageUnitId)
      const fromLabel = formatStorageUnitLabel(fromSu)
      const custodyLabel = formatStorageUnitLabel(custodySu)
      const q = input.quantity
      const recipient = s.personnel.find((p) => p.id === input.personnelId)

      s.stockPositions = s.stockPositions.map((row) =>
        row.id === input.stockPositionId ? { ...row, quantity: row.quantity - q } : row,
      )
      s.stockPositions = stripZeroStockPositions(s.stockPositions)

      const existingCustody = s.stockPositions.find(
        (p) => p.productId === productId && p.storageUnitId === custodySu!.id,
      )
      let custodyPositionId: string
      if (existingCustody) {
        custodyPositionId = existingCustody.id
        s.stockPositions = s.stockPositions.map((row) =>
          row.id === existingCustody.id ? { ...row, quantity: row.quantity + q, status: 'Issued' } : row,
        )
      } else {
        custodyPositionId = nextId('pos')
        s.stockPositions = [
          ...s.stockPositions,
          {
            id: custodyPositionId,
            productId,
            storageUnitId: custodySu!.id,
            quantity: q,
            status: 'Issued',
          },
        ]
      }

      const now = Date.now()
      const outAt = new Date(now).toISOString()
      const inAt = new Date(now + 1).toISOString()

      s.productMovements = [
        {
          id: nextId('mov'),
          productId,
          at: inAt,
          delta: q,
          reason: 'custody_in',
          refDeliveryId: delivery.id,
          refStockPositionId: custodyPositionId,
          note: delivery.description || `Issued to ${recipient?.fullName ?? 'recipient'}`,
          fromStorageLabel: fromLabel,
          toStorageLabel: custodyLabel,
          personnelId: input.personnelId,
        },
        {
          id: nextId('mov'),
          productId,
          at: outAt,
          delta: -q,
          reason: 'delivery_out',
          refDeliveryId: delivery.id,
          refStockPositionId: input.stockPositionId,
          note: delivery.description || 'Outbound delivery',
          fromStorageLabel: fromLabel,
          toStorageLabel: custodyLabel,
          personnelId: input.personnelId,
        },
        ...s.productMovements,
      ]
    }
  })

  return { ok: true, delivery }
}

export type TransferStockResult = { ok: true } | { ok: false; error: string }

export function transferStock(input: TransferStockInput): TransferStockResult {
  const q = Math.floor(input.quantity)
  if (q < 1) return { ok: false, error: 'Quantity must be at least 1.' }
  const fromPos = active().stockPositions.find((p) => p.id === input.fromStockPositionId)
  if (!fromPos) return { ok: false, error: 'Source stock position not found.' }
  if (q > fromPos.quantity) {
    return { ok: false, error: `Insufficient quantity (available: ${fromPos.quantity}).` }
  }
  const destSu = active().storageUnits.find((u) => u.id === input.toStorageUnitId)
  if (!destSu) return { ok: false, error: 'Destination storage unit not found.' }
  if (fromPos.storageUnitId === input.toStorageUnitId) {
    return { ok: false, error: 'Source and destination storage are the same.' }
  }
  const fromSu = active().storageUnits.find((u) => u.id === fromPos.storageUnitId)
  const fromLabel = formatStorageUnitLabel(fromSu)
  const toLabel = formatStorageUnitLabel(destSu)
  const productId = fromPos.productId
  const correlationId = nextId('xfer')
  const note = input.note.trim() || 'Transfer between storages'

  setState((s) => {
    const fp = s.stockPositions.find((p) => p.id === input.fromStockPositionId)
    if (!fp || q > fp.quantity) return

    s.stockPositions = s.stockPositions.map((row) =>
      row.id === input.fromStockPositionId ? { ...row, quantity: row.quantity - q } : row,
    )
    s.stockPositions = stripZeroStockPositions(s.stockPositions)

    const existingDest = s.stockPositions.find(
      (p) => p.productId === productId && p.storageUnitId === input.toStorageUnitId,
    )
    let destPositionId: string
    if (existingDest) {
      destPositionId = existingDest.id
      s.stockPositions = s.stockPositions.map((row) =>
        row.id === existingDest.id ? { ...row, quantity: row.quantity + q } : row,
      )
    } else {
      destPositionId = nextId('pos')
      s.stockPositions = [
        ...s.stockPositions,
        {
          id: destPositionId,
          productId,
          storageUnitId: input.toStorageUnitId,
          quantity: q,
          status: fp.status,
        },
      ]
    }

    const now = Date.now()
    const outAt = new Date(now).toISOString()
    const inAt = new Date(now + 1).toISOString()

    s.productMovements = [
      {
        id: nextId('mov'),
        productId,
        at: inAt,
        delta: q,
        reason: 'transfer_in',
        refDeliveryId: null,
        refStockPositionId: destPositionId,
        note,
        fromStorageLabel: fromLabel,
        toStorageLabel: toLabel,
        correlationId,
      },
      {
        id: nextId('mov'),
        productId,
        at: outAt,
        delta: -q,
        reason: 'transfer_out',
        refDeliveryId: null,
        refStockPositionId: input.fromStockPositionId,
        note,
        fromStorageLabel: fromLabel,
        toStorageLabel: toLabel,
        correlationId,
      },
      ...s.productMovements,
    ]
  })

  return { ok: true }
}

export function buildStockOverview(): StockOverviewRow[] {
  return active().stockPositions.filter((pos) => pos.quantity > 0).map((pos) => {
    const product = active().products.find((p) => p.id === pos.productId)
    const su = active().storageUnits.find((u) => u.id === pos.storageUnitId)
    const site = su ? active().sites.find((x) => x.id === su.siteId) : undefined
    const company = site ? active().companies.find((c) => c.id === site.companyId) : undefined
    return {
      id: pos.id,
      productId: pos.productId,
      productSku: product?.sku ?? pos.productId,
      productName: product?.name ?? '—',
      storageCode: su ? `${su.code} (${su.label})` : '—',
      siteName: site?.name ?? '—',
      companyName: company?.name ?? '—',
      quantity: pos.quantity,
      status: pos.status,
    }
  })
}

export function buildStockOverviewByProduct(): StockProductSummaryRow[] {
  const byProduct = new Map<string, number>()
  for (const pos of active().stockPositions) {
    if (pos.quantity <= 0) continue
    byProduct.set(pos.productId, (byProduct.get(pos.productId) ?? 0) + pos.quantity)
  }
  const rows: StockProductSummaryRow[] = []
  for (const [productId, totalQuantity] of byProduct) {
    const product = active().products.find((p) => p.id === productId)
    rows.push({
      id: productId,
      productId,
      productSku: product?.sku ?? productId,
      productName: product?.name ?? '—',
      totalQuantity,
    })
  }
  return rows.sort((a, b) => a.productSku.localeCompare(b.productSku))
}

export function buildStockPositionsForStorageUnit(storageUnitId: string): StorageUnitStockRow[] {
  return active().stockPositions
    .filter((pos) => pos.storageUnitId === storageUnitId && pos.quantity > 0)
    .map((pos) => {
      const product = active().products.find((p) => p.id === pos.productId)
      const su = active().storageUnits.find((u) => u.id === pos.storageUnitId)
      const site = su ? active().sites.find((x) => x.id === su.siteId) : undefined
      const company = site ? active().companies.find((c) => c.id === site.companyId) : undefined
      return {
        id: pos.id,
        productId: pos.productId,
        productSku: product?.sku ?? pos.productId,
        productName: product?.name ?? '—',
        storageCode: su ? `${su.code} (${su.label})` : '—',
        siteName: site?.name ?? '—',
        companyName: company?.name ?? '—',
        quantity: pos.quantity,
        status: pos.status,
      }
    })
}

export type StorageUnitListRow = StorageUnit & {
  siteName: string
  companyName: string
  holderName?: string
}

export function buildStorageUnitListRows(): StorageUnitListRow[] {
  return active().storageUnits.map((u) => {
    const site = active().sites.find((s) => s.id === u.siteId)
    const company = site ? active().companies.find((c) => c.id === site.companyId) : undefined
    const holder = u.personnelId
      ? active().personnel.find((p) => p.id === u.personnelId)?.fullName
      : undefined
    return {
      ...u,
      siteName: site?.name ?? '—',
      companyName: company?.name ?? '—',
      holderName: holder,
    }
  })
}

export function getStorageUnitById(id: string): StorageUnit | undefined {
  return active().storageUnits.find((u) => u.id === id)
}

export function buildMovementStatementRows(productId: string): MovementStatementRow[] {
  return active().productMovements
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
      refDeliveryId: m.refDeliveryId,
      refStockPositionId: m.refStockPositionId,
      refPurchaseId: m.refPurchaseId ?? null,
      correlationId: m.correlationId,
    }))
}

export function addSupplier(
  name: string,
  contactName: string,
  email: string,
  phone: string,
  address: string,
  notes: string,
): Supplier {
  if (!name.trim()) throw new Error('Supplier name is required.')
  const row: Supplier = {
    id: nextId('sup'),
    name: name.trim(),
    contactName: contactName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    address: address.trim(),
    notes: notes.trim(),
  }
  setState((s) => {
    s.suppliers = [...s.suppliers, row]
  })
  return row
}

export function getSupplierById(id: string): Supplier | undefined {
  return active().suppliers.find((x) => x.id === id)
}

export function getPurchaseById(id: string): Purchase | undefined {
  return active().purchases.find((x) => x.id === id)
}

export function buildPurchaseListRows(): PurchaseListRow[] {
  return active().purchases.map((p) => {
    const sup = active().suppliers.find((s) => s.id === p.supplierId)
    const per = active().personnel.find((x) => x.id === p.issuedByPersonnelId)
    const site = active().sites.find((s) => s.id === p.siteId)
    const company = site ? active().companies.find((c) => c.id === site.companyId) : undefined
    const lineCount = active().purchaseLines.filter((l) => l.purchaseId === p.id).length
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

export function buildPurchasesForProduct(productId: string): PurchaseListRow[] {
  const purchaseIds = new Set(
    active().purchaseLines.filter((l) => l.productId === productId).map((l) => l.purchaseId),
  )
  return buildPurchaseListRows().filter((r) => purchaseIds.has(r.id))
}

export function buildPurchaseLineDetailRows(purchaseId: string): PurchaseLineDetailRow[] {
  return active().purchaseLines
    .filter((l) => l.purchaseId === purchaseId)
    .map((line) => {
      const pr = active().products.find((p) => p.id === line.productId)
      const su = active().storageUnits.find((u) => u.id === line.storageUnitId)
      const site = su ? active().sites.find((s) => s.id === su.siteId) : undefined
      const storageCode = su ? `${su.code} (${su.label})` : line.storageUnitId
      return {
        id: line.id,
        productId: line.productId,
        productSku: pr?.sku ?? line.productId,
        productName: pr?.name ?? '—',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.quantity * line.unitPrice,
        storageCode,
        siteName: site?.name ?? '—',
      }
    })
}

export type CreatePurchaseResult =
  | { ok: true; purchase: Purchase }
  | { ok: false; error: string }

export function createPurchase(input: CreatePurchaseInput): CreatePurchaseResult {
  const bon = input.bonNumber.trim()
  if (!bon) return { ok: false, error: 'Bon number is required.' }
  if (active().purchases.some((p) => p.bonNumber.toLowerCase() === bon.toLowerCase())) {
    return { ok: false, error: 'A purchase with this bon number already exists.' }
  }
  if (!active().suppliers.some((s) => s.id === input.supplierId)) {
    return { ok: false, error: 'Supplier not found.' }
  }
  const issuer = active().personnel.find((p) => p.id === input.issuedByPersonnelId)
  if (!issuer) {
    return { ok: false, error: 'Issued-by (personnel) not found.' }
  }
  if (issuer.siteId !== input.siteId) {
    return { ok: false, error: 'Issued-by personnel must belong to the purchase site.' }
  }
  if (!active().sites.some((s) => s.id === input.siteId)) {
    return { ok: false, error: 'Site not found.' }
  }
  if (input.lines.length < 1) {
    return { ok: false, error: 'Add at least one line (product, quantity, storage).' }
  }
  for (const line of input.lines) {
    if (line.quantity < 1) return { ok: false, error: 'Each line needs quantity at least 1.' }
    if (!active().products.some((p) => p.id === line.productId)) {
      return { ok: false, error: 'Product not found on a line.' }
    }
    const su = active().storageUnits.find((u) => u.id === line.storageUnitId)
    if (!su) {
      return { ok: false, error: 'Storage unit not found on a line.' }
    }
    if (su.siteId !== input.siteId) {
      return { ok: false, error: 'Each line storage unit must belong to the purchase site.' }
    }
  }

  const purchase: Purchase = {
    id: nextId('pur'),
    bonNumber: bon,
    supplierInvoiceRef: input.supplierInvoiceRef.trim(),
    supplierId: input.supplierId,
    issuedByPersonnelId: input.issuedByPersonnelId,
    siteId: input.siteId,
    orderedAt: input.orderedAt,
    expectedAt: input.expectedAt,
    receivedAt: null,
    status: 'ordered',
    notes: input.notes.trim(),
  }

  const newLines: PurchaseLine[] = input.lines.map((l) => ({
    id: nextId('pl'),
    purchaseId: purchase.id,
    productId: l.productId,
    quantity: Math.floor(l.quantity),
    unitPrice: l.unitPrice,
    storageUnitId: l.storageUnitId,
  }))

  setState((s) => {
    s.purchases = [purchase, ...s.purchases]
    s.purchaseLines = [...newLines, ...s.purchaseLines]
  })

  return { ok: true, purchase }
}

export type ReceivePurchaseResult = { ok: true } | { ok: false; error: string }

export function receivePurchase(purchaseId: string): ReceivePurchaseResult {
  const purchase = active().purchases.find((p) => p.id === purchaseId)
  if (!purchase) return { ok: false, error: 'Purchase not found.' }
  if (purchase.status === 'received') {
    return { ok: false, error: 'This purchase is already received into stock.' }
  }
  if (purchase.status === 'cancelled') {
    return { ok: false, error: 'Cancelled purchase cannot be received.' }
  }
  if (purchase.status !== 'ordered') {
    return { ok: false, error: 'Only purchases in "ordered" status can be received into stock.' }
  }
  const lines = active().purchaseLines.filter((l) => l.purchaseId === purchaseId)
  if (lines.length === 0) return { ok: false, error: 'No lines on this purchase.' }

  for (const line of lines) {
    const note = `Bon ${purchase.bonNumber}${
      purchase.supplierInvoiceRef ? ` · Inv ${purchase.supplierInvoiceRef}` : ''
    } · Purchase ${purchase.id}`
    const res = receiveStock({
      productId: line.productId,
      storageUnitId: line.storageUnitId,
      quantity: line.quantity,
      status: 'Available',
      reason: 'Purchase',
      note,
      purchaseId: purchase.id,
    })
    if (!res.ok) return res
  }

  const receivedDay = new Date().toISOString().slice(0, 10)
  setState((s) => {
    const idx = s.purchases.findIndex((p) => p.id === purchaseId)
    if (idx >= 0) {
      s.purchases[idx] = {
        ...s.purchases[idx],
        status: 'received',
        receivedAt: receivedDay,
      }
    }
  })

  return { ok: true }
}

export function updatePortalUser(
  userId: string,
  permissions: Record<PageKey, PageCrud>,
): { ok: true } | { ok: false; error: string } {
  if (!active().users.some((u) => u.id === userId)) {
    return { ok: false, error: 'User not found.' }
  }
  setState((s) => {
    s.users = s.users.map((u) => (u.id === userId ? { ...u, permissions: { ...permissions } } : u))
  })
  return { ok: true }
}

export function getPortalUserById(id: string): PortalUser | undefined {
  return active().users.find((u) => u.id === id)
}

export function getProductById(id: string): Product | undefined {
  return active().products.find((p) => p.id === id)
}

export function getMovementsForProduct(productId: string): ProductMovement[] {
  return active().productMovements
    .filter((m) => m.productId === productId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function getStockPositionsForProduct(productId: string): StockPosition[] {
  return active().stockPositions.filter((p) => p.productId === productId && p.quantity > 0)
}

/** Stock positions for one product with joined labels (product stock tab). */
export type ProductStockRow = StockPosition & {
  storageCode: string
  siteName: string
  companyName: string
}

export function buildProductStockRows(productId: string): ProductStockRow[] {
  return getStockPositionsForProduct(productId).map((pos) => {
    const su = active().storageUnits.find((u) => u.id === pos.storageUnitId)
    const site = su ? active().sites.find((s) => s.id === su.siteId) : undefined
    const company = site ? active().companies.find((c) => c.id === site.companyId) : undefined
    const storageCode = su ? `${su.code} (${su.label})` : pos.storageUnitId
    return {
      ...pos,
      storageCode,
      siteName: site?.name ?? '—',
      companyName: company?.name ?? '—',
    }
  })
}

export function getReportsForProduct(productId: string): ProductReportRow[] {
  return active().productReports.filter((r) => r.productId === productId)
}

export function getStorageUnitsForProduct(productId: string) {
  const posIds = new Set(
    active().stockPositions.filter((p) => p.productId === productId).map((p) => p.storageUnitId),
  )
  return active().storageUnits
    .filter((u) => posIds.has(u.id))
    .map((u) => {
      const site = active().sites.find((s) => s.id === u.siteId)
      const company = site ? active().companies.find((c) => c.id === site.companyId) : undefined
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

/** Dev / tests: reset in-memory state to seeds. */
export function resetMockStore() {
  memState = emptyStore()
  liveSnapshot = null
  emit()
}

export { useMockStore } from './useMockStore'
