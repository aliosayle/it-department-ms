import bcrypt from 'bcrypt'
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

export async function insertProduct(
  pool: Pool,
  row: { sku: string; name: string; brand: string; category: string; description: string },
): Promise<Record<string, unknown>> {
  const sku = row.sku.trim()
  const name = row.name.trim()
  if (!sku) throw Object.assign(new Error('SKU is required.'), { statusCode: 400 })
  if (!name) throw Object.assign(new Error('Name is required.'), { statusCode: 400 })
  const [[dup]] = await pool.query<RowDataPacket[]>('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)', [sku])
  if (dup) throw Object.assign(new Error('A product with this SKU already exists.'), { statusCode: 409 })
  const id = nextId('pr')
  await pool.query(
    'INSERT INTO products (id, sku, name, brand, category, description) VALUES (?,?,?,?,?,?)',
    [id, sku, name, (row.brand || '').trim(), (row.category || '').trim(), (row.description || '').trim()],
  )
  return {
    id,
    sku,
    name,
    brand: (row.brand || '').trim(),
    category: (row.category || '').trim(),
    description: (row.description || '').trim(),
  }
}

export async function insertStorageUnit(
  pool: Pool,
  row: { siteId: string; code: string; label: string; kind: string; personnelId: string | null | undefined },
): Promise<Record<string, unknown>> {
  const siteId = row.siteId.trim()
  const code = row.code.trim()
  const label = row.label.trim()
  const rawKind = (row.kind || 'shelf').trim().toLowerCase()
  const kind = rawKind === 'custody' ? 'custody' : rawKind || 'shelf'
  if (!siteId) throw Object.assign(new Error('Site is required.'), { statusCode: 400 })
  if (!code) throw Object.assign(new Error('Code is required.'), { statusCode: 400 })
  if (!label) throw Object.assign(new Error('Label is required.'), { statusCode: 400 })

  const [[site]] = await pool.query<RowDataPacket[]>('SELECT id FROM sites WHERE id = ?', [siteId])
  if (!site) throw Object.assign(new Error('Site not found.'), { statusCode: 400 })

  let personnelId: string | null =
    row.personnelId != null && String(row.personnelId).trim() !== '' ? String(row.personnelId).trim() : null
  if (kind === 'custody') {
    if (!personnelId) {
      throw Object.assign(new Error('Custody storage requires a personnel holder.'), { statusCode: 400 })
    }
    const [[per]] = await pool.query<RowDataPacket[]>(
      'SELECT id, site_id AS siteId FROM personnel WHERE id = ?',
      [personnelId],
    )
    if (!per) throw Object.assign(new Error('Personnel not found.'), { statusCode: 400 })
    if (String(per.siteId) !== siteId) {
      throw Object.assign(new Error('Personnel must belong to the selected site.'), { statusCode: 400 })
    }
  } else {
    personnelId = null
  }

  const id = nextId('su')
  try {
    await pool.query(
      'INSERT INTO storage_units (id, site_id, code, label, kind, personnel_id) VALUES (?,?,?,?,?,?)',
      [id, siteId, code, label, kind, personnelId],
    )
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number }
    if (err?.code === 'ER_DUP_ENTRY') {
      throw Object.assign(new Error('This site already has a storage unit with that code.'), { statusCode: 409 })
    }
    throw e
  }
  return { id, siteId, code, label, kind, personnelId }
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

/** Create a portal login with a password hash and **deny-all** page permissions (safe default). */
export async function insertPortalUser(
  pool: Pool,
  row: { login: string; displayName: string; password: string },
): Promise<{ id: string; login: string; displayName: string }> {
  const login = row.login.trim()
  const displayName = row.displayName.trim()
  const password = row.password
  if (login.length < 2) throw Object.assign(new Error('Login must be at least 2 characters.'), { statusCode: 400 })
  if (displayName.length < 1) throw Object.assign(new Error('Display name is required.'), { statusCode: 400 })
  if (password.length < 10) {
    throw Object.assign(new Error('Password must be at least 10 characters.'), { statusCode: 400 })
  }

  const [[dup]] = await pool.query<RowDataPacket[]>('SELECT id FROM portal_users WHERE login = ?', [login])
  if (dup) throw Object.assign(new Error('That login is already in use.'), { statusCode: 409 })

  const id = nextId('u')
  const passwordHash = await bcrypt.hash(password, 12)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      'INSERT INTO portal_users (id, display_name, login, password_hash, subject, personnel_id) VALUES (?,?,?,?,NULL,NULL)',
      [id, displayName, login, passwordHash],
    )
    await conn.query('DELETE FROM user_page_permissions WHERE user_id = ?', [id])
    const defaults = denyAll()
    for (const key of ALL_PAGE_KEYS) {
      const crud = defaults[key]
      await conn.query(
        'INSERT INTO user_page_permissions (user_id, page_key, can_view, can_edit, can_delete, can_create) VALUES (?,?,?,?,?,?)',
        [id, key, crud.view ? 1 : 0, crud.edit ? 1 : 0, crud.delete ? 1 : 0, crud.create ? 1 : 0],
      )
    }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }

  return { id, login, displayName }
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
