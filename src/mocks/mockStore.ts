import type {
  Assignment,
  Company,
  CreateAssignmentInput,
  CreatePurchaseInput,
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
  RolePermissionRow,
  RoleRow,
  SerializedAsset,
  Site,
  StockOverviewRow,
  StockPosition,
  StockProductSummaryRow,
  StorageUnit,
  StorageUnitStockRow,
  Supplier,
  TaskAttachmentRow,
  TaskRecord,
  TransferStockInput,
  UserEquipment,
  UserRoleRow,
} from '@/mocks/domain/types'
import { fullPermissionsMap } from '@/auth/pageKeys'
import type { AssetRow, Ticket } from '@/mocks/types'
import assetsSeed from '@/mocks/assets.json'
import ticketsSeed from '@/mocks/tickets.json'

function demoPortalUsers(): PortalUser[] {
  return [
    {
      id: 'mock-user-1',
      displayName: 'Demo Assignee',
      login: 'demo1',
      permissions: fullPermissionsMap(),
      roleIds: [],
    },
    {
      id: 'mock-user-2',
      displayName: 'Demo Reviewer',
      login: 'demo2',
      permissions: fullPermissionsMap(),
      roleIds: [],
    },
  ]
}

export type StoreState = {
  companies: Company[]
  sites: Site[]
  personnel: Personnel[]
  storageUnits: StorageUnit[]
  products: Product[]
  stockPositions: StockPosition[]
  productMovements: ProductMovement[]
  productReports: ProductReportRow[]
  assignments: Assignment[]
  serializedAssets: SerializedAsset[]
  userEquipment: UserEquipment[]
  networkDevices: NetworkDevice[]
  users: PortalUser[]
  suppliers: Supplier[]
  purchases: Purchase[]
  purchaseLines: PurchaseLine[]
  tasks: TaskRecord[]
  taskAttachments: TaskAttachmentRow[]
  roles: RoleRow[]
  rolePermissions: RolePermissionRow[]
  userRoles: UserRoleRow[]
  /** Service desk grid (no DB table; persisted in mock store only). */
  serviceDeskTickets: Ticket[]
  /** IT asset register grid (no DB table; persisted in mock store only). */
  inventoryAssets: AssetRow[]
}

export function formatStorageUnitLabel(u: StorageUnit | undefined): string {
  if (!u) return '—'
  return `${u.code} (${u.label})`
}

/** Primary catalog label: reference, with optional SKU in parentheses. */
export function productCatalogLabel(p: Pick<Product, 'reference' | 'sku'>): string {
  const ref = p.reference?.trim() || '—'
  const sku = p.sku?.trim()
  return sku ? `${ref} (${sku})` : ref
}

function stripZeroStockPositions(rows: StockPosition[]): StockPosition[] {
  return rows.filter((p) => p.quantity > 0)
}

/** Empty shape used for defaults and error fallbacks. */
export function emptyStore(): StoreState {
  return {
    companies: [],
    sites: [],
    personnel: [],
    storageUnits: [],
    products: [],
    stockPositions: [],
    productMovements: [],
    productReports: [],
    assignments: [],
    serializedAssets: [],
    userEquipment: [],
    networkDevices: [],
    users: [],
    suppliers: [],
    purchases: [],
    purchaseLines: [],
    tasks: [],
    taskAttachments: [],
    roles: [],
    rolePermissions: [],
    userRoles: [],
    serviceDeskTickets: [],
    inventoryAssets: [],
  }
}

/** Merge partial API bootstrap into a full `StoreState` (missing keys default to empty arrays). */
export function normalizeBootstrapState(s: Partial<StoreState> | null): StoreState {
  const e = emptyStore()
  if (!s) return e
  return {
    companies: s.companies ?? e.companies,
    sites: s.sites ?? e.sites,
    personnel: s.personnel ?? e.personnel,
    storageUnits: s.storageUnits ?? e.storageUnits,
    products: s.products ?? e.products,
    stockPositions: s.stockPositions ?? e.stockPositions,
    productMovements: s.productMovements ?? e.productMovements,
    productReports: s.productReports ?? e.productReports,
    assignments: s.assignments ?? e.assignments,
    serializedAssets: s.serializedAssets ?? e.serializedAssets,
    userEquipment: s.userEquipment ?? e.userEquipment,
    networkDevices: s.networkDevices ?? e.networkDevices,
    users: s.users ?? e.users,
    suppliers: s.suppliers ?? e.suppliers,
    purchases: s.purchases ?? e.purchases,
    purchaseLines: s.purchaseLines ?? e.purchaseLines,
    tasks: s.tasks ?? e.tasks,
    taskAttachments: s.taskAttachments ?? e.taskAttachments,
    roles: s.roles ?? e.roles,
    rolePermissions: s.rolePermissions ?? e.rolePermissions,
    userRoles: s.userRoles ?? e.userRoles,
    serviceDeskTickets: s.serviceDeskTickets ?? e.serviceDeskTickets,
    inventoryAssets: s.inventoryAssets ?? e.inventoryAssets,
  }
}

