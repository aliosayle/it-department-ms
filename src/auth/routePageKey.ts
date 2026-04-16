import { matchPath } from 'react-router-dom'
import type { PageKey } from '@/mocks/domain/types'

/** First match wins — list most specific patterns first. */
const rules: { pattern: string; page: PageKey }[] = [
  { pattern: '/admin/users/new', page: 'users' },
  { pattern: '/admin/users/:userId', page: 'users' },
  { pattern: '/admin/users', page: 'users' },
  { pattern: '/stock/storage-units/new', page: 'storageUnits' },
  { pattern: '/stock/storage-units/:storageUnitId', page: 'storageUnits' },
  { pattern: '/stock/storage-units', page: 'storageUnits' },
  { pattern: '/stock/transfer', page: 'stockTransfer' },
  { pattern: '/stock/receive', page: 'stockReceive' },
  { pattern: '/stock', page: 'stock' },
  { pattern: '/delivery/new', page: 'delivery' },
  { pattern: '/delivery', page: 'delivery' },
  { pattern: '/purchases/new', page: 'purchases' },
  { pattern: '/purchases/:purchaseId', page: 'purchases' },
  { pattern: '/purchases', page: 'purchases' },
  { pattern: '/master-data/suppliers/new', page: 'suppliers' },
  { pattern: '/master-data/suppliers', page: 'suppliers' },
  { pattern: '/products/new', page: 'products' },
  { pattern: '/products/:productId/reports', page: 'products' },
  { pattern: '/products/:productId/history', page: 'products' },
  { pattern: '/products/:productId/stock', page: 'products' },
  { pattern: '/products/:productId/storage', page: 'products' },
  { pattern: '/products/:productId', page: 'products' },
  { pattern: '/products', page: 'products' },
  { pattern: '/master-data/companies/new', page: 'companies' },
  { pattern: '/master-data/companies', page: 'companies' },
  { pattern: '/master-data/sites/new', page: 'sites' },
  { pattern: '/master-data/sites', page: 'sites' },
  { pattern: '/master-data/personnel/new', page: 'personnel' },
  { pattern: '/master-data/personnel', page: 'personnel' },
  { pattern: '/inventory/equipment/:id', page: 'equipment' },
  { pattern: '/inventory/equipment', page: 'equipment' },
  { pattern: '/inventory/network', page: 'network' },
  { pattern: '/service-desk', page: 'serviceDesk' },
  { pattern: '/assets', page: 'assets' },
  { pattern: '/', page: 'dashboard' },
]

export function pageKeyFromPath(pathname: string): PageKey | null {
  for (const r of rules) {
    if (matchPath({ path: r.pattern, end: true }, pathname)) return r.page
  }
  return null
}
