import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { nextId } from './id.js'

export type ReceiveInput = {
  productId: string
  storageUnitId: string
  quantity: number
  status: string
  reason: string
  note: string
  purchaseId?: string | null
}

function fmtLabel(code: string, label: string): string {
  return `${code} (${label})`
}

/** Receive stock using an existing connection (caller manages transaction). */
export async function receiveStockInConn(
  conn: PoolConnection,
  input: ReceiveInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const q = Math.floor(Number(input.quantity))
  if (q < 1) return { ok: false, error: 'Quantity must be at least 1.' }
  try {
    const [[pr]] = await conn.query<RowDataPacket[]>('SELECT id FROM products WHERE id = ?', [input.productId])
    if (!pr) return { ok: false, error: 'Product not found.' }
    const [[su]] = await conn.query<RowDataPacket[]>('SELECT id, code, label FROM storage_units WHERE id = ?', [
      input.storageUnitId,
    ])
    if (!su) return { ok: false, error: 'Storage unit not found.' }
    const toLabel = fmtLabel(String(su.code), String(su.label))
    const status = (input.status || 'Available').trim()
    const note = (input.note || '').trim()

    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT id, quantity FROM stock_positions WHERE product_id = ? AND storage_unit_id = ? FOR UPDATE',
      [input.productId, input.storageUnitId],
    )
    let positionId: string
    if (existing.length) {
      positionId = String(existing[0].id)
      await conn.query('UPDATE stock_positions SET quantity = quantity + ?, status = ? WHERE id = ?', [
        q,
        status,
        positionId,
      ])
    } else {
      positionId = nextId('pos')
      await conn.query(
        'INSERT INTO stock_positions (id, product_id, storage_unit_id, quantity, status) VALUES (?,?,?,?,?)',
        [positionId, input.productId, input.storageUnitId, q, status],
      )
    }
    const movId = nextId('mov')
    await conn.query(
      `INSERT INTO inventory_movements (id, product_id, occurred_at, delta, reason, note, ref_delivery_id, ref_stock_position_id, purchase_id, personnel_id, correlation_id, from_storage_label, to_storage_label)
       VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?)`,
      [
        movId,
        input.productId,
        q,
        `receive:${input.reason}`,
        note || 'Inbound receive',
        null,
        positionId,
        input.purchaseId ?? null,
        null,
        null,
        '—',
        toLabel,
      ],
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Receive failed' }
  }
}

export async function receiveStockTx(pool: Pool, input: ReceiveInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const r = await receiveStockInConn(conn, input)
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

export type TransferInput = {
  fromStockPositionId: string
  toStorageUnitId: string
  quantity: number
  note: string
}

export async function transferStockTx(pool: Pool, input: TransferInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const q = Math.floor(Number(input.quantity))
  if (q < 1) return { ok: false, error: 'Quantity must be at least 1.' }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[fromPos]] = await conn.query<RowDataPacket[]>(
      'SELECT id, product_id AS productId, storage_unit_id AS storageUnitId, quantity, status FROM stock_positions WHERE id = ? FOR UPDATE',
      [input.fromStockPositionId],
    )
    if (!fromPos) {
      await conn.rollback()
      return { ok: false, error: 'Source stock position not found.' }
    }
    if (q > Number(fromPos.quantity)) {
      await conn.rollback()
      return { ok: false, error: `Insufficient quantity (available: ${fromPos.quantity}).` }
    }
    if (String(fromPos.storageUnitId) === input.toStorageUnitId) {
      await conn.rollback()
      return { ok: false, error: 'Source and destination storage are the same.' }
    }
    const [[destSu]] = await conn.query<RowDataPacket[]>(
      'SELECT id, code, label, site_id AS siteId FROM storage_units WHERE id = ?',
      [input.toStorageUnitId],
    )
    if (!destSu) {
      await conn.rollback()
      return { ok: false, error: 'Destination storage unit not found.' }
    }
    const [[fromSu]] = await conn.query<RowDataPacket[]>(
      'SELECT code, label, site_id AS siteId FROM storage_units WHERE id = ?',
      [fromPos.storageUnitId],
    )
    if (!fromSu) {
      await conn.rollback()
      return { ok: false, error: 'Source storage unit not found.' }
    }
    if (String(fromSu.siteId) !== String(destSu.siteId)) {
      await conn.rollback()
      return { ok: false, error: 'Source and destination storage must be at the same site.' }
    }
    const fromLabel = fromSu ? fmtLabel(String(fromSu.code), String(fromSu.label)) : '—'
    const toLabel = fmtLabel(String(destSu.code), String(destSu.label))
    const productId = String(fromPos.productId)
    const correlationId = nextId('xfer')
    const note = (input.note || '').trim() || 'Transfer between storages'

    await conn.query('UPDATE stock_positions SET quantity = quantity - ? WHERE id = ?', [q, input.fromStockPositionId])
    await conn.query('DELETE FROM stock_positions WHERE id = ? AND quantity <= 0', [input.fromStockPositionId])

    const [destExisting] = await conn.query<RowDataPacket[]>(
      'SELECT id, quantity FROM stock_positions WHERE product_id = ? AND storage_unit_id = ? FOR UPDATE',
      [productId, input.toStorageUnitId],
    )
    let destPositionId: string
    if (destExisting.length) {
      destPositionId = String(destExisting[0].id)
      await conn.query('UPDATE stock_positions SET quantity = quantity + ? WHERE id = ?', [q, destPositionId])
    } else {
      destPositionId = nextId('pos')
      await conn.query(
        'INSERT INTO stock_positions (id, product_id, storage_unit_id, quantity, status) VALUES (?,?,?,?,?)',
        [destPositionId, productId, input.toStorageUnitId, q, String(fromPos.status)],
      )
    }

    const outId = nextId('mov')
    const inId = nextId('mov')
    await conn.query(
      `INSERT INTO inventory_movements (id, product_id, occurred_at, delta, reason, note, ref_delivery_id, ref_stock_position_id, purchase_id, personnel_id, correlation_id, from_storage_label, to_storage_label)
       VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?)`,
      [
        outId,
        productId,
        -q,
        'transfer_out',
        note,
        null,
        input.fromStockPositionId,
        null,
        null,
        correlationId,
        fromLabel,
        toLabel,
      ],
    )
    await conn.query(
      `INSERT INTO inventory_movements (id, product_id, occurred_at, delta, reason, note, ref_delivery_id, ref_stock_position_id, purchase_id, personnel_id, correlation_id, from_storage_label, to_storage_label)
       VALUES (?,?,DATE_ADD(NOW(6), INTERVAL 1 MICROSECOND),?,?,?,?,?,?,?,?,?,?)`,
      [inId, productId, q, 'transfer_in', note, null, destPositionId, null, null, correlationId, fromLabel, toLabel],
    )

    await conn.commit()
    return { ok: true }
  } catch (e) {
    await conn.rollback()
    return { ok: false, error: e instanceof Error ? e.message : 'Transaction failed' }
  } finally {
    conn.release()
  }
}
