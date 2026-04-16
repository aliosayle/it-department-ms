export const ALL_PAGE_KEYS = [
  'dashboard',
  'serviceDesk',
  'assets',
  'stock',
  'stockReceive',
  'stockTransfer',
  'storageUnits',
  'products',
  'assignment',
  'companies',
  'sites',
  'personnel',
  'equipment',
  'network',
  'users',
  'suppliers',
  'purchases',
] as const

export type PageKey = (typeof ALL_PAGE_KEYS)[number]

export type PageCrud = { view: boolean; edit: boolean; delete: boolean; create: boolean }

export function denyAll(): Record<PageKey, PageCrud> {
  const d = { view: false, edit: false, delete: false, create: false }
  return Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, { ...d }])) as Record<PageKey, PageCrud>
}

export function fullCrud(): PageCrud {
  return { view: true, edit: true, delete: true, create: true }
}

export function fullPermissions(): Record<PageKey, PageCrud> {
  return Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, fullCrud()])) as Record<PageKey, PageCrud>
}

export function mergePartial(partial?: Partial<Record<PageKey, PageCrud>>): Record<PageKey, PageCrud> {
  const base = denyAll()
  if (!partial) return base
  for (const k of ALL_PAGE_KEYS) {
    const p = partial[k]
    if (p) base[k] = { ...base[k], ...p }
  }
  return base
}

/** Map legacy `delivery` → `assignment`; drop unknown keys; OR-merge duplicate page rows. */
export function permissionRowsToPartial(
  rows: ReadonlyArray<{
    pageKey: string
    view: boolean
    edit: boolean
    delete: boolean
    create: boolean
  }>,
): Partial<Record<PageKey, PageCrud>> {
  const partial: Partial<Record<PageKey, PageCrud>> = {}
  for (const r of rows) {
    let pk = String(r.pageKey ?? '').trim()
    if (pk === 'delivery') pk = 'assignment'
    if (!(ALL_PAGE_KEYS as readonly string[]).includes(pk)) continue
    const key = pk as PageKey
    const cur: PageCrud = { view: r.view, edit: r.edit, delete: r.delete, create: r.create }
    const prev = partial[key]
    partial[key] = prev
      ? {
          view: prev.view || cur.view,
          edit: prev.edit || cur.edit,
          delete: prev.delete || cur.delete,
          create: prev.create || cur.create,
        }
      : cur
  }
  return partial
}
