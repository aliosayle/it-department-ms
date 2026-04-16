import type { Pool, RowDataPacket } from 'mysql2/promise'
import { ALL_PAGE_KEYS, type PageCrud, type PageKey, denyAll, fullPermissions, mergePartial, permissionRowsToPartial } from './pageKeys.js'

type PermRow = { pageKey: string; view: boolean; edit: boolean; delete: boolean; create: boolean }

function mergeOr(base: Record<PageKey, PageCrud>, partial: Partial<Record<PageKey, PageCrud>>) {
  for (const key of ALL_PAGE_KEYS) {
    const p = partial[key]
    if (!p) continue
    base[key] = {
      view: base[key].view || p.view,
      edit: base[key].edit || p.edit,
      delete: base[key].delete || p.delete,
      create: base[key].create || p.create,
    }
  }
}

export async function getEffectiveUserPermissions(pool: Pool, userId: string): Promise<Record<PageKey, PageCrud>> {
  const [legacyRows] = await pool.query<RowDataPacket[]>(
    'SELECT page_key AS pageKey, can_view AS view, can_edit AS edit, can_delete AS `delete`, can_create AS `create` FROM user_page_permissions WHERE user_id = ?',
    [userId],
  )
  const [roleRows] = await pool.query<RowDataPacket[]>(
    `SELECT rp.page_key AS pageKey, rp.can_view AS view, rp.can_edit AS edit, rp.can_delete AS \`delete\`, rp.can_create AS \`create\`
     FROM user_roles ur
     JOIN role_page_permissions rp ON rp.role_id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId],
  )
  const [overrideRows] = await pool.query<RowDataPacket[]>(
    'SELECT page_key AS pageKey, can_view AS view, can_edit AS edit, can_delete AS `delete`, can_create AS `create` FROM user_page_permission_overrides WHERE user_id = ?',
    [userId],
  )

  const legacy = permissionRowsToPartial(legacyRows as unknown as PermRow[])
  const role = permissionRowsToPartial(roleRows as unknown as PermRow[])
  const overrides = permissionRowsToPartial(overrideRows as unknown as PermRow[])

  const hasAny = legacyRows.length + roleRows.length + overrideRows.length > 0
  if (!hasAny) return fullPermissions()

  const out = denyAll()
  mergeOr(out, role)
  mergeOr(out, legacy)
  for (const key of ALL_PAGE_KEYS) {
    if (overrides[key]) out[key] = { ...overrides[key]! }
  }
  return mergePartial(out)
}