function seededOfflineStore(): StoreState {
  return {
    ...emptyStore(),
    users: demoPortalUsers(),
    serviceDeskTickets: [...(ticketsSeed as Ticket[])],
    inventoryAssets: [...(assetsSeed as AssetRow[])],
  }
}

let memState: StoreState = seededOfflineStore()
/** When API mode loads bootstrap JSON, reads use this snapshot until the next refetch. */
let liveSnapshot: StoreState | null = null

export function setLiveSnapshot(s: StoreState | null) {
  liveSnapshot = s ? normalizeBootstrapState(s) : null
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

function resolveAssignmentLabels(personnelId: string, siteId: string): { deliveredTo: string; site: string } {
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
  const prod = active().products.find((p) => p.id === input.productId)
  if (!prod) return { ok: false, error: 'Product not found.' }
  if (prod.trackingMode === 'serialized') {
    return {
      ok: false,
      error: 'Serialized products must be received with identifiers (receive-serialized API or mock extension).',
    }
  }
  const targetSu = active().storageUnits.find((u) => u.id === input.storageUnitId)
  if (!targetSu) {
    return { ok: false, error: 'Storage unit not found.' }
  }
  const isCustody = targetSu.kind === 'custody'
  if (isCustody && !input.purchaseId) {
    return {
      ok: false,
      error:
        'Cannot receive into a custody bin without a purchase. Receive into a warehouse or shelf unit, or receive via a purchase line to this custody bin.',
    }
  }
  if (isCustody && !targetSu.personnelId) {
    return { ok: false, error: 'Custody storage unit has no personnel holder.' }
  }

  const status = isCustody ? 'Issued' : input.status.trim() || 'Available'
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
        refAssignmentId: null,
        refAssetId: null,
        refStockPositionId: positionId,
        refPurchaseId: input.purchaseId ?? null,
        note: note || 'Inbound receive',
        fromStorageLabel: '—',
        toStorageLabel: toLabel,
        personnelId: isCustody && targetSu.personnelId ? targetSu.personnelId : undefined,
      },
      ...s.productMovements,
    ]
  })

  return { ok: true }
}

export type ReceiveSerializedStockInput = {
  productId: string
  storageUnitId: string
  identifiers: string[]
  reason: string
  note: string
  purchaseId?: string | null
}

/** Inbound serialized units (MAC/serial); custody allowed when purchaseId is set (PO receive). */
export function receiveSerializedStock(
  input: ReceiveSerializedStockInput,
): { ok: true } | { ok: false; error: string } {
  const ids = (input.identifiers || []).map((s) => s.trim()).filter((s) => s.length > 0)
  if (ids.length < 1) return { ok: false, error: 'At least one serial number or MAC is required.' }
  const prod = active().products.find((p) => p.id === input.productId)
  if (!prod) return { ok: false, error: 'Product not found.' }
  if (prod.trackingMode !== 'serialized') {
    return { ok: false, error: 'This product is not configured for serialized tracking.' }
  }
  const su = active().storageUnits.find((u) => u.id === input.storageUnitId)
  if (!su) return { ok: false, error: 'Storage unit not found.' }
  const isCustody = su.kind === 'custody'
  if (isCustody && !input.purchaseId) {
    return {
      ok: false,
      error:
        'Cannot receive serialized assets into a custody bin without a purchase. Receive into site storage, or use a purchase line to this custody bin.',
    }
  }
  if (isCustody && !su.personnelId) {
    return { ok: false, error: 'Custody storage unit has no personnel holder.' }
  }
  const siteId = su.siteId
  const toLabel = formatStorageUnitLabel(su)
  const reason = `receive:${input.reason}`
  const note = (input.note || '').trim() || 'Serialized receive'
  const assetStatus = isCustody ? 'Issued' : 'Available'

  for (const identifier of ids) {
    if (active().serializedAssets.some((a) => a.identifier === identifier)) {
      return { ok: false, error: `Duplicate identifier: ${identifier}` }
    }
  }

  setState((s) => {
    const newAssets: SerializedAsset[] = []
    const newMovs: ProductMovement[] = []
    for (const identifier of ids) {
      const assetId = nextId('ast')
      newAssets.push({
        id: assetId,
        productId: input.productId,
        identifier,
        siteId,
        storageUnitId: input.storageUnitId,
        status: assetStatus,
        createdAt: new Date().toISOString(),
      })
      newMovs.push({
        id: nextId('mov'),
        productId: input.productId,
        at: new Date().toISOString(),
        delta: 1,
        reason,
        refAssignmentId: null,
        refAssetId: assetId,
        refStockPositionId: null,
        refPurchaseId: input.purchaseId ?? null,
        note,
        fromStorageLabel: '—',
        toStorageLabel: toLabel,
        personnelId: isCustody && su.personnelId ? su.personnelId : undefined,
      })
    }
    s.serializedAssets = [...newAssets, ...s.serializedAssets]
    s.productMovements = [...newMovs, ...s.productMovements]
  })

  return { ok: true }
}

