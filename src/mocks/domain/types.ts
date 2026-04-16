/** Inbound receive — reason label. */
export type ReceiveStockReason = 'Purchase' | 'Return' | 'Transfer' | 'Adjustment' | 'Other'

export type Company = {
  id: string
  name: string
  notes?: string
}

export type Site = {
  id: string
  companyId: string
  name: string
  location: string
}

export type Personnel = {
  id: string
  fullName: string
  email: string
  companyId: string
  siteId: string
}

export type StorageUnit = {
  id: string
  siteId: string
  code: string
  label: string
  kind: string
  /** When set, this bin represents stock issued to that person (custody). */
  personnelId?: string
}

export type ProductTrackingMode = 'quantity' | 'serialized'

export type Product = {
  id: string
  /** Stable internal / catalog reference (required). */
  reference: string
  /** Optional vendor SKU. */
  sku: string | null
  name: string
  brand: string
  category: string
  description: string
  trackingMode: ProductTrackingMode
}

export type SerializedAsset = {
  id: string
  productId: string
  identifier: string
  siteId: string
  storageUnitId: string
  status: string
  createdAt?: string
}

export type StockPosition = {
  id: string
  productId: string
  storageUnitId: string
  quantity: number
  status: string
}

export type ProductMovement = {
  id: string
  productId: string
  at: string
  delta: number
  reason: string
  refAssignmentId: string | null
  refAssetId: string | null
  refStockPositionId: string | null
  refPurchaseId?: string | null
  note: string
  fromStorageLabel?: string
  toStorageLabel?: string
  personnelId?: string
  /** Pairs transfer_out / transfer_in legs. */
  correlationId?: string
}

/** Mock analytics rows for product reports page. */
export type ProductReportRow = {
  id: string
  productId: string
  period: string
  metric: string
  value: number
}

export type ReceiveStockInput = {
  productId: string
  storageUnitId: string
  quantity: number
  status: string
  reason: ReceiveStockReason | string
  note: string
  /** When set, movement rows link back to this purchase (bon / GRN). */
  purchaseId?: string | null
}

export type AssignmentSource = 'stock' | 'external'

export type Assignment = {
  id: string
  source: AssignmentSource
  stockPositionId: string | null
  serializedAssetId: string | null
  quantity: number
  itemReceivedDate: string | null
  itemDescription: string
  /** Denormalized for grids */
  deliveredTo: string
  site: string
  dateDelivered: string
  description: string
  companyId: string
  siteId: string
  personnelId: string
}

export type CreateAssignmentInput = {
  source: AssignmentSource
  stockPositionId: string | null
  serializedAssetId?: string | null
  quantity: number
  itemReceivedDate: string | null
  itemDescription: string
  deliveredTo: string
  site: string
  dateDelivered: string
  description: string
  companyId: string
  siteId: string
  personnelId: string
}

export type EquipmentFormFactor = 'Desktop' | 'Laptop' | 'All In One'

export type UserEquipment = {
  id: string
  name: string
  department: string
  formFactor: EquipmentFormFactor | string
  brand: string
  osInstalled: string
  specs: string
  ipAddresses: string
  macAddress: string
  screenAccessories: string
  printerScannerOther: string
}

export type NetworkDevice = {
  id: string
  type: string
  details: string
  brand: string
  model: string
  serialNumber: string
  location: string
}

export type Supplier = {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  notes: string
}

export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export type Purchase = {
  id: string
  /** Bon de livraison / delivery note number. */
  bonNumber: string
  /** Supplier invoice or quote reference (optional). */
  supplierInvoiceRef: string
  supplierId: string
  /** Person who raised or validated the purchase internally. */
  issuedByPersonnelId: string
  /** Site context (e.g. where goods are received). */
  siteId: string
  orderedAt: string
  expectedAt: string | null
  receivedAt: string | null
  status: PurchaseStatus
  notes: string
}

export type PurchaseLine = {
  id: string
  purchaseId: string
  productId: string
  quantity: number
  unitPrice: number
  storageUnitId: string
}

export type CreatePurchaseLineInput = {
  productId: string
  quantity: number
  unitPrice: number
  storageUnitId: string
}

export type CreatePurchaseInput = {
  bonNumber: string
  supplierInvoiceRef: string
  supplierId: string
  issuedByPersonnelId: string
  siteId: string
  orderedAt: string
  expectedAt: string | null
  notes: string
  lines: CreatePurchaseLineInput[]
}

export type PurchaseListRow = Purchase & {
  supplierName: string
  issuedByName: string
  siteName: string
  companyName: string
  lineCount: number
}

export type PurchaseLineDetailRow = {
  id: string
  productId: string
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  storageCode: string
  siteName: string
}

/** Flat row for stock overview grid. */
export type StockOverviewRow = {
  id: string
  /** Product this stock position belongs to (for navigation / actions). */
  productId: string
  productSku: string
  productName: string
  storageCode: string
  siteName: string
  companyName: string
  quantity: number
  status: string
}

/** One row per product — total qty across all storages (and custody). */
export type StockProductSummaryRow = {
  id: string
  productId: string
  productSku: string
  productName: string
  totalQuantity: number
}

/** Row for a single storage unit’s stock grid. */
export type StorageUnitStockRow = StockOverviewRow

export type CrudAction = 'view' | 'edit' | 'delete' | 'create'

export type PageCrud = {
  view: boolean
  edit: boolean
  delete: boolean
  create: boolean
}

export type PageKey =
  | 'dashboard'
  | 'serviceDesk'
  | 'assets'
  | 'stock'
  | 'stockReceive'
  | 'stockTransfer'
  | 'storageUnits'
  | 'products'
  | 'assignment'
  | 'companies'
  | 'sites'
  | 'personnel'
  | 'equipment'
  | 'network'
  | 'users'
  | 'suppliers'
  | 'purchases'

export type PortalUser = {
  id: string
  displayName: string
  login: string
  roleIds?: string[]
  /** Normalized in the store: every `PageKey` is present. */
  permissions: Record<PageKey, PageCrud>
}

export type TransferStockInput = {
  fromStockPositionId: string
  toStorageUnitId: string
  quantity: number
  note: string
}

/** Chronological statement row (ascending by time). */
export type MovementStatementRow = {
  id: string
  at: string
  fromLabel: string
  toLabel: string
  delta: number
  reason: string
  note: string
  refAssignmentId: string | null
  refAssetId: string | null
  refStockPositionId: string | null
  refPurchaseId: string | null
  correlationId?: string
}
