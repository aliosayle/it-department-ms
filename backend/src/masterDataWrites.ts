import type { Pool, RowDataPacket } from 'mysql2/promise'
import { nextId } from './id.js'
import type { PageCrud, PageKey } from './pageKeys.js'
import { ALL_PAGE_KEYS, denyAll } from './pageKeys.js'

export async function insertCompany(pool: Pool, name: string, notes: string): Promise<Record<string, unknown>> {
  const id = nextId('co')
  await pool.query('INSERT INTO companies (id, name, notes) VALUES (?,?,?)', [id, name.trim(), (notes || '').trim()])
  return { id, name: name.trim(), notes: (notes || '').trim() }
}

export async function insertSite(
  pool: Pool,
  companyId: string,
  name: string,
  location: string,
): Promise<Record<string, unknown>> {
  const [[co]] = await pool.query<RowDataPacket[]>('SELECT id FROM companies WHERE id = ?', [companyId])
  if (!co) throw Object.assign(new Error('Company not found.'), { statusCode: 400 })
  const id = nextId('site')
  await pool.query('INSERT INTO sites (id, company_id, name, location) VALUES (?,?,?,?)', [
    id,
    companyId,
    name.trim(),
    (location || '').trim(),
  ])
  return { id, companyId, name: name.trim(), location: (location || '').trim() }
}

export async function insertPersonnel(
  pool: Pool,
  fullName: string,
  email: string,
  companyId: string,
  siteId: string,
): Promise<Record<string, unknown>> {
  const [[perSite]] = await pool.query<RowDataPacket[]>(
    'SELECT s.id, s.company_id AS companyId FROM sites s WHERE s.id = ?',
    [siteId],
  )
  if (!perSite || String(perSite.companyId) !== companyId) {
    throw Object.assign(new Error('Site does not belong to the company.'), { statusCode: 400 })
  }
  const id = nextId('per')
  await pool.query(
    'INSERT INTO personnel (id, full_name, email, company_id, site_id) VALUES (?,?,?,?,?)',
    [id, fullName.trim(), email.trim(), companyId, siteId],
  )
  return { id, fullName: fullName.trim(), email: email.trim(), companyId, siteId }
}

export async function insertSupplier(
  pool: Pool,
  row: {
    name: string
    contactName: string
    email: string
    phone: string
    address: string
    notes: string
  },
): Promise<Record<string, unknown>> {
  const id = nextId('sup')
  await pool.query(
    'INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes) VALUES (?,?,?,?,?,?,?)',
    [
      id,
      row.name.trim(),
      (row.contactName || '').trim(),
      (row.email || '').trim(),
      (row.phone || '').trim(),
      (row.address || '').trim(),
      (row.notes || '').trim(),
    ],
  )
  return {
    id,
    name: row.name.trim(),
    contactName: (row.contactName || '').trim(),
    email: (row.email || '').trim(),
    phone: (row.phone || '').trim(),
    address: (row.address || '').trim(),
    notes: (row.notes || '').trim(),
  }
}

export async function replaceUserPermissions(
  pool: Pool,
  userId: string,
  permissions: Partial<Record<PageKey, PageCrud>> & Record<string, PageCrud | undefined>,
): Promise<void> {
  const [[u]] = await pool.query<RowDataPacket[]>('SELECT id FROM portal_users WHERE id = ?', [userId])
  if (!u) throw Object.assign(new Error('User not found.'), { statusCode: 404 })

  const defaults = denyAll()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM user_page_permissions WHERE user_id = ?', [userId])
    for (const key of ALL_PAGE_KEYS) {
      const crud = permissions[key] ?? defaults[key]
      await conn.query(
        'INSERT INTO user_page_permissions (user_id, page_key, can_view, can_edit, can_delete, can_create) VALUES (?,?,?,?,?,?)',
        [userId, key, crud.view ? 1 : 0, crud.edit ? 1 : 0, crud.delete ? 1 : 0, crud.create ? 1 : 0],
      )
    }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
