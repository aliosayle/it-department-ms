import type { RowDataPacket } from 'mysql2/promise'
import { pool } from './db.js'
import { type PageCrud, type PageKey, fullPermissions, mergePartial } from './pageKeys.js'

function isoDate(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function isoDateOrNull(v: unknown): string | null {
  if (v == null) return null
  return isoDate(v)
}

function isoDt(v: unknown): string {
  if (v instanceof Date) return v.toISOString()
  return String(v ?? '')
}

export type BootstrapSnapshot = Record<string, unknown>

export async function loadBootstrapSnapshot(): Promise<BootstrapSnapshot> {
  const [companies] = await pool.query<RowDataPacket[]>('SELECT id, name, notes FROM companies ORDER BY name')
  const [sites] = await pool.query<RowDataPacket[]>(
    'SELECT id, company_id AS companyId, name, location FROM sites ORDER BY name',
  )
  const [personnel] = await pool.query<RowDataPacket[]>(
    'SELECT id, full_name AS fullName, email, company_id AS companyId, site_id AS siteId FROM personnel ORDER BY full_name',
  )
  const [storageUnits] = await pool.query<RowDataPacket[]>(
    'SELECT id, site_id AS siteId, code, label, kind, personnel_id AS personnelId FROM storage_units ORDER BY code',
  )
  const [products] = await pool.query<RowDataPacket[]>(
    'SELECT id, sku, name, brand, category, description FROM products ORDER BY sku',
  )
  const [stockPositions] = await pool.query<RowDataPacket[]>(
    'SELECT id, product_id AS productId, storage_unit_id AS storageUnitId, quantity, status FROM stock_positions',
  )
  const [productMovements] = await pool.query<RowDataPacket[]>(
    `SELECT id, product_id AS productId, occurred_at AS occurredAt, delta, reason, note,
            ref_delivery_id AS refDeliveryId, ref_stock_position_id AS refStockPositionId,
            purchase_id AS refPurchaseId, personnel_id AS personnelId, correlation_id AS correlationId,
            from_storage_label AS fromStorageLabel, to_storage_label AS toStorageLabel
     FROM inventory_movements ORDER BY occurred_at DESC`,
  )
  const [productReports] = await pool.query<RowDataPacket[]>(
    'SELECT id, product_id AS productId, period, metric, value FROM product_report_rows',
  )
  const [deliveries] = await pool.query<RowDataPacket[]>(
    `SELECT id, source, stock_position_id AS stockPositionId, quantity,
            item_received_date AS itemReceivedDate, item_description AS itemDescription,
            delivered_to AS deliveredTo, site_label AS site, date_delivered AS dateDelivered,
            description, company_id AS companyId, site_id AS siteId, personnel_id AS personnelId
     FROM deliveries ORDER BY created_at DESC`,
  )
  const [userEquipment] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, department, form_factor AS formFactor, brand, os_installed AS osInstalled, specs,
            ip_addresses AS ipAddresses, mac_address AS macAddress, screen_accessories AS screenAccessories,
            printer_scanner_other AS printerScannerOther FROM user_equipment`,
  )
  const [networkDevices] = await pool.query<RowDataPacket[]>(
    'SELECT id, type, details, brand, model, serial_number AS serialNumber, location FROM network_devices',
  )
  const [suppliers] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, contact_name AS contactName, email, phone, address, notes FROM suppliers ORDER BY name',
  )
  const [purchases] = await pool.query<RowDataPacket[]>(
    `SELECT id, bon_number AS bonNumber, supplier_invoice_ref AS supplierInvoiceRef, supplier_id AS supplierId,
            issued_by_personnel_id AS issuedByPersonnelId, site_id AS siteId,
            ordered_at AS orderedAt, expected_at AS expectedAt, received_at AS receivedAt, status, notes
     FROM purchases ORDER BY ordered_at DESC`,
  )
  const [purchaseLines] = await pool.query<RowDataPacket[]>(
    'SELECT id, purchase_id AS purchaseId, product_id AS productId, quantity, unit_price AS unitPrice, storage_unit_id AS storageUnitId FROM purchase_lines',
  )
  const [usersRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, display_name AS displayName, login, personnel_id AS personnelId FROM portal_users ORDER BY login',
  )
  const [permRows] = await pool.query<RowDataPacket[]>(
    'SELECT user_id AS userId, page_key AS pageKey, can_view AS cv, can_edit AS ce, can_delete AS cd, can_create AS cc FROM user_page_permissions',
  )

  const permsByUser = new Map<string, Partial<Record<PageKey, PageCrud>>>()
  for (const r of permRows) {
    const uid = String(r.userId)
    const pk = String(r.pageKey) as PageKey
    if (!permsByUser.has(uid)) permsByUser.set(uid, {})
    permsByUser.get(uid)![pk] = {
      view: Boolean(r.cv),
      edit: Boolean(r.ce),
      delete: Boolean(r.cd),
      create: Boolean(r.cc),
    }
  }

  const users = usersRows.map((u) => {
    const partial = permsByUser.get(String(u.id))
    const permissions =
      !partial || Object.keys(partial).length === 0 ? fullPermissions() : mergePartial(partial)
    return {
      id: u.id,
      displayName: u.displayName,
      login: u.login,
      permissions,
    }
  })

  const mapDeliveries = (rows: RowDataPacket[]) =>
    rows.map((r) => ({
      ...r,
      itemReceivedDate: isoDateOrNull(r.itemReceivedDate),
      dateDelivered: isoDate(r.dateDelivered),
    }))

  const mapPurchases = (rows: RowDataPacket[]) =>
    rows.map((r) => ({
      ...r,
      orderedAt: isoDate(r.orderedAt),
      expectedAt: r.expectedAt == null ? null : isoDate(r.expectedAt),
      receivedAt: r.receivedAt == null ? null : isoDate(r.receivedAt),
    }))

  return {
    companies,
    sites,
    personnel,
    storageUnits,
    products,
    stockPositions,
    productMovements: productMovements.map((m) => {
      const { occurredAt, ...rest } = m as RowDataPacket & { occurredAt: unknown }
      return { ...rest, at: isoDt(occurredAt) }
    }),
    productReports,
    deliveries: mapDeliveries(deliveries as RowDataPacket[]),
    userEquipment,
    networkDevices,
    users,
    suppliers,
    purchases: mapPurchases(purchases as RowDataPacket[]),
    purchaseLines,
  }
}

export async function getUserPermissions(userId: string): Promise<Record<PageKey, PageCrud>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT page_key AS pageKey, can_view AS cv, can_edit AS ce, can_delete AS cd, can_create AS cc FROM user_page_permissions WHERE user_id = :uid',
    { uid: userId },
  )
  const partial: Partial<Record<PageKey, PageCrud>> = {}
  for (const r of rows) {
    const pk = String(r.pageKey) as PageKey
    partial[pk] = {
      view: Boolean(r.cv),
      edit: Boolean(r.ce),
      delete: Boolean(r.cd),
      create: Boolean(r.cc),
    }
  }
  return Object.keys(partial).length === 0 ? fullPermissions() : mergePartial(partial)
}

export function assertPermission(
  perms: Record<PageKey, PageCrud>,
  page: PageKey,
  action: keyof PageCrud,
): void {
  if (!perms[page]?.[action]) {
    const err = new Error('Forbidden')
    ;(err as Error & { statusCode: number }).statusCode = 403
    throw err
  }
}
