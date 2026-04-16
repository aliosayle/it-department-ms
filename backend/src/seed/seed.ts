import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcrypt'
import mysql, { type RowDataPacket } from 'mysql2/promise'
import { config } from '../config.js'
import type { PageCrud, PageKey } from '../pageKeys.js'
import { ALL_PAGE_KEYS } from '../pageKeys.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..', '..', '..')
const mocksDir = path.join(projectRoot, 'src', 'mocks')

function readJson<T>(name: string): T {
  const p = path.join(mocksDir, name)
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

const TABLES = [
  'user_page_permissions',
  'audit_log',
  'inventory_movements',
  'stock_positions',
  'purchase_lines',
  'purchases',
  'deliveries',
  'product_report_rows',
  'portal_users',
  'user_equipment',
  'network_devices',
  'storage_units',
  'personnel',
  'products',
  'suppliers',
  'sites',
  'companies',
] as const

async function main() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'changeme'
  const hash = await bcrypt.hash(defaultPassword, 10)

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  })

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const t of TABLES) {
      await conn.query(`TRUNCATE TABLE \`${t}\``)
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')

    const companies = readJson<Record<string, unknown>[]>('companies.seed.json')
    for (const c of companies) {
      await conn.query('INSERT INTO companies (id, name, notes) VALUES (?,?,?)', [
        c.id,
        String(c.name ?? ''),
        String(c.notes ?? ''),
      ])
    }

    const sites = readJson<Record<string, unknown>[]>('sites.seed.json')
    for (const s of sites) {
      await conn.query('INSERT INTO sites (id, company_id, name, location) VALUES (?,?,?,?)', [
        s.id,
        s.companyId,
        String(s.name ?? ''),
        String(s.location ?? ''),
      ])
    }

    const personnel = readJson<Record<string, unknown>[]>('personnel.seed.json')
    for (const p of personnel) {
      await conn.query(
        'INSERT INTO personnel (id, full_name, email, company_id, site_id) VALUES (?,?,?,?,?)',
        [p.id, String(p.fullName ?? ''), String(p.email ?? ''), p.companyId, p.siteId],
      )
    }

    const users = readJson<
      {
        id: string
        displayName: string
        login: string
        personnelId?: string
        permissions?: Partial<Record<PageKey, PageCrud>>
      }[]
    >('users.seed.json')

    for (const u of users) {
      await conn.query(
        'INSERT INTO portal_users (id, display_name, login, password_hash, subject, personnel_id) VALUES (?,?,?,?,NULL,?)',
        [u.id, u.displayName, u.login, hash, u.personnelId ?? null],
      )
      if (u.permissions) {
        for (const key of ALL_PAGE_KEYS) {
          const crud = u.permissions[key]
          if (!crud) continue
          await conn.query(
            'INSERT INTO user_page_permissions (user_id, page_key, can_view, can_edit, can_delete, can_create) VALUES (?,?,?,?,?,?)',
            [u.id, key, crud.view ? 1 : 0, crud.edit ? 1 : 0, crud.delete ? 1 : 0, crud.create ? 1 : 0],
          )
        }
      }
    }

    const suppliers = readJson<Record<string, unknown>[]>('suppliers.seed.json')
    for (const s of suppliers) {
      await conn.query(
        'INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes) VALUES (?,?,?,?,?,?,?)',
        [
          s.id,
          String(s.name ?? ''),
          String(s.contactName ?? ''),
          String(s.email ?? ''),
          String(s.phone ?? ''),
          String(s.address ?? ''),
          String(s.notes ?? ''),
        ],
      )
    }

    const products = readJson<Record<string, unknown>[]>('products.seed.json')
    for (const p of products) {
      await conn.query(
        'INSERT INTO products (id, sku, name, brand, category, description) VALUES (?,?,?,?,?,?)',
        [
          p.id,
          String(p.sku ?? ''),
          String(p.name ?? ''),
          String(p.brand ?? ''),
          String(p.category ?? ''),
          String(p.description ?? ''),
        ],
      )
    }

    const storageUnits = readJson<Record<string, unknown>[]>('storageUnits.seed.json')
    for (const u of storageUnits) {
      await conn.query(
        'INSERT INTO storage_units (id, site_id, code, label, kind, personnel_id) VALUES (?,?,?,?,?,?)',
        [u.id, u.siteId, String(u.code ?? ''), String(u.label ?? ''), String(u.kind ?? ''), u.personnelId ?? null],
      )
    }

    const stockPositions = readJson<Record<string, unknown>[]>('stockPositions.seed.json')
    for (const p of stockPositions) {
      await conn.query(
        'INSERT INTO stock_positions (id, product_id, storage_unit_id, quantity, status) VALUES (?,?,?,?,?)',
        [p.id, p.productId, p.storageUnitId, Number(p.quantity), String(p.status ?? 'Available')],
      )
    }

    const movements = readJson<Record<string, unknown>[]>('productMovements.seed.json')
    for (const m of movements) {
      const at = m.at ? new Date(String(m.at)) : new Date()
      await conn.query(
        `INSERT INTO inventory_movements (id, product_id, occurred_at, delta, reason, note, ref_delivery_id, ref_stock_position_id, purchase_id, personnel_id, correlation_id, from_storage_label, to_storage_label)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          m.id,
          m.productId,
          at,
          Number(m.delta),
          String(m.reason ?? ''),
          String(m.note ?? ''),
          m.refDeliveryId ?? null,
          m.refStockPositionId ?? null,
          (m as { refPurchaseId?: string }).refPurchaseId ?? null,
          (m as { personnelId?: string }).personnelId ?? null,
          (m as { correlationId?: string }).correlationId ?? null,
          m.fromStorageLabel ?? null,
          m.toStorageLabel ?? null,
        ],
      )
    }

    const [siteCountRows] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM sites')
    if (Number(siteCountRows[0]?.cnt) === 0) throw new Error('No sites seeded')

    const purchases = readJson<Record<string, unknown>[]>('purchases.seed.json')
    for (const p of purchases) {
      const [siteRows] = await conn.query<RowDataPacket[]>('SELECT company_id AS companyId FROM sites WHERE id = ?', [
        p.siteId,
      ])
      const site = siteRows[0]
      if (!site) throw new Error(`Missing site ${String(p.siteId)} for purchase ${String(p.id)}`)
      await conn.query(
        `INSERT INTO purchases (id, company_id, bon_number, supplier_invoice_ref, supplier_id, issued_by_personnel_id, site_id, ordered_at, expected_at, received_at, status, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          p.id,
          String(site.companyId),
          String(p.bonNumber ?? ''),
          String(p.supplierInvoiceRef ?? ''),
          p.supplierId,
          p.issuedByPersonnelId,
          p.siteId,
          String(p.orderedAt ?? '').slice(0, 10),
          p.expectedAt ? String(p.expectedAt).slice(0, 10) : null,
          p.receivedAt ? String(p.receivedAt).slice(0, 10) : null,
          String(p.status ?? 'ordered'),
          String(p.notes ?? ''),
        ],
      )
    }

    const purchaseLines = readJson<Record<string, unknown>[]>('purchaseLines.seed.json')
    for (const l of purchaseLines) {
      await conn.query(
        'INSERT INTO purchase_lines (id, purchase_id, product_id, quantity, unit_price, storage_unit_id) VALUES (?,?,?,?,?,?)',
        [l.id, l.purchaseId, l.productId, Number(l.quantity), Number(l.unitPrice), l.storageUnitId],
      )
    }

    const deliveries = readJson<Record<string, unknown>[]>('deliveries.seed.json')
    for (const d of deliveries) {
      await conn.query(
        `INSERT INTO deliveries (id, source, stock_position_id, quantity, item_received_date, item_description, delivered_to, site_label, date_delivered, description, company_id, site_id, personnel_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          d.id,
          d.source,
          d.stockPositionId ?? null,
          Number(d.quantity),
          d.itemReceivedDate ? String(d.itemReceivedDate).slice(0, 10) : null,
          String(d.itemDescription ?? ''),
          String(d.deliveredTo ?? ''),
          String(d.site ?? ''),
          String(d.dateDelivered ?? '').slice(0, 10),
          String(d.description ?? ''),
          d.companyId,
          d.siteId,
          d.personnelId,
        ],
      )
    }

    const userEquipment = readJson<Record<string, unknown>[]>('userEquipment.seed.json')
    for (const e of userEquipment) {
      await conn.query(
        `INSERT INTO user_equipment (id, name, department, form_factor, brand, os_installed, specs, ip_addresses, mac_address, screen_accessories, printer_scanner_other)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          e.id,
          String(e.name ?? ''),
          String(e.department ?? ''),
          String(e.formFactor ?? ''),
          String(e.brand ?? ''),
          String(e.osInstalled ?? ''),
          String(e.specs ?? ''),
          String(e.ipAddresses ?? ''),
          String(e.macAddress ?? ''),
          String(e.screenAccessories ?? ''),
          String(e.printerScannerOther ?? ''),
        ],
      )
    }

    const networkDevices = readJson<Record<string, unknown>[]>('networkDevices.seed.json')
    for (const n of networkDevices) {
      await conn.query(
        'INSERT INTO network_devices (id, type, details, brand, model, serial_number, location) VALUES (?,?,?,?,?,?,?)',
        [
          n.id,
          String(n.type ?? ''),
          String(n.details ?? ''),
          String(n.brand ?? ''),
          String(n.model ?? ''),
          String(n.serialNumber ?? ''),
          String(n.location ?? ''),
        ],
      )
    }

    const productReports = readJson<Record<string, unknown>[]>('productReports.seed.json')
    for (const r of productReports) {
      await conn.query(
        'INSERT INTO product_report_rows (id, product_id, period, metric, value) VALUES (?,?,?,?,?)',
        [r.id, r.productId, String(r.period ?? ''), String(r.metric ?? ''), Number(r.value)],
      )
    }

    console.log('Seed complete. Default portal password for all users:', defaultPassword)
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
