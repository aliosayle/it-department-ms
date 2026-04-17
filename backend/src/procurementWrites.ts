import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { nextId } from './id.js'
import { receiveSerializedInConn, receiveStockInConn } from './inventoryWrites.js'

function fmtLabel(code: string, label: string): string {
  return `${code} (${label})`
}

/** Caller must hold personnel row FOR UPDATE so concurrent first-time creates serialize per person. */
async function ensureCustodyStorageUnit(
  conn: PoolConnection,
  personnelId: string,
  siteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM storage_units WHERE personnel_id = ? AND LOWER(kind) = ? LIMIT 1 FOR UPDATE',
    [personnelId, 'custody'],
  )
  if (existing.length) return { ok: true }

  const [[p]] = await conn.query<RowDataPacket[]>('SELECT full_name AS fullName FROM personnel WHERE id = ?', [
    personnelId,
  ])
  const name = String(p?.fullName ?? '').trim()
  const label = name ? `Custody · ${name}` : 'Custody bin'
  const id = nextId('su')
  const code = `AUTO-CUST-${id.replace(/^su-/, '')}`.slice(0, 255)

  try {
    await conn.query(
      'INSERT INTO storage_units (id, site_id, code, label, kind, personnel_id) VALUES (?,?,?,?,?,?)',
      [id, siteId, code, label, 'custody', personnelId],
    )
  } catch (e) {
    const err = e as { code?: string }
    if (err.code === 'ER_DUP_ENTRY') {
      const [again] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM storage_units WHERE personnel_id = ? AND LOWER(kind) = ? LIMIT 1',
        [personnelId, 'custody'],
      )
      if (again.length) return { ok: true }
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Could not create custody storage unit.' }
  }
  return { ok: true }
}

const MOV_INS = `INSERT INTO inventory_movements (id, product_id, occurred_at, delta, reason, note, ref_assignment_id, ref_asset_id, ref_stock_position_id, purchase_id, personnel_id, correlation_id, from_storage_label, to_storage_label)`

export type CreateAssignmentBody = {
  source: 'stock' | 'external'
  stockPositionId: string | null
  serializedAssetId: string | null
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
  assignedByUserId: string
}