export type CreateAssignmentResult =
  | { ok: true; assignment: Assignment }
  | { ok: false; error: string }

export function createAssignment(input: CreateAssignmentInput): CreateAssignmentResult {
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

  const serializedIn = (input.serializedAssetId || '').trim() || null

  if (input.source === 'stock') {
    if (serializedIn) {
      if (Math.floor(input.quantity) !== 1) {
        return { ok: false, error: 'Serialized assignment quantity must be 1.' }
      }
    } else {
      if (!input.stockPositionId) return { ok: false, error: 'Select a stock position or serialized asset.' }
      const idx = active().stockPositions.findIndex((x) => x.id === input.stockPositionId)
      if (idx < 0) return { ok: false, error: 'Stock position not found.' }
      if (input.quantity < 1) return { ok: false, error: 'Quantity must be at least 1.' }
      if (input.quantity > active().stockPositions[idx].quantity) {
        return {
          ok: false,
          error: `Insufficient quantity (available: ${active().stockPositions[idx].quantity}).`,
        }
      }
      const fromStorage = active().storageUnits.find((u) => u.id === active().stockPositions[idx].storageUnitId)
      if (fromStorage && fromStorage.siteId !== input.siteId) {
        return {
          ok: false,
          error: 'Stock position must be in a storage unit at the selected assignment site.',
        }
      }
      if (fromStorage?.kind === 'custody') {
        return {
          ok: false,
          error:
            'Stock already in a custody bin cannot be bulk-assigned again. Move quantity back to a warehouse bin first, or use serialized assets for individual units.',
        }
      }
      const pr = active().products.find((p) => p.id === active().stockPositions[idx].productId)
      if (pr?.trackingMode === 'serialized') {
        return {
          ok: false,
          error: 'Use a serialized asset (MAC/serial) for this product, not a bulk stock position.',
        }
      }
    }
  }

  const { deliveredTo, site: siteLabel } = resolveAssignmentLabels(input.personnelId, input.siteId)

  const assignment: Assignment = {
    id: nextId('asn'),
    source: input.source,
    stockPositionId: input.source === 'stock' && !serializedIn ? input.stockPositionId : null,
    serializedAssetId: input.source === 'stock' ? serializedIn : null,
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
    if (input.source === 'stock') {
      const hasCustody = s.storageUnits.some((u) => u.personnelId === input.personnelId && u.kind === 'custody')
      if (!hasCustody) {
        const sid = nextId('su')
        s.storageUnits = [
          {
            id: sid,
            siteId: input.siteId,
            code: `AUTO-CUST-${sid.replace(/^su-/, '').slice(-14)}`,
            label: `Custody · ${per.fullName}`,
            kind: 'custody',
            personnelId: input.personnelId,
          },
          ...s.storageUnits,
        ]
      }
    }
    s.assignments = [assignment, ...s.assignments]
    if (input.source === 'stock' && serializedIn) {
      const custodySu = s.storageUnits.find((u) => u.personnelId === input.personnelId && u.kind === 'custody')
      const asset = s.serializedAssets.find((a) => a.id === serializedIn)
      if (!custodySu || !asset) return
      const fromSu = s.storageUnits.find((u) => u.id === asset.storageUnitId)
      if (fromSu?.kind === 'custody') return
      if (fromSu?.siteId !== input.siteId) return
      const productId = asset.productId
      const fromLabel = formatStorageUnitLabel(fromSu)
      const custodyLabel = formatStorageUnitLabel(custodySu)
      const recipient = s.personnel.find((p) => p.id === input.personnelId)
      s.serializedAssets = s.serializedAssets.map((a) =>
        a.id === serializedIn ? { ...a, storageUnitId: custodySu.id, status: 'Issued' } : a,
      )
      const now = Date.now()
      const outAt = new Date(now).toISOString()
      const inAt = new Date(now + 1).toISOString()
      s.productMovements = [
        {
          id: nextId('mov'),
          productId,
          at: inAt,
          delta: 1,
          reason: 'custody_in',
          refAssignmentId: assignment.id,
          refAssetId: serializedIn,
          refStockPositionId: null,
          note: assignment.description || `Issued to ${recipient?.fullName ?? 'recipient'}`,
          fromStorageLabel: fromLabel,
          toStorageLabel: custodyLabel,
          personnelId: input.personnelId,
        },
        {
          id: nextId('mov'),
          productId,
          at: outAt,
          delta: -1,
          reason: 'assignment_out',
          refAssignmentId: assignment.id,
          refAssetId: serializedIn,
          refStockPositionId: null,
          note: assignment.description || 'Serialized assignment',
          fromStorageLabel: fromLabel,
          toStorageLabel: custodyLabel,
          personnelId: input.personnelId,
        },
        ...s.productMovements,
      ]
    } else if (input.source === 'stock' && input.stockPositionId) {
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
          refAssignmentId: assignment.id,
          refAssetId: null,
          refStockPositionId: custodyPositionId,
          note: assignment.description || `Issued to ${recipient?.fullName ?? 'recipient'}`,
          fromStorageLabel: fromLabel,
          toStorageLabel: custodyLabel,
          personnelId: input.personnelId,
        },
        {
          id: nextId('mov'),
          productId,
          at: outAt,
          delta: -q,
          reason: 'assignment_out',
          refAssignmentId: assignment.id,
          refAssetId: null,
          refStockPositionId: input.stockPositionId,
          note: assignment.description || 'Outbound assignment',
          fromStorageLabel: fromLabel,
          toStorageLabel: custodyLabel,
          personnelId: input.personnelId,
        },
        ...s.productMovements,
      ]
    }
  })

  return { ok: true, assignment }
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
  const pr = active().products.find((p) => p.id === fromPos.productId)
  if (pr?.trackingMode === 'serialized') {
    return { ok: false, error: 'Serialized products are moved as individual assets, not bulk transfer.' }
  }
  const fromSu = active().storageUnits.find((u) => u.id === fromPos.storageUnitId)
  if (!fromSu) return { ok: false, error: 'Source storage unit not found.' }
  if (fromSu.kind === 'custody' || destSu.kind === 'custody') {
    return {
      ok: false,
      error:
        'Bulk transfer cannot start or end in a custody bin. Use Assignments to issue stock to a person’s custody, or receive into a warehouse bin first.',
    }
  }
  if (fromSu.siteId !== destSu.siteId) {
    return { ok: false, error: 'Source and destination storage must be at the same site.' }
  }
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
        refAssignmentId: null,
        refAssetId: null,
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
        refAssignmentId: null,
        refAssetId: null,
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
      productSku: product?.reference || product?.sku || productId,
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
      refAssignmentId: m.refAssignmentId,
      refAssetId: m.refAssetId,
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
        productSku: pr?.reference || pr?.sku || line.productId,
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
    if (su.kind === 'custody') {
      if (!su.personnelId) {
        return { ok: false, error: 'Custody line requires a storage unit with a personnel holder.' }
      }
      const holder = active().personnel.find((p) => p.id === su.personnelId)
      if (!holder || holder.siteId !== input.siteId) {
        return {
          ok: false,
          error: 'Custody bin holder must be personnel assigned to the purchase site.',
        }
      }
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

  if (input.receiveImmediately) {
    const rr = receivePurchase(purchase.id)
    if (!rr.ok) {
      return { ok: false, error: rr.error }
    }
    const updated = active().purchases.find((p) => p.id === purchase.id)
    return { ok: true, purchase: updated ?? purchase }
  }

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
    const pr = active().products.find((p) => p.id === line.productId)
    const isSerialized = pr?.trackingMode === 'serialized'
    if (isSerialized) {
      const q = Math.floor(line.quantity)
      const identifiers = Array.from({ length: q }, (_, i) => `PO-${String(line.id).slice(-8)}-${i + 1}`)
      const res = receiveSerializedStock({
        productId: line.productId,
        storageUnitId: line.storageUnitId,
        identifiers,
        reason: 'Purchase',
        note,
        purchaseId: purchase.id,
      })
      if (!res.ok) return res
    } else {
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

const TASK_ATTACHMENT_MIMES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/plain'])
const MAX_TASK_ATTACHMENT_BYTES = 5 * 1024 * 1024

export function mockCreateTask(input: {
  title: string
  description: string
  assignedToUserId: string
  reviewerUserId: string | null
  dueDate: string | null
  createdByUserId: string
}): { ok: true; taskId: string } | { ok: false; error: string } {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Title is required.' }
  const assignee = input.assignedToUserId.trim()
  if (!assignee) return { ok: false, error: 'Assignee is required.' }
  if (!active().users.some((u) => u.id === assignee)) return { ok: false, error: 'Assignee user not found.' }
  const createdBy = input.createdByUserId.trim()
  if (!createdBy) return { ok: false, error: 'Created-by user is required.' }
  if (!active().users.some((u) => u.id === createdBy)) return { ok: false, error: 'Created-by user not found.' }
  if (input.reviewerUserId) {
    const rv = input.reviewerUserId.trim()
    if (rv && !active().users.some((u) => u.id === rv)) return { ok: false, error: 'Reviewer user not found.' }
  }
  const id = nextId('tsk')
  const now = new Date().toISOString()
  const row: TaskRecord = {
    id,
    title,
    description: (input.description || '').trim(),
    status: 'pending_review',
    createdByUserId: createdBy,
    assignedToUserId: assignee,
    reviewerUserId: input.reviewerUserId?.trim() || null,
    dueDate: input.dueDate,
    reviewedAt: null,
    createdAt: now,
  }
  setState((s) => {
    s.tasks = [row, ...s.tasks]
  })
  return { ok: true, taskId: id }
}

export function mockReviewTask(input: {
  taskId: string
  reviewerUserId: string
  decision: 'approved' | 'changes_requested'
  comment?: string
}): { ok: true } | { ok: false; error: string } {
  const t = active().tasks.find((x) => x.id === input.taskId)
  if (!t) return { ok: false, error: 'Task not found.' }
  if (t.reviewerUserId && t.reviewerUserId !== input.reviewerUserId) {
    return { ok: false, error: 'Only assigned reviewer can review this task.' }
  }
  setState((s) => {
    const idx = s.tasks.findIndex((x) => x.id === input.taskId)
    if (idx < 0) return
    s.tasks[idx] = {
      ...s.tasks[idx],
      status: input.decision,
      reviewerUserId: input.reviewerUserId,
      reviewedAt: new Date().toISOString(),
    }
  })
  return { ok: true }
}

export function mockAddTaskAttachment(input: {
  taskId: string
  uploadedByUserId: string
  filename: string
  mimeType: string
  contentBase64: string
}): { ok: true } | { ok: false; error: string } {
  const mime = input.mimeType.trim().toLowerCase()
  if (!TASK_ATTACHMENT_MIMES.has(mime)) return { ok: false, error: 'Unsupported file type.' }
  let size = 0
  try {
    const bin = atob(input.contentBase64)
    size = bin.length
  } catch {
    return { ok: false, error: 'Invalid attachment encoding.' }
  }
  if (!size) return { ok: false, error: 'Empty attachment.' }
  if (size > MAX_TASK_ATTACHMENT_BYTES) return { ok: false, error: 'Attachment too large (max 5MB).' }
  if (!active().tasks.some((t) => t.id === input.taskId)) return { ok: false, error: 'Task not found.' }
  if (!active().users.some((u) => u.id === input.uploadedByUserId)) return { ok: false, error: 'User not found.' }
  const id = nextId('att')
  setState((s) => {
    s.taskAttachments = [
      {
        id,
        taskId: input.taskId,
        uploadedByUserId: input.uploadedByUserId,
        filename: input.filename,
        mimeType: mime,
        sizeBytes: size,
        createdAt: new Date().toISOString(),
      },
      ...s.taskAttachments,
    ]
  })
  return { ok: true }
}

export function updateCompany(rowId: string, name: string, notes = ''): { ok: true } | { ok: false; error: string } {
  const nm = name.trim()
  if (!nm) return { ok: false, error: 'Name is required.' }
  const exists = active().companies.some((c) => c.id === rowId)
  if (!exists) return { ok: false, error: 'Company not found.' }
  setState((s) => {
    s.companies = s.companies.map((c) => (c.id === rowId ? { ...c, name: nm, notes: notes.trim() } : c))
  })
  return { ok: true }
}

export function updateSite(
  rowId: string,
  input: { companyId: string; name: string; location: string },
): { ok: true } | { ok: false; error: string } {
  if (!active().companies.some((c) => c.id === input.companyId)) return { ok: false, error: 'Company not found.' }
  const nm = input.name.trim()
  if (!nm) return { ok: false, error: 'Site name is required.' }
  const exists = active().sites.some((x) => x.id === rowId)
  if (!exists) return { ok: false, error: 'Site not found.' }
  setState((s) => {
    s.sites = s.sites.map((x) =>
      x.id === rowId ? { ...x, companyId: input.companyId, name: nm, location: (input.location || '').trim() } : x,
    )
  })
  return { ok: true }
}

export function updateSupplier(
  rowId: string,
  input: {
    name: string
    contactName: string
    email: string
    phone: string
    address: string
    notes: string
  },
): { ok: true } | { ok: false; error: string } {
  const nm = input.name.trim()
  if (!nm) return { ok: false, error: 'Supplier name is required.' }
  const exists = active().suppliers.some((x) => x.id === rowId)
  if (!exists) return { ok: false, error: 'Supplier not found.' }
  setState((s) => {
    s.suppliers = s.suppliers.map((x) =>
      x.id === rowId
        ? {
            ...x,
            name: nm,
            contactName: (input.contactName || '').trim(),
            email: (input.email || '').trim(),
            phone: (input.phone || '').trim(),
            address: (input.address || '').trim(),
            notes: (input.notes || '').trim(),
          }
        : x,
    )
  })
  return { ok: true }
}

export function updateNetworkDevice(
  rowId: string,
  input: Partial<Pick<NetworkDevice, 'type' | 'details' | 'brand' | 'model' | 'serialNumber' | 'location'>>,
): { ok: true } | { ok: false; error: string } {
  const exists = active().networkDevices.some((d) => d.id === rowId)
  if (!exists) return { ok: false, error: 'Device not found.' }
  setState((s) => {
    s.networkDevices = s.networkDevices.map((d) =>
      d.id === rowId
        ? {
            ...d,
            type: input.type != null ? String(input.type) : d.type,
            details: input.details != null ? String(input.details) : d.details,
            brand: input.brand != null ? String(input.brand) : d.brand,
            model: input.model != null ? String(input.model) : d.model,
            serialNumber: input.serialNumber != null ? String(input.serialNumber) : d.serialNumber,
            location: input.location != null ? String(input.location) : d.location,
          }
        : d,
    )
  })
  return { ok: true }
}

export function updateServiceDeskTicket(rowId: string, patch: Partial<Ticket>): { ok: true } | { ok: false; error: string } {
  const exists = active().serviceDeskTickets.some((t) => t.id === rowId)
  if (!exists) return { ok: false, error: 'Ticket not found.' }
  setState((s) => {
    s.serviceDeskTickets = s.serviceDeskTickets.map((t) => (t.id === rowId ? { ...t, ...patch } : t))
  })
  return { ok: true }
}

export function updateInventoryAsset(rowId: string, patch: Partial<AssetRow>): { ok: true } | { ok: false; error: string } {
  const exists = active().inventoryAssets.some((a) => a.id === rowId)
  if (!exists) return { ok: false, error: 'Asset not found.' }
  setState((s) => {
    s.inventoryAssets = s.inventoryAssets.map((a) => (a.id === rowId ? { ...a, ...patch } : a))
  })
  return { ok: true }
}

/** Dev / tests: reset in-memory state to seeds. */
export function resetMockStore() {
  memState = seededOfflineStore()
  liveSnapshot = null
  emit()
}

export { useMockStore } from './useMockStore'
