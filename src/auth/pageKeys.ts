import type { PageCrud, PageKey } from '@/mocks/domain/types'

export const ALL_PAGE_KEYS: PageKey[] = [
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
]

export function fullCrud(): PageCrud {
  return { view: true, edit: true, delete: true, create: true }
}

/** Full access to every page (used when seed user has no permissions block). */
export function fullPermissionsMap(): Record<PageKey, PageCrud> {
  return Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, fullCrud()])) as Record<PageKey, PageCrud>
}

export function denyAllPermissions(): Record<PageKey, PageCrud> {
  const d = { view: false, edit: false, delete: false, create: false }
  return Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, { ...d }])) as Record<PageKey, PageCrud>
}

/** Overlay explicit page permissions onto a default-deny matrix. */
export function mergeFromPartial(
  partial: Partial<Record<PageKey, PageCrud>> | undefined,
): Record<PageKey, PageCrud> {
  const base = denyAllPermissions()
  if (!partial) return base
  for (const k of ALL_PAGE_KEYS) {
    const p = partial[k]
    if (p) base[k] = { ...base[k], ...p }
  }
  return base
}