export async function createAssignmentTx(
  pool: Pool,
  input: CreateAssignmentBody,
): Promise<{ ok: true; assignment: Record<string, unknown> } | { ok: false; error: string }> {
  if (!input.companyId || !input.siteId || !input.personnelId) {
    return { ok: false, error: 'Company, site, and recipient employee are required.' }
  }
  if (!input.assignedByUserId) {
    return { ok: false, error: 'Assigned-by user is required.' }
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[per]] = await conn.query<RowDataPacket[]>(
      'SELECT id, company_id AS companyId, site_id AS siteId FROM personnel WHERE id = ? FOR UPDATE',
      [input.personnelId],
    )
    if (!per) {
      await conn.rollback()
      return { ok: false, error: 'Personnel not found.' }
    }
    if (String(per.companyId) !== input.companyId) {
      await conn.rollback()
      return { ok: false, error: 'Personnel does not belong to the selected company.' }
    }
    const [[siteRow]] = await conn.query<RowDataPacket[]>('SELECT id, company_id AS companyId, name FROM sites WHERE id = ?', [
      input.siteId,
    ])
    if (!siteRow || String(siteRow.companyId) !== input.companyId) {
      await conn.rollback()
      return { ok: false, error: 'Site does not belong to the selected company.' }
    }
    if (String(per.siteId) !== input.siteId) {
      await conn.rollback()
      return { ok: false, error: 'Recipient is not assigned to the selected site.' }
    }

    const qtyAll = Math.floor(Number(input.quantity))
    if (input.source === 'external' && qtyAll < 1) {
      await conn.rollback()
      return { ok: false, error: 'Quantity must be at least 1.' }
    }

    const serializedAssetIdIn = (input.serializedAssetId || '').trim() || null

    if (input.source === 'stock') {
      const ensured = await ensureCustodyStorageUnit(conn, input.personnelId, input.siteId)
      if (!ensured.ok) {
        await conn.rollback()
        return ensured
      }

      if (serializedAssetIdIn) {
        const q = Math.floor(Number(input.quantity))
        if (q !== 1) {
          await conn.rollback()
          return { ok: false, error: 'Serialized assignment quantity must be 1.' }
        }
      } else {
        if (!input.stockPositionId) {
          await conn.rollback()
          return { ok: false, error: 'Select a stock position or a serialized asset.' }
        }
        const q = Math.floor(Number(input.quantity))
        if (q < 1) {
          await conn.rollback()
          return { ok: false, error: 'Quantity must be at least 1.' }
        }
        const [[pos]] = await conn.query<RowDataPacket[]>(
          'SELECT id, product_id AS productId, storage_unit_id AS storageUnitId, quantity FROM stock_positions WHERE id = ? FOR UPDATE',
          [input.stockPositionId],
        )
        if (!pos) {
          await conn.rollback()
          return { ok: false, error: 'Stock position not found.' }
        }
        if (q > Number(pos.quantity)) {
          await conn.rollback()
          return { ok: false, error: `Insufficient quantity (available: ${pos.quantity}).` }
        }
        const [[whSite]] = await conn.query<RowDataPacket[]>(
          'SELECT site_id AS siteId, kind FROM storage_units WHERE id = ?',
          [pos.storageUnitId],
        )
        if (!whSite || String(whSite.siteId) !== input.siteId) {
          await conn.rollback()
          return {
            ok: false,
            error: 'Stock position must be in a storage unit at the selected assignment site.',
          }
        }
        if (String(whSite.kind).toLowerCase() === 'custody') {
          await conn.rollback()
          return {
            ok: false,
            error:
              'Bulk stock in a custody bin cannot be reassigned this way. Receive or transfer quantity back to a site warehouse bin first, then assign from there.',
          }
        }
        const [[pr]] = await conn.query<RowDataPacket[]>(
          'SELECT tracking_mode AS trackingMode FROM products WHERE id = ?',
          [pos.productId],
        )
        if (pr && String(pr.trackingMode) === 'serialized') {
          await conn.rollback()
          return {
            ok: false,
            error: 'This product is serialized. Assign using a serialized asset (MAC/serial), not a bulk stock position.',
          }
        }
      }
    }

    const [[pname]] = await conn.query<RowDataPacket[]>('SELECT full_name AS fullName FROM personnel WHERE id = ?', [
      input.personnelId,
    ])
    const deliveredTo = (input.deliveredTo || '').trim() || String(pname?.fullName ?? '')
    const siteLabel = (input.site || '').trim() || String(siteRow.name ?? '')

    const assignmentId = nextId('asn')
    const stockPid = input.source === 'stock' && !serializedAssetIdIn ? input.stockPositionId : null
    const serializedAid = input.source === 'stock' ? serializedAssetIdIn : null
    const qty = Math.floor(Number(input.quantity))
    const itemReceivedDate = input.source === 'stock' ? null : input.itemReceivedDate

    await conn.query(
      `INSERT INTO assignments (id, source, stock_position_id, serialized_asset_id, quantity, item_received_date, item_description, delivered_to, site_label, date_delivered, description, company_id, site_id, personnel_id, assigned_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        assignmentId,
        input.source,
        stockPid,
        serializedAid,
        qty,
        itemReceivedDate,
        input.itemDescription,
        deliveredTo,
        siteLabel,
        input.dateDelivered.slice(0, 10),
        input.description,
        input.companyId,
        input.siteId,
        input.personnelId,
        input.assignedByUserId,
      ],
    )

    if (input.source === 'stock' && serializedAid) {
      const [[custodySu]] = await conn.query<RowDataPacket[]>(
        'SELECT id, code, label FROM storage_units WHERE personnel_id = ? AND kind = ? LIMIT 1 FOR UPDATE',
        [input.personnelId, 'custody'],
      )
      if (!custodySu) {
        await conn.rollback()
        return { ok: false, error: 'Custody storage missing.' }
      }
      const [[asset]] = await conn.query<RowDataPacket[]>(
        `SELECT a.id, a.product_id AS productId, a.identifier, a.storage_unit_id AS storageUnitId,
                su.kind AS storageKind, su.site_id AS storageSiteId, p.tracking_mode AS trackingMode
         FROM serialized_assets a
         JOIN storage_units su ON su.id = a.storage_unit_id
         JOIN products p ON p.id = a.product_id
         WHERE a.id = ? FOR UPDATE`,
        [serializedAid],
      )
      if (!asset) {
        await conn.rollback()
        return { ok: false, error: 'Serialized asset not found.' }
      }
      if (String(asset.trackingMode) !== 'serialized') {
        await conn.rollback()
        return { ok: false, error: 'Product is not configured for serialized tracking.' }
      }
      if (String(asset.storageKind) === 'custody') {
        await conn.rollback()
        return { ok: false, error: 'Asset is already in custody storage.' }
      }
      if (String(asset.storageSiteId) !== input.siteId) {
        await conn.rollback()
        return { ok: false, error: 'Asset must be at the selected site.' }
      }
      const productId = String(asset.productId)
      const [[fromSu]] = await conn.query<RowDataPacket[]>('SELECT code, label FROM storage_units WHERE id = ?', [
        asset.storageUnitId,
      ])
      const fromLabel = fromSu ? fmtLabel(String(fromSu.code), String(fromSu.label)) : '—'
      const custodyLabel = fmtLabel(String(custodySu.code), String(custodySu.label))
      const recipientName = String(pname?.fullName ?? 'recipient')
      const noteIn = input.description || `Issued to ${recipientName}`
      const noteOut = input.description || 'Serialized assignment out'
      await conn.query(
        'UPDATE serialized_assets SET storage_unit_id = ?, status = ? WHERE id = ?',
        [custodySu.id, 'Issued', serializedAid],
      )
      const inMov = nextId('mov')
      const outMov = nextId('mov')
      await conn.query(
        `${MOV_INS} VALUES (?,?,DATE_ADD(NOW(6), INTERVAL 1 MICROSECOND),?,?,?,?,?,?,?,?,?,?,?)`,
        [
          inMov,
          productId,
          1,
          'custody_in',
          noteIn,
          assignmentId,
          serializedAid,
          null,
          null,
          input.personnelId,
          null,
          fromLabel,
          custodyLabel,
        ],
      )
      await conn.query(
        `${MOV_INS} VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?,?)`,
        [
          outMov,
          productId,
          -1,
          'assignment_out',
          noteOut,
          assignmentId,
          serializedAid,
          null,
          null,
          input.personnelId,
          null,
          fromLabel,
          custodyLabel,
        ],
      )
    } else if (input.source === 'stock' && input.stockPositionId) {
      const [[pos]] = await conn.query<RowDataPacket[]>(
        'SELECT id, product_id AS productId, storage_unit_id AS storageUnitId, quantity FROM stock_positions WHERE id = ? FOR UPDATE',
        [input.stockPositionId],
      )
      if (!pos) {
        await conn.rollback()
        return { ok: false, error: 'Stock position not found.' }
      }
      const q = qty
      const [[custodySu]] = await conn.query<RowDataPacket[]>(
        'SELECT id, code, label FROM storage_units WHERE personnel_id = ? AND kind = ? LIMIT 1 FOR UPDATE',
        [input.personnelId, 'custody'],
      )
      if (!custodySu) {
        await conn.rollback()
        return { ok: false, error: 'Custody storage missing.' }
      }
      const productId = String(pos.productId)
      const [[fromSu]] = await conn.query<RowDataPacket[]>('SELECT code, label FROM storage_units WHERE id = ?', [
        pos.storageUnitId,
      ])
      const fromLabel = fromSu ? fmtLabel(String(fromSu.code), String(fromSu.label)) : '—'
      const custodyLabel = fmtLabel(String(custodySu.code), String(custodySu.label))
      const recipientName = String(pname?.fullName ?? 'recipient')

      await conn.query('UPDATE stock_positions SET quantity = quantity - ? WHERE id = ?', [q, input.stockPositionId])
      await conn.query('DELETE FROM stock_positions WHERE id = ? AND quantity <= 0', [input.stockPositionId])

      const [custodyPos] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM stock_positions WHERE product_id = ? AND storage_unit_id = ? FOR UPDATE',
        [productId, custodySu.id],
      )
      let custodyPositionId: string
      if (custodyPos.length) {
        custodyPositionId = String(custodyPos[0].id)
        await conn.query('UPDATE stock_positions SET quantity = quantity + ?, status = ? WHERE id = ?', [
          q,
          'Issued',
          custodyPositionId,
        ])
      } else {
        custodyPositionId = nextId('pos')
        await conn.query(
          'INSERT INTO stock_positions (id, product_id, storage_unit_id, quantity, status) VALUES (?,?,?,?,?)',
          [custodyPositionId, productId, custodySu.id, q, 'Issued'],
        )
      }

      const noteIn = input.description || `Issued to ${recipientName}`
      const noteOut = input.description || 'Outbound assignment'
      const inMov = nextId('mov')
      const outMov = nextId('mov')
      await conn.query(
        `${MOV_INS} VALUES (?,?,DATE_ADD(NOW(6), INTERVAL 1 MICROSECOND),?,?,?,?,?,?,?,?,?,?,?)`,
        [
          inMov,
          productId,
          q,
          'custody_in',
          noteIn,
          assignmentId,
          null,
          custodyPositionId,
          null,
          input.personnelId,
          null,
          fromLabel,
          custodyLabel,
        ],
      )
      await conn.query(
        `${MOV_INS} VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?,?)`,
        [
          outMov,
          productId,
          -q,
          'assignment_out',
          noteOut,
          assignmentId,
          null,
          input.stockPositionId,
          null,
          input.personnelId,
          null,
          fromLabel,
          custodyLabel,
        ],
      )
    }

    await conn.commit()

    const assignment = {
      id: assignmentId,
      source: input.source,
      stockPositionId: stockPid,
      serializedAssetId: serializedAid,
      quantity: qty,
      itemReceivedDate,
      itemDescription: input.itemDescription,
      deliveredTo,
      site: siteLabel,
      dateDelivered: input.dateDelivered.slice(0, 10),
      description: input.description,
      companyId: input.companyId,
      siteId: input.siteId,
      personnelId: input.personnelId,
      assignedByUserId: input.assignedByUserId,
    }
    return { ok: true, assignment }
  } catch (e) {
    await conn.rollback()
    return { ok: false, error: e instanceof Error ? e.message : 'Transaction failed' }
  } finally {
    conn.release()
  }
}

export type CreatePurchaseLine = {
  productId: string
  quantity: number
  unitPrice: number
  storageUnitId: string
}

export type CreatePurchaseBody = {
  bonNumber: string
  supplierInvoiceRef: string
  supplierId: string
  issuedByPersonnelId: string
  siteId: string
  orderedAt: string
  expectedAt: string | null
  notes: string
  lines: CreatePurchaseLine[]
  /** When true, receive all lines into stock/custody in the same transaction (status becomes received). */
  receiveImmediately?: boolean
}

/** Apply purchase receive inside an open transaction (purchase row locked FOR UPDATE). */
async function receivePurchaseIntoStockInConn(
  conn: PoolConnection,
  purchaseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [[purchase]] = await conn.query<RowDataPacket[]>(
    'SELECT id, site_id AS siteId, bon_number AS bonNumber, supplier_invoice_ref AS supplierInvoiceRef, status FROM purchases WHERE id = ? FOR UPDATE',
    [purchaseId],
  )
  if (!purchase) {
    return { ok: false, error: 'Purchase not found.' }
  }
  if (String(purchase.status) === 'received') {
    return { ok: false, error: 'This purchase is already received into stock.' }
  }
  if (String(purchase.status) === 'cancelled') {
    return { ok: false, error: 'Cancelled purchase cannot be received.' }
  }
  if (String(purchase.status) !== 'ordered') {
    return { ok: false, error: 'Only purchases in "ordered" status can be received into stock.' }
  }
  const purchaseSiteId = String(purchase.siteId)
  const [lines] = await conn.query<RowDataPacket[]>(
    'SELECT id, product_id AS productId, quantity, storage_unit_id AS storageUnitId FROM purchase_lines WHERE purchase_id = ?',
    [purchaseId],
  )
  if (!lines.length) {
    return { ok: false, error: 'No lines on this purchase.' }
  }

  for (const line of lines) {
    const [[su]] = await conn.query<RowDataPacket[]>(
      'SELECT site_id AS siteId FROM storage_units WHERE id = ?',
      [line.storageUnitId],
    )
    if (!su || String(su.siteId) !== purchaseSiteId) {
      return {
        ok: false,
        error: 'A purchase line targets storage that does not belong to this purchase\'s site.',
      }
    }
  }

  const bon = String(purchase.bonNumber ?? '')
  const inv = String(purchase.supplierInvoiceRef ?? '').trim()
  for (const line of lines) {
    const note = `Bon ${bon}${inv ? ` · Inv ${inv}` : ''} · Purchase ${purchaseId}`
    const [[pr]] = await conn.query<RowDataPacket[]>(
      'SELECT tracking_mode AS trackingMode FROM products WHERE id = ?',
      [line.productId],
    )
    const isSerialized = pr && String(pr.trackingMode) === 'serialized'
    if (isSerialized) {
      const q = Math.floor(Number(line.quantity))
      const identifiers = Array.from({ length: q }, (_, i) => `PO-${String(line.id)}-${i + 1}`)
      const r = await receiveSerializedInConn(conn, {
        productId: String(line.productId),
        storageUnitId: String(line.storageUnitId),
        identifiers,
        reason: 'Purchase',
        note,
        purchaseId,
      })
      if (!r.ok) return r
    } else {
      const r = await receiveStockInConn(conn, {
        productId: String(line.productId),
        storageUnitId: String(line.storageUnitId),
        quantity: Number(line.quantity),
        status: 'Available',
        reason: 'Purchase',
        note,
        purchaseId,
      })
      if (!r.ok) return r
    }
  }

  await conn.query("UPDATE purchases SET status = 'received', received_at = CURDATE() WHERE id = ?", [purchaseId])
  return { ok: true }
}

export async function createPurchaseTx(
  pool: Pool,
  input: CreatePurchaseBody,
): Promise<{ ok: true; purchase: Record<string, unknown> } | { ok: false; error: string }> {
  const bon = (input.bonNumber || '').trim()
  if (!bon) return { ok: false, error: 'Bon number is required.' }
  if (!input.lines?.length) return { ok: false, error: 'Add at least one line (product, quantity, storage).' }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[site]] = await conn.query<RowDataPacket[]>('SELECT id, company_id AS companyId FROM sites WHERE id = ?', [
      input.siteId,
    ])
    if (!site) {
      await conn.rollback()
      return { ok: false, error: 'Site not found.' }
    }
    const companyId = String(site.companyId)
    const [[dup]] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM purchases WHERE company_id = ? AND LOWER(bon_number) = LOWER(?)',
      [companyId, bon],
    )
    if (dup) {
      await conn.rollback()
      return { ok: false, error: 'A purchase with this bon number already exists.' }
    }
    const [[sup]] = await conn.query<RowDataPacket[]>('SELECT id FROM suppliers WHERE id = ?', [input.supplierId])
    if (!sup) {
      await conn.rollback()
      return { ok: false, error: 'Supplier not found.' }
    }
    const [[issuer]] = await conn.query<RowDataPacket[]>(
      'SELECT id, site_id AS siteId FROM personnel WHERE id = ?',
      [input.issuedByPersonnelId],
    )
    if (!issuer) {
      await conn.rollback()
      return { ok: false, error: 'Issued-by (personnel) not found.' }
    }
    if (String(issuer.siteId) !== input.siteId) {
      await conn.rollback()
      return { ok: false, error: 'Issued-by personnel must belong to the purchase site.' }
    }
    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || Math.floor(line.quantity) < 1) {
        await conn.rollback()
        return { ok: false, error: 'Each line needs quantity at least 1.' }
      }
      if (!Number.isFinite(line.unitPrice) || Number(line.unitPrice) < 0) {
        await conn.rollback()
        return { ok: false, error: 'Each line needs a non-negative unit price.' }
      }
      const [[pr]] = await conn.query<RowDataPacket[]>('SELECT id FROM products WHERE id = ?', [line.productId])
      if (!pr) {
        await conn.rollback()
        return { ok: false, error: 'Product not found on a line.' }
      }
      const [[su]] = await conn.query<RowDataPacket[]>(
        'SELECT id, site_id AS siteId, kind, personnel_id AS personnelId FROM storage_units WHERE id = ?',
        [line.storageUnitId],
      )
      if (!su) {
        await conn.rollback()
        return { ok: false, error: 'Storage unit not found on a line.' }
      }
      if (String(su.siteId) !== input.siteId) {
        await conn.rollback()
        return { ok: false, error: 'Each line storage unit must belong to the purchase site.' }
      }
      if (String(su.kind).toLowerCase() === 'custody') {
        if (!su.personnelId) {
          await conn.rollback()
          return { ok: false, error: 'Custody line requires a storage unit with a personnel holder.' }
        }
        const [[perRow]] = await conn.query<RowDataPacket[]>('SELECT site_id AS siteId FROM personnel WHERE id = ?', [
          su.personnelId,
        ])
        if (!perRow || String(perRow.siteId) !== input.siteId) {
          await conn.rollback()
          return {
            ok: false,
            error: 'Custody bin holder must be personnel assigned to the purchase site.',
          }
        }
      }
    }

    const purchaseId = nextId('pur')
    const orderedAt = input.orderedAt.slice(0, 10)
    const expectedAt = input.expectedAt ? input.expectedAt.slice(0, 10) : null
    await conn.query(
      `INSERT INTO purchases (id, company_id, bon_number, supplier_invoice_ref, supplier_id, issued_by_personnel_id, site_id, ordered_at, expected_at, received_at, status, notes)
       VALUES (?,?,?,?,?,?,?,?,?,NULL,'ordered',?)`,
      [
        purchaseId,
        companyId,
        bon,
        (input.supplierInvoiceRef || '').trim(),
        input.supplierId,
        input.issuedByPersonnelId,
        input.siteId,
        orderedAt,
        expectedAt,
        (input.notes || '').trim(),
      ],
    )
    for (const line of input.lines) {
      const lid = nextId('pl')
      await conn.query(
        'INSERT INTO purchase_lines (id, purchase_id, product_id, quantity, unit_price, storage_unit_id) VALUES (?,?,?,?,?,?)',
        [lid, purchaseId, line.productId, Math.floor(line.quantity), line.unitPrice, line.storageUnitId],
      )
    }

    let receivedAt: string | null = null
    let outStatus = 'ordered'
    if (input.receiveImmediately) {
      const rr = await receivePurchaseIntoStockInConn(conn, purchaseId)
      if (!rr.ok) {
        await conn.rollback()
        return rr
      }
      const [[prx]] = await conn.query<RowDataPacket[]>(
        'SELECT received_at AS receivedAt, status FROM purchases WHERE id = ?',
        [purchaseId],
      )
      outStatus = String(prx?.status ?? 'received')
      if (prx?.receivedAt != null) {
        const d = prx.receivedAt as Date | string
        receivedAt = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)
      }
    }

    await conn.commit()

    const purchase = {
      id: purchaseId,
      bonNumber: bon,
      supplierInvoiceRef: (input.supplierInvoiceRef || '').trim(),
      supplierId: input.supplierId,
      issuedByPersonnelId: input.issuedByPersonnelId,
      siteId: input.siteId,
      orderedAt,
      expectedAt,
      receivedAt,
      status: outStatus,
      notes: (input.notes || '').trim(),
    }
    return { ok: true, purchase }
  } catch (e) {
    await conn.rollback()
    return { ok: false, error: e instanceof Error ? e.message : 'Transaction failed' }
  } finally {
    conn.release()
  }
}

export async function receivePurchaseTx(pool: Pool, purchaseId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const r = await receivePurchaseIntoStockInConn(conn, purchaseId)
    if (!r.ok) {
      await conn.rollback()
      return r
    }
    await conn.commit()
    return { ok: true }
  } catch (e) {
    await conn.rollback()
    return { ok: false, error: e instanceof Error ? e.message : 'Transaction failed' }
  } finally {
    conn.release()
  }
}
