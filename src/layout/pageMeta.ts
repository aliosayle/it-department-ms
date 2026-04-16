import { matchPath } from 'react-router-dom'

export type PageMeta = { title: string; subtitle?: string }

const staticTitles: Record<string, PageMeta> = {
  '/': { title: 'Dashboard', subtitle: 'Operations snapshot' },
  '/service-desk': { title: 'Service desk', subtitle: 'Request and incident queue' },
  '/assets': { title: 'Asset register', subtitle: 'Configuration items' },
  '/stock': { title: 'Stock', subtitle: 'Totals by product across all storages' },
  '/stock/receive': { title: 'Receive stock', subtitle: 'Inbound to storage' },
  '/stock/transfer': { title: 'Transfer stock', subtitle: 'Between storage units' },
  '/stock/storage-units': { title: 'Storage units', subtitle: 'Bins, shelves, custody' },
  '/admin/users': { title: 'Users', subtitle: 'Access profiles by application area' },
  '/delivery': { title: 'Deliveries', subtitle: 'Outbound movements' },
  '/delivery/new': { title: 'New delivery', subtitle: 'Create a delivery record' },
  '/purchases': { title: 'Purchases', subtitle: 'Bons and inbound orders' },
  '/purchases/new': { title: 'New purchase', subtitle: 'Bon, supplier, lines' },
  '/master-data/suppliers': { title: 'Suppliers', subtitle: 'Vendor master data' },
  '/master-data/suppliers/new': { title: 'New supplier', subtitle: 'Vendor record' },
  '/products': { title: 'Products', subtitle: 'Catalog' },
  '/master-data/companies': { title: 'Companies', subtitle: 'Master data' },
  '/master-data/companies/new': { title: 'New company', subtitle: 'Master data' },
  '/master-data/sites': { title: 'Sites', subtitle: 'Master data' },
  '/master-data/sites/new': { title: 'New site', subtitle: 'Master data' },
  '/master-data/personnel': { title: 'Personnel', subtitle: 'Master data' },
  '/master-data/personnel/new': { title: 'New personnel', subtitle: 'Master data' },
  '/inventory/equipment': { title: 'User equipment', subtitle: 'Assigned devices' },
  '/inventory/network': { title: 'Network devices', subtitle: 'Infrastructure inventory' },
}

/** More specific paths first. */
const patternTitles: { pattern: string; meta: PageMeta }[] = [
  {
    pattern: '/products/:productId/reports',
    meta: { title: 'Product reports', subtitle: 'Summary metrics' },
  },
  {
    pattern: '/products/:productId/history',
    meta: { title: 'Product history', subtitle: 'Movement statement' },
  },
  {
    pattern: '/products/:productId/stock',
    meta: { title: 'Product stock', subtitle: 'Positions' },
  },
  {
    pattern: '/products/:productId/storage',
    meta: { title: 'Product storage', subtitle: 'Storage units' },
  },
  {
    pattern: '/products/:productId/purchases',
    meta: { title: 'Product purchases', subtitle: 'Bons including this SKU' },
  },
  {
    pattern: '/inventory/equipment/:id',
    meta: { title: 'Equipment detail', subtitle: 'Identity card' },
  },
  {
    pattern: '/products/:productId',
    meta: { title: 'Product', subtitle: 'Reports and inventory' },
  },
  {
    pattern: '/stock/storage-units/:storageUnitId',
    meta: { title: 'Storage unit', subtitle: 'Stock in this unit' },
  },
  {
    pattern: '/admin/users/:userId',
    meta: { title: 'User permissions', subtitle: 'Page-level access' },
  },
  {
    pattern: '/purchases/:purchaseId',
    meta: { title: 'Purchase detail', subtitle: 'Bon, supplier, receive into stock' },
  },
]

const notFoundMeta: PageMeta = {
  title: 'Not found',
  subtitle: 'The requested page is unavailable',
}

export function getPageMeta(pathname: string): PageMeta {
  const exact = staticTitles[pathname]
  if (exact) return exact
  for (const r of patternTitles) {
    if (matchPath({ path: r.pattern, end: true }, pathname)) return r.meta
  }
  return notFoundMeta
}
