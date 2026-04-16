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

export type ReceiveSerializedInput = {
  productId: string
  storageUnitId: string
  identifiers: string[]
  reason: string
  note: string
  purchaseId?: string | null
}

function fmtLabel(code: string, label: string): string {
  return `${code} (${label})`
}

function normalizeAssetIdentifier(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

const MOV_COLS = `INSERT INTO inventory_movements (id, product_id, occurred_at, delta, reason, note, ref_assignment_id, ref_asset_id, ref_stock_position_id, purchase_id, personnel_id, correlation_id, from_storage_label, to_storage_label)`

/** Receive stock using an existing connection (caller manages transaction). */
export async function receiveStockInConn(
  conn: PoolConnection,
  input: ReceiveInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const q = Math.floor(Number(input.quantity))
  if (q < 1) return { ok: false, error: 'Quantity must be at least 1.' }
  try {
    const [[pr]] = await conn.query<RowDataPacket[]>(
      'SELECT id, tracking_mode AS trackingMode FROM products WHERE id = ?',
      [input.productId],
    )
    if (!pr) return { ok: false, error: 'Product not found.' }
    if (String(pr.trackingMode) === 'serialized') {
      return {
        ok: false,
        error:
          'This product is tracked by serial/MAC. Use POST /api/v1/inventory/receive-serialized with identifiers instead of quantity receive.',
      }
    }
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
      `${MOV_COLS} VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?,?)`,
      [
        movId,
        input.productId,
        q,
        `receive:${input.reason}`,
        note || 'Inbound receive',
        null,
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

/** Create one serialized_assets row per identifier (same connection / transaction). */
export async function receiveSerializedInConn(
  conn: PoolConnection,
  input: ReceiveSerializedInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = (input.identifiers || []).map(normalizeAssetIdentifier).filter((s) => s.length > 0)
  if (ids.length < 1) return { ok: false, error: 'At least one serial number or MAC is required.' }
  try {
    const [[pr]] = await conn.query<RowDataPacket[]>(
      'SELECT id, tracking_mode AS trackingMode FROM products WHERE id = ?',
      [input.productId],
    )
    if (!pr) return { ok: false, error: 'Product not found.' }
    if (String(pr.trackingMode) !== 'serialized') {
      return { ok: false, error: 'This product is not configured for serialized tracking.' }
    }
    const [[su]] = await conn.query<RowDataPacket[]>(
      'SELECT id, code, label, site_id AS siteId FROM storage_units WHERE id = ?',
      [input.storageUnitId],
    )
    if (!su) return { ok: false, error: 'Storage unit not found.' }
    const siteId = String(su.siteId)
    const toLabel = fmtLabel(String(su.code), String(su.label))
    const note = (input.note || '').trim() || 'Serialized receive'
    const reason = `receive:${input.reason}`

    for (const identifier of ids) {
      const [[dup]] = await conn.query<RowDataPacket[]>('SELECT id FROM serialized_assets WHERE identifier = ?', [
        identifier,
      ])
      if (dup) {
        return { ok: false, error: `Duplicate identifier: ${identifier}` }
      }
      const assetId = nextId('ast')
      await conn.query(
        'INSERT INTO serialized_assets (id, product_id, identifier, site_id, storage_unit_id, status) VALUES (?,?,?,?,?,?)',
        [assetId, input.productId, identifier, siteId, input.storageUnitId, 'Available'],
      )
      const movId = nextId('mov')
      await conn.query(
        `${MOV_COLS} VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?,?)`,
        [
          movId,
          input.productId,
          1,
          reason,
          note,
          null,
          assetId,
          null,
          input.purchaseId ?? null,
          null,
          null,
          '—',
          toLabel,
        ],
      )
    }
    return { ok: true }
  } catch (e) {
    const err = e as { code?: string }
    if (err?.code === 'ER_DUP_ENTRY') {
      return { ok: false, error: 'Duplicate identifier (MAC/serial already exists).' }
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Serialized receive failed' }
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

export async function receiveSerializedTx(
  pool: Pool,
  input: ReceiveSerializedInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const r = await receiveSerializedInConn(conn, input)
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
    const [[prFrom]] = await conn.query<RowDataPacket[]>(
      'SELECT tracking_mode AS trackingMode FROM products WHERE id = ?',
      [fromPos.productId],
    )
    if (prFrom && String(prFrom.trackingMode) === 'serialized') {
      await conn.rollback()
      return { ok: false, error: 'Serialized products are moved as individual assets, not bulk transfer.' }
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
      `${MOV_COLS} VALUES (?,?,NOW(6),?,?,?,?,?,?,?,?,?,?,?)`,
      [
        outId,
        productId,
        -q,
        'transfer_out',
        note,
        null,
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
      `${MOV_COLS} VALUES (?,?,DATE_ADD(NOW(6), INTERVAL 1 MICROSECOND),?,?,?,?,?,?,?,?,?,?,?)`,
      [inId, productId, q, 'transfer_in', note, null, null, destPositionId, null, null, correlationId, fromLabel, toLabel],
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
